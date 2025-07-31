import { emailService } from './emailService';

interface OTPData {
  code: string;
  email: string;
  expiresAt: number;
  attempts: number;
}

class OTPService {
  private otps: Map<string, OTPData> = new Map();
  private readonly OTP_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ATTEMPTS = 3;

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private cleanupExpiredOTPs(): void {
    const now = Date.now();
    for (const [key, otp] of this.otps.entries()) {
      if (now > otp.expiresAt) {
        this.otps.delete(key);
        console.log(`🧹 Cleaned up expired OTP for ${key}`);
      }
    }
  }

  clearOTP(email: string): void {
    if (this.otps.has(email)) {
      this.otps.delete(email);
      console.log(`🗑️ Cleared OTP for ${email}`);
    }
  }

  async sendEmailOTP(email: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Starting fresh OTP generation for:', email);
      
      // Always clean up and start fresh
      this.cleanupExpiredOTPs();
      this.clearOTP(email);
      
      const otp = this.generateOTP();
      const expiresAt = Date.now() + this.OTP_EXPIRY_TIME;
      
      // Store OTP
      this.otps.set(email, {
        code: otp,
        email,
        expiresAt,
        attempts: 0
      });

      console.log('📧 Generated fresh OTP:', otp);
      console.log('⏰ Expires at:', new Date(expiresAt).toLocaleTimeString());
      
      // Send email - this will work with or without backend
      const emailSent = await emailService.sendOTP(email, otp);
      
      if (!emailSent) {
        console.log('⚠️ Email service failed, but continuing with OTP verification');
        // Don't delete OTP even if email fails - user can still verify
      }
      
      return {
        success: true,
        message: 'OTP generated successfully'
      };
    } catch (error) {
      console.error('Error in OTP service:', error);
      this.clearOTP(email);
      return {
        success: false,
        message: 'Failed to generate OTP. Please try again.'
      };
    }
  }

  verifyEmailOTP(email: string, inputOTP: string): { success: boolean; message: string } {
    console.log(`🔍 Verifying OTP for ${email}, input: ${inputOTP}`);
    this.cleanupExpiredOTPs();
    
    const otpData = this.otps.get(email);
    
    if (!otpData) {
      console.log(`❌ No OTP data found for ${email}`);
      return {
        success: false,
        message: 'OTP not found or expired. Please request a new one.'
      };
    }

    const now = Date.now();
    console.log(`⏰ Time remaining: ${Math.ceil((otpData.expiresAt - now) / 1000)} seconds`);

    if (now > otpData.expiresAt) {
      console.log(`❌ OTP expired for ${email}`);
      this.otps.delete(email);
      return {
        success: false,
        message: 'OTP has expired. Please request a new one.'
      };
    }

    if (otpData.attempts >= this.MAX_ATTEMPTS) {
      console.log(`❌ Too many attempts for ${email}`);
      this.otps.delete(email);
      return {
        success: false,
        message: 'Too many attempts. Please request a new OTP.'
      };
    }

    // Increment attempts
    otpData.attempts++;
    console.log(`🔢 Attempt ${otpData.attempts}/${this.MAX_ATTEMPTS} for ${email}`);

    if (otpData.code === inputOTP) {
      console.log(`✅ OTP verified successfully for ${email}`);
      this.otps.delete(email);
      return {
        success: true,
        message: 'Email verified successfully!'
      };
    } else {
      const remainingAttempts = this.MAX_ATTEMPTS - otpData.attempts;
      console.log(`❌ Invalid OTP. Expected: ${otpData.code}, Got: ${inputOTP}`);
      return {
        success: false,
        message: `Invalid OTP. ${remainingAttempts} attempts remaining.`
      };
    }
  }

  getOTPTimeRemaining(email: string): number {
    this.cleanupExpiredOTPs();
    const otpData = this.otps.get(email);
    if (!otpData) return 0;
    
    const remaining = Math.max(0, otpData.expiresAt - Date.now());
    return Math.ceil(remaining / 1000);
  }

  hasActiveOTP(email: string): boolean {
    this.cleanupExpiredOTPs();
    return this.otps.has(email);
  }
}

export const otpService = new OTPService();