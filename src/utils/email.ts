import axios from 'axios';
import { config } from '../config/config';

export const sendOTPEmail = async (
  email: string,
  firstName: string,
  otp: string,
): Promise<void> => {
  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: {
        email: config.FROM_EMAIL,
        name: config.FROM_NAME,
      },
      to: [{ email, name: firstName }],
      subject: 'Your OTP Verification Code',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; background: #f9f9f9; border-radius: 10px;">
          <h2 style="color: #333;">Hello, ${firstName} 👋</h2>
          <p style="color: #555; font-size: 15px;">Use the OTP below to verify your account. It is valid for <strong>10 minutes</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; font-size: 42px; font-weight: bold; letter-spacing: 12px; color: #1a1a1a; background: #fff; padding: 16px 32px; border-radius: 8px; border: 2px solid #e0e0e0;">
              ${otp}
            </span>
          </div>
          <p style="color: #999; font-size: 13px;">Do not share this code with anyone. If you did not request this, please ignore this email.</p>
        </div>
      `,
    },
    {
      headers: {
        'api-key': config.BREVO_API_KEY,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    },
  );
};
