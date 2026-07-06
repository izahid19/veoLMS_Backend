import redis from '../config/redis';
import { generateOTP, hashOTP, verifyOTPHash } from '../utils/otp';
import { sendOTPEmail } from '../utils/email';
import { config } from '../config/config';
import { AppError } from '../utils/error';
import { UserRepository } from '../repositories/user.repository';

export class OtpService {
  constructor(private userRepository: UserRepository) {}

  async sendOTP(emailId: string): Promise<void> {
    const user = await this.userRepository.findByEmail(emailId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (user.isUserVerify) {
      throw new AppError('User is already verified', 400, 'USER_ALREADY_VERIFIED');
    }

    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    const redisKey = `otp:${emailId}`;
    await redis.set(redisKey, hashedOtp, { ex: config.OTP_TTL });
    await redis.set(`otp_attempts:${emailId}`, 0, { ex: config.OTP_TTL });

    await sendOTPEmail(user.emailId, user.firstName, otp);
  }

  async verifyOTP(emailId: string, otp: string): Promise<void> {
    const user = await this.userRepository.findByEmail(emailId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (user.isUserVerify) {
      throw new AppError('User is already verified', 400, 'USER_ALREADY_VERIFIED');
    }

    const redisKey = `otp:${emailId}`;
    const attemptsKey = `otp_attempts:${emailId}`;

    const storedHashedOtp = await redis.get(redisKey);
    if (!storedHashedOtp) {
      throw new AppError('OTP expired or not found', 400, 'OTP_EXPIRED');
    }

    const attemptsStr = await redis.get(attemptsKey);
    let attempts = attemptsStr ? parseInt(String(attemptsStr), 10) : 0;

    if (attempts >= config.OTP_MAX_VERIFY_ATTEMPTS) {
      throw new AppError(
        'Maximum OTP verification attempts reached. Please request a new OTP.',
        429,
        'MAX_OTP_ATTEMPTS_REACHED',
      );
    }

    const isValid = verifyOTPHash(otp, storedHashedOtp as string);

    if (!isValid) {
      attempts += 1;
      await redis.set(attemptsKey, attempts, { keepTtl: true });
      throw new AppError('Invalid OTP', 400, 'INVALID_OTP');
    }

    user.isUserVerify = true;
    await user.save();

    await redis.del(redisKey);
    await redis.del(attemptsKey);
    await redis.del(`resend_cooldown:${emailId}`);
  }

  async resendOTP(emailId: string): Promise<void> {
    const cooldownKey = `resend_cooldown:${emailId}`;
    const onCooldown = await redis.get(cooldownKey);

    if (onCooldown) {
      const ttl = await redis.ttl(cooldownKey);
      throw new AppError(
        `Please wait ${ttl} seconds before requesting a new OTP`,
        429,
        'OTP_ON_COOLDOWN',
      );
    }

    await this.sendOTP(emailId);

    await redis.set(cooldownKey, '1', { ex: config.OTP_RESEND_COOLDOWN });
  }

  async sendForgotPasswordOTP(emailId: string): Promise<void> {
    const user = await this.userRepository.findByEmail(emailId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    const redisKey = `forgot_pwd_otp:${emailId}`;
    await redis.set(redisKey, hashedOtp, { ex: config.OTP_TTL });
    await redis.set(`forgot_pwd_otp_attempts:${emailId}`, 0, { ex: config.OTP_TTL });

    await sendOTPEmail(user.emailId, user.firstName, otp);
  }

  async resendForgotPasswordOTP(emailId: string): Promise<void> {
    const cooldownKey = `forgot_pwd_cooldown:${emailId}`;
    const onCooldown = await redis.get(cooldownKey);

    if (onCooldown) {
      const ttl = await redis.ttl(cooldownKey);
      throw new AppError(
        `Please wait ${ttl} seconds before requesting a new OTP`,
        429,
        'OTP_ON_COOLDOWN',
      );
    }

    await this.sendForgotPasswordOTP(emailId);

    await redis.set(cooldownKey, '1', { ex: config.OTP_RESEND_COOLDOWN });
  }

  async verifyForgotPasswordOTP(emailId: string, otp: string): Promise<void> {
    const user = await this.userRepository.findByEmail(emailId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const redisKey = `forgot_pwd_otp:${emailId}`;
    const attemptsKey = `forgot_pwd_otp_attempts:${emailId}`;

    const storedHashedOtp = await redis.get(redisKey);
    if (!storedHashedOtp) {
      throw new AppError('OTP expired or not found', 400, 'OTP_EXPIRED');
    }

    const attemptsStr = await redis.get(attemptsKey);
    let attempts = attemptsStr ? parseInt(String(attemptsStr), 10) : 0;

    if (attempts >= config.OTP_MAX_VERIFY_ATTEMPTS) {
      throw new AppError(
        'Maximum OTP verification attempts reached. Please request a new OTP.',
        429,
        'MAX_OTP_ATTEMPTS_REACHED',
      );
    }

    const isValid = verifyOTPHash(otp, storedHashedOtp as string);

    if (!isValid) {
      attempts += 1;
      await redis.set(attemptsKey, attempts, { keepTtl: true });
      throw new AppError('Invalid OTP', 400, 'INVALID_OTP');
    }

    await redis.del(redisKey);
    await redis.del(attemptsKey);
    await redis.del(`forgot_pwd_cooldown:${emailId}`);
  }
}
