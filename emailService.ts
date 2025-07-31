// Production Email Service using EmailJS
import emailjs from '@emailjs/browser';

// EmailJS Configuration - Replace with your actual values
const EMAILJS_CONFIG = {
  serviceID: 'service_qairoz', // Replace with your EmailJS service ID
  templateID: 'template_otp', // Replace with your EmailJS template ID
  publicKey: 'YOUR_EMAILJS_PUBLIC_KEY' // Replace with your EmailJS public key
};

interface EmailConfig {
  to: string;
  subject: string;
  html: string;
  type?: string;
}

class EmailService {
  private isEmailJSConfigured(): boolean {
    return EMAILJS_CONFIG.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY' && 
           EMAILJS_CONFIG.serviceID !== 'service_qairoz' &&
           EMAILJS_CONFIG.templateID !== 'template_otp';
  }

  private async sendViaEmailJS(to: string, subject: string, message: string, otp?: string): Promise<boolean> {
    try {
      if (!this.isEmailJSConfigured()) {
        console.error('❌ EmailJS not configured. Please set up EmailJS credentials.');
        return false;
      }

      const templateParams = {
        to_email: to,
        subject: subject,
        message: message,
        otp_code: otp || '',
        from_name: 'Qairoz Platform'
      };

      const response = await emailjs.send(
        EMAILJS_CONFIG.serviceID,
        EMAILJS_CONFIG.templateID,
        templateParams,
        EMAILJS_CONFIG.publicKey
      );

      if (response.status === 200) {
        console.log('✅ Email sent successfully via EmailJS');
        return true;
      } else {
        console.error('❌ EmailJS failed:', response);
        return false;
      }
    } catch (error) {
      console.error('❌ EmailJS error:', error);
      return false;
    }
  }

  private async sendViaBackend(config: EmailConfig): Promise<boolean> {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://qairoz-backend-production.railway.app/api';
      
      const response = await fetch(`${API_BASE_URL}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Email sent successfully via backend');
        return true;
      } else {
        console.error('❌ Backend email error:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Backend email error:', error);
      return false;
    }
  }

  async sendOTP(email: string, otp: string): Promise<boolean> {
    console.log('📧 Attempting to send OTP email to:', email);
    
    const message = `Your Qairoz verification code is: ${otp}. This code will expire in 5 minutes.`;
    
    // Try EmailJS first (recommended for production)
    if (this.isEmailJSConfigured()) {
      console.log('🔄 Trying EmailJS...');
      const emailJSSuccess = await this.sendViaEmailJS(email, 'Qairoz - Email Verification OTP', message, otp);
      if (emailJSSuccess) {
        return true;
      }
    }

    // Fallback to backend
    console.log('🔄 Trying backend email service...');
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin-bottom: 10px;">Qairoz</h1>
          <p style="color: #6b7280; margin: 0;">Inter-College Championships</p>
        </div>
        
        <div style="background: #f9fafb; border-radius: 12px; padding: 30px; text-align: center;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Email Verification</h2>
          <p style="color: #4b5563; margin-bottom: 30px; font-size: 16px;">
            Please use the following OTP to verify your email address:
          </p>
          
          <div style="background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <div style="font-size: 32px; font-weight: bold; color: #1f2937; letter-spacing: 4px;">
              ${otp}
            </div>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            This OTP will expire in 5 minutes. If you didn't request this, please ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © 2025 Qairoz - Inter-College Championships. All rights reserved.
          </p>
        </div>
      </div>
    `;

    const backendSuccess = await this.sendViaBackend({
      to: email,
      subject: 'Qairoz - Email Verification OTP',
      html: emailContent,
      type: 'otp'
    });

    if (backendSuccess) {
      return true;
    }

    // If both fail, return false
    console.error('❌ All email methods failed');
    return false;
  }

  async sendWelcome(email: string, collegeName: string): Promise<boolean> {
    const message = `Welcome to Qairoz! ${collegeName} has been successfully registered. You can now login to your dashboard and start adding students.`;
    
    if (this.isEmailJSConfigured()) {
      return await this.sendViaEmailJS(email, 'Welcome to Qairoz - Registration Successful!', message);
    }

    // Fallback to backend
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; m