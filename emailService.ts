import React, { useState, useEffect } from 'react';
import { Mail, Clock, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { otpService } from '../services/otpService';

interface EmailOTPVerificationProps {
  email: string;
  onVerified: () => void;
  onCancel: () => void;
}

const EmailOTPVerification: React.FC<EmailOTPVerificationProps> = ({
  email,
  onVerified,
  onCancel
}) => {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [displayOtp, setDisplayOtp] = useState('');

  useEffect(() => {
    console.log('🚀 EmailOTPVerification mounted for:', email);
    
    // Check if OTP already exists
    if (otpService.hasActiveOTP(email)) {
      console.log('📧 Using existing OTP for:', email);
      setMessage('OTP already sent! Enter the code from your email or the browser alert.');
      setMessageType('success');
      setTimeRemaining(otpService.getOTPTimeRemaining(email));
      setOtpSent(true);
    } else {
      // Send new OTP
      sendOTP();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = otpService.getOTPTimeRemaining(email);
      setTimeRemaining(remaining);
      
      if (remaining === 0 && timeRemaining > 0) {
        // Check if this is a simulated OTP that should have longer life
        const storedTimestamp = sessionStorage.getItem(`otp_timestamp_${email}`);
        if (storedTimestamp) {
          const age = Date.now() - parseInt(storedTimestamp);
          if (age < 10 * 60 * 1000) { // 10 minutes for simulated OTPs
            return; // Don't expire yet
          }
        }
        
        if (otpSent) {
          setMessage('OTP expired. Click "Resend OTP" to get a new one.');
          setMessageType('error');
          setOtpSent(false);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [email, timeRemaining]);

  const sendOTP = async () => {
    console.log('📧 Sending OTP to:', email);
    setIsSending(true);
    setMessage('Generating fresh OTP...');
    setMessageType('info');
    setOtp('');
    setOtpSent(false);
    setDisplayOtp(''); // Clear any previous display OTP
    
    try {
      const result = await otpService.sendEmailOTP(email);
      
      if (result.success) {
        setMessage('OTP generated! Check your email or use the code shown below.');
        setMessageType('success');
        setTimeRemaining(600); // 10 minutes
        setOtpSent(true);
        
        // Check for simulated OTP after a short delay
        setTimeout(() => {
          const storedOtp = sessionStorage.getItem(`current_otp_${email}`);
          if (storedOtp) {
            setDisplayOtp(storedOtp);
            setMessage('🧪 Testing Mode: Email server is down. Use the code shown below to verify your email.');
            setMessageType('success');
          }
        }, 2000);
      } else {
        setMessage(result.message);
        setMessageType('error');
        setOtpSent(false);
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      setMessage('Email server temporarily unavailable. Check for browser alert with test code.');
      setMessageType('error');
      setOtpSent(false);
    } finally {
      setIsSending(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setMessage('Please enter a valid 6-digit OTP');
      setMessageType('error');
      return;
    }

    setIsVerifying(true);
    setMessage('Verifying OTP...');
    setMessageType('info');

    try {
      const result = otpService.verifyEmailOTP(email, otp);
      
      if (result.success) {
        setMessage(result.message);
        setMessageType('success');
        setIsVerified(true);
        
        setTimeout(() => {
          onVerified();
        }, 1500);
      } else {
        setMessage(result.message);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setMessage('Verification failed. Please try again.');
      setMessageType('error');
    } finally {
      setIsVerifying(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    if (messageType === 'error' && message.includes('Invalid OTP')) {
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && otp.length === 6) {
      verifyOTP();
    }
  };

  if (isVerified) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-green-600 mb-2">Email Verified!</h3>
        <p className="text-gray-600">Your email has been successfully verified.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Verify Your Email</h3>
        <p className="text-gray-600">
          We've sent a 6-digit verification code to
        </p>
        <p className="font-semibold text-gray-900">{email}</p>
      </div>

      <div className="space-y-4">
        {/* OTP Input - Always visible once OTP is sent */}
        {otpSent && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter OTP Code
            </label>
            <input
              type="text"
              value={otp}
              onChange={handleOTPChange}
              onKeyPress={handleKeyPress}
              placeholder="000000"
              className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent tracking-widest"
              maxLength={6}
              disabled={isVerifying}
              autoFocus
            />
          </div>
        )}


        {message && (
          <div className={`flex items-center space-x-2 p-3 rounded-lg ${
            messageType === 'success' ? 'bg-green-50 text-green-700' :
            messageType === 'error' ? 'bg-red-50 text-red-700' :
            'bg-blue-50 text-blue-700'
          }`}>
            {messageType === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : messageType === 'error' ? (
              <AlertCircle className="h-5 w-5" />
            ) : (
              <Mail className="h-5 w-5" />
            )}
            <span className="text-sm">{message}</span>
          </div>
        )}

        {/* Instructions */}
        {otpSent && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <div className="text-blue-600 text-lg">📧</div>
              <div className="text-blue-800 text-sm">
                {displayOtp ? (
                  <div>
                    <p className="font-semibold mb-2">🧪 Testing Mode - Your OTP Code:</p>
                    <div className="bg-white border-2 border-blue-300 rounded-lg p-3 text-center">
                      <div className="text-2xl font-mono font-bold text-blue-900 tracking-wider">
                        {displayOtp}
                      </div>
                    </div>
                    <p className="text-xs mt-2 text-blue-600">
                      Copy this code and enter it in the field above
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold mb-1">Where to find your OTP:</p>
                    <ul className="space-y-1">
                      <li>• Check your email inbox and spam folder</li>
                      <li>• The code is 6 digits long</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {timeRemaining > 0 && (
          <div className="flex items-center justify-center space-x-2 text-gray-600">
            <Clock className="h-4 w-4" />
            <span className="text-sm">OTP expires in {formatTime(timeRemaining)}</span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        
        {timeRemaining === 0 ? (
          <button
            onClick={sendOTP}
            disabled={isSending}
            className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>Resend OTP</span>
              </>
            )}
          </button>
        ) : otpSent ? (
          <button
            onClick={verifyOTP}
            disabled={isVerifying || otp.length !== 6}
            className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isVerifying ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <span>Verify Email</span>
            )}
          </button>
        ) : (
          <button
            disabled
            className="flex-1 bg-gray-400 text-white px-4 py-3 rounded-lg cursor-not-allowed"
          >
            Sending OTP...
          </button>
        )}
      </div>
    </div>
  );
};

export default EmailOTPVerification;
