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

export const sendEnrollmentConfirmationEmail = async (
  email: string,
  firstName: string,
  courseName: string,
  courseSlug: string,
): Promise<void> => {
  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: {
        email: config.FROM_EMAIL,
        name: config.FROM_NAME,
      },
      to: [{ email, name: firstName }],
      subject: `You're enrolled in ${courseName}!`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 540px; margin: auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
          <h2 style="color: #1a1a1a;">🎉 Enrollment Confirmed!</h2>
          <p style="color: #555; font-size: 15px;">Hi <strong>${firstName}</strong>, you have successfully enrolled in:</p>
          <div style="text-align: center; margin: 28px 0;">
            <span style="display: inline-block; font-size: 20px; font-weight: bold; color: #333; background: #fff; padding: 14px 28px; border-radius: 8px; border: 2px solid #e0e0e0;">
              ${courseName}
            </span>
          </div>
          <p style="color: #555; font-size: 15px;">You can start learning right away. Head over to your dashboard to access the course.</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${process.env.FRONTEND_URL ?? ''}/courses/${courseSlug}"
               style="display: inline-block; background: #4f46e5; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">
              Go to Course
            </a>
          </div>
          <p style="color: #999; font-size: 13px;">Happy learning! — The VeoLMS Team</p>
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
