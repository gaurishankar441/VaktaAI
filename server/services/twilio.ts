import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

if (!accountSid || !authToken || !verifySid) {
  throw new Error('Missing Twilio credentials: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_VERIFY_SID');
}

const client = twilio(accountSid, authToken);

export interface SendOTPResult {
  requestId: string;
  expiresInSeconds: number;
}

export interface VerifyOTPResult {
  success: boolean;
  phoneE164?: string;
}

class TwilioService {
  async sendOTP(phoneE164: string): Promise<SendOTPResult> {
    try {
      const verification = await client.verify.v2
        .services(verifySid)
        .verifications.create({
          to: phoneE164,
          channel: 'sms',
        });

      const ttl = process.env.OTP_CODE_TTL_SECONDS || '180';
      return {
        requestId: verification.sid,
        expiresInSeconds: parseInt(ttl),
      };
    } catch (error: any) {
      console.error('[Twilio] Failed to send OTP:', error.message);
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  }

  async verifyOTP(phoneE164: string, code: string): Promise<VerifyOTPResult> {
    try {
      const verificationCheck = await client.verify.v2
        .services(verifySid)
        .verificationChecks.create({
          to: phoneE164,
          code: code,
        });

      if (verificationCheck.status === 'approved') {
        return {
          success: true,
          phoneE164: phoneE164,
        };
      }

      return {
        success: false,
      };
    } catch (error: any) {
      console.error('[Twilio] Failed to verify OTP:', error.message);
      return {
        success: false,
      };
    }
  }

  normalizePhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return `+${cleaned}`;
    }
    
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    
    if (phone.startsWith('+')) {
      return phone;
    }
    
    throw new Error('Invalid phone number format. Please provide a valid Indian mobile number.');
  }

  validateE164(phoneE164: string): boolean {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneE164);
  }
}

export const twilioService = new TwilioService();
