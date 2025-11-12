const twilio = require('twilio');

class TwilioService {
  constructor() {
    // Safely get credentials from environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not found in environment variables');
    }

    this.client = twilio(accountSid, authToken);
    this.verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
    
    if (!this.verifyServiceSid) {
      throw new Error('Twilio Verify Service SID not found in environment variables');
    }
    
    console.log('✅ Twilio service initialized successfully');
  }

  /**
   * Send OTP via SMS using Twilio Verify
   * @param {string} phone - Phone number in E.164 format
   * @returns {Promise<Object>} Twilio response
   */
  async sendOtp(phone) {
    try {
      console.log(`📱 Sending OTP to: ${phone}`);
      
      const verification = await this.client.verify.v2
        .services(this.verifyServiceSid)
        .verifications
        .create({ 
          to: phone, 
          channel: 'sms' 
        });
      
      console.log(`✅ OTP sent successfully. SID: ${verification.sid}, Status: ${verification.status}`);
      
      return {
        success: true,
        sid: verification.sid,
        status: verification.status
      };
    } catch (error) {
      console.error('❌ Twilio OTP send error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify OTP code
   * @param {string} phone - Phone number in E.164 format
   * @param {string} code - OTP code
   * @returns {Promise<Object>} Verification result
   */
  async verifyOtp(phone, code) {
    try {
      console.log(`🔍 Verifying OTP for: ${phone}, Code: ${code}`);
      
      const verificationCheck = await this.client.verify.v2
        .services(this.verifyServiceSid)
        .verificationChecks
        .create({ 
          to: phone, 
          code: code 
        });

      console.log(`📊 Verification status: ${verificationCheck.status}`);

      return {
        success: verificationCheck.status === 'approved',
        status: verificationCheck.status,
        message: verificationCheck.status === 'approved' ? 'OTP verified successfully' : 'Invalid OTP'
      };
    } catch (error) {
      console.error('❌ Twilio OTP verify error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new TwilioService();