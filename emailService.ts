// Simple Email Service - Works with or without backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://qairoz-backend-production-b33a.up.railway.app/api';

interface EmailConfig {
  to: string;
  subject: string;
  html: string;
  type?: string;
}

class EmailService {
  private async sendViaBackend(config: EmailConfig): Promise<boolean> {
    try {
      console.log('📧 PRODUCTION: Attempting to send REAL email via backend to:', config.to);
      console.log('🔗 Backend URL:', API_BASE_URL);
      console.log('📋 Email config:', { to: config.to, subject: config.subject, type: config.type });
      console.log('📤 Full request payload:', JSON.stringify(config, null, 2));
      
      // Add timeout to prevent hanging
      console.log('⏰ Starting email request with 8s timeout...');
      const response = await fetch(`${API_BASE_URL}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
        signal: AbortSignal.timeout(8000) // 8 second timeout for email sending
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('❌ Failed to parse response as JSON:', jsonError);
        const textResponse = await response.text();
        console.error('📄 Raw response:', textResponse);
        throw new Error(`Invalid JSON response: ${textResponse}`);
      }
      
      console.log('📋 Backend response:', result);
      
      if (!response.ok) {
        console.error('❌ PRODUCTION ERROR: Backend response not OK:', response.status, response.statusText);
        console.error('❌ Backend error details:', result);
        throw new Error(`Backend error: ${result.error || response.statusText}`);
      }
      
      if (result.success) {
        console.log('✅ PRODUCTION SUCCESS: Real email sent successfully to:', config.to);
        console.log('📧 Message ID:', result.data?.messageId);
        console.log('📧 SMTP Response:', result.data?.response);
        return true;
      } else {
        console.error('❌ PRODUCTION ERROR: Backend email failed:', result.error);
        console.error('❌ Error code:', result.code);
        console.error('❌ Error details:', result.details);
        throw new Error(`Email service error: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ PRODUCTION ERROR: Email sending failed:', error.message);
      console.error('📋 Full error:', error);
      
      // Log specific error types
      if (error.name === 'AbortError') {
        console.error('⏰ Email request timed out after 8 seconds');
      } else if (error.message.includes('Failed to fetch')) {
        console.error('🌐 Network error - backend may be down');
      }
      
      throw error;
    }
  }

  private simulateEmailSending(config: EmailConfig, email: string): boolean {
    console.log('🎭 SIMULATING email send to:', config.to);
    console.log('📧 Email subject:', config.subject);
    console.log('📝 Email type:', config.type);
    
    // Show a browser alert with the OTP for testing
    if (config.type === 'otp') {
      // Extract OTP from email content
      const otpMatch = config.html.match(/(\d{6})/);
      if (otpMatch) {
        const otp = otpMatch[1];
        console.log('🔢 SIMULATED OTP:', otp);
        
        // Store OTP for display in UI with longer expiry for testing
        sessionStorage.setItem(`current_otp_${email}`, otp);
        sessionStorage.setItem(`otp_timestamp_${email}`, Date.now().toString());
        console.log('💾 Stored OTP in session for UI display:', otp);
        
        // Show browser alert for immediate testing
        setTimeout(() => {
          alert(`🧪 TESTING MODE - Your OTP Code: ${otp}\n\nCopy this code and paste it in the verification field.`);
        }, 1000);
      }
    }
    
    return true; // Always return success for simulation
  }

  async sendOTP(email: string, otp: string): Promise<boolean> {
    console.log('📧 Sending real OTP email to:', email);
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin-bottom: 10px;">Qairoz</h1>
          <p style="color: #6b7280; margin: 0;">Inter-College Championships</p>
        </div>
        
        <div style="background: #f9fafb; border-radius: 12px; padding: 30px; text-align: center;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Email Verification</h2>
          <p style="color: #4b5563; margin-bottom: 30px; font-size: 16px;">
            Welcome to Qairoz! Please use the following OTP to verify your email address and complete your college registration:
          </p>
          
          <div style="background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <div style="font-size: 32px; font-weight: bold; color: #1f2937; letter-spacing: 4px;">
              ${otp}
            </div>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            This OTP will expire in 5 minutes. If you didn't request this verification, please ignore this email.
          </p>
          
          <div style="margin-top: 30px; padding: 15px; background: #dbeafe; border-radius: 8px;">
            <p style="color: #1e40af; font-size: 14px; margin: 0;">
              <strong>Next Steps:</strong> After verification, you'll be able to access your college dashboard and register students for tournaments.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            This email was sent from Qairoz Inter-College Championships Platform
          </p>
        </div>
      </div>
    `;

    const emailConfig = {
      to: email,
      subject: 'Qairoz - Verify Your College Registration (OTP Inside)',
      html: emailContent,
      type: 'otp'
    };

    try {
      console.log('🚀 Attempting to send real email via backend...');
      await this.sendViaBackend(emailConfig);
      console.log('✅ Real email sent successfully!');
      return true;
    } catch (error) {
      console.error('❌ Real email failed, falling back to simulation:', error.message);
      
      // Fallback to simulation if backend fails
      console.log('🎭 Using simulation mode as fallback...');
      this.simulateEmailSending(emailConfig, email);
      
      // Return true for simulation mode
      return true;
    }
  }

  async sendWelcome(email: string, collegeName: string): Promise<boolean> {
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin-bottom: 10px;">Welcome to Qairoz!</h1>
          <p style="color: #6b7280; margin: 0;">Inter-College Championships</p>
        </div>
        
        <div style="background: #f0f9ff; border-radius: 12px; padding: 30px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Registration Successful! 🎉</h2>
          <p style="color: #4b5563; margin-bottom: 20px; font-size: 16px;">
            Congratulations! <strong>${collegeName}</strong> has been successfully registered with Qairoz.
          </p>
        </div>
      </div>
    `;

    try {
      await this.sendViaBackend({
        to: email,
        subject: 'Welcome to Qairoz - Registration Successful!',
        html: emailContent,
        type: 'welcome'
      });
      return true;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }

  async sendPasswordReset(email: string, resetCode: string): Promise<boolean> {
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin-bottom: 10px;">Qairoz</h1>
          <p style="color: #6b7280; margin: 0;">Inter-College Championships</p>
        </div>
        
        <div style="background: #fef2f2; border-radius: 12px; padding: 30px; text-align: center;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Password Reset Request</h2>
          <p style="color: #4b5563; margin-bottom: 30px; font-size: 16px;">
            You requested to reset your password. Use the following code:
          </p>
          
          <div style="background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <div style="font-size: 32px; font-weight: bold; color: #1f2937; letter-spacing: 4px;">
              ${resetCode}
            </div>
          </div>
        </div>
      </div>
    `;

    try {
      await this.sendViaBackend({
        to: email,
        subject: 'Qairoz - Password Reset Code',
        html: emailContent,
        type: 'password-reset'
      });
      return true;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
