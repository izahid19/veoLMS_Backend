import bcrypt from 'bcryptjs';
import { AppError } from '../utils/error';
import { OtpService } from './otp.service';
import { UserRepository } from '../repositories/user.repository';
import { SignupPayload } from '../types/auth.types';

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private otpService: OtpService
  ) {}

  async signupService(payload: SignupPayload) {
    const { firstName, lastName, username, emailId, password } = payload;

    const existingEmail = await this.userRepository.findByEmail(emailId);
    if (existingEmail) {
      throw new AppError('Email is already registered', 409, 'EMAIL_ALREADY_EXISTS');
    }

    const existingUsername = await this.userRepository.findByUsername(username);
    if (existingUsername) {
      throw new AppError('Username is already taken', 409, 'USERNAME_ALREADY_EXISTS');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await this.userRepository.create({
      firstName,
      lastName,
      username,
      emailId,
      password: hashedPassword,
    });

    await this.otpService.sendOTP(user.emailId);

    return {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      emailId: user.emailId,
      isUserVerify: user.isUserVerify,
    };
  }

  async checkUsernameService(username: string): Promise<boolean> {
    const existingUsername = await this.userRepository.findByUsername(username);
    return !existingUsername;
  }

  async loginService(identifier: string, password: string) {
    const user = await this.userRepository.findByIdentifier(identifier);

    if (!user) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isUserVerify) {
      throw new AppError('Please verify your email first', 403, 'USER_NOT_VERIFIED');
    }

    return {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      emailId: user.emailId,
      isUserVerify: user.isUserVerify,
    };
  }

  async forgotPasswordService(emailId: string): Promise<void> {
    const user = await this.userRepository.findByEmail(emailId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    await this.otpService.sendForgotPasswordOTP(user.emailId);
  }

  async updateMeService(userId: string, data: Partial<SignupPayload>) {
    const { firstName, lastName, username } = data;
    
    if (username) {
      const existingUsername = await this.userRepository.findByUsername(username);
      if (existingUsername && existingUsername._id.toString() !== userId) {
        throw new AppError('Username is already taken', 409, 'USERNAME_ALREADY_EXISTS');
      }
    }

    const user = await this.userRepository.update(userId, { firstName, lastName, username });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return user;
  }
}
