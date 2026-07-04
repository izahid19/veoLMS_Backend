import crypto from 'crypto';
import { config } from '../config/config';

/** Generate a secure 6-digit OTP */
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/** HMAC-SHA256 sign an OTP — stored in Redis instead of plain text */
export const hashOTP = (otp: string): string => {
  return crypto.createHmac('sha256', config.OTP_HMAC_SECRET).update(otp).digest('hex');
};

/** Timing-safe comparison of submitted OTP against stored HMAC */
export const verifyOTPHash = (otp: string, storedHash: string): boolean => {
  const computedHash = hashOTP(otp);
  try {
    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
};
