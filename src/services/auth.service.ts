import bcrypt from 'bcryptjs';
import { AppError } from '../utils/error';
import { generateAccessToken } from '../utils/token.util';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/config';
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
      role: user.role,
      avatar: user.avatar,
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
      role: user.role,
      avatar: user.avatar,
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

    const updates: any = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (username !== undefined) updates.username = username;

    const user = await this.userRepository.update(userId, updates);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return user;
  }

  async changePasswordService(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findByIdWithPassword(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400, 'INCORRECT_PASSWORD');
    }

    if (currentPassword === newPassword) {
      throw new AppError('New password must be different', 400, 'SAME_PASSWORD');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await this.userRepository.update(userId, { 
      password: hashedPassword, 
      refreshToken: null as any 
    });

    return true;
  }

  async resetPasswordService(emailId: string, otp: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findByEmail(emailId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    await this.otpService.verifyForgotPasswordOTP(emailId, otp);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await this.userRepository.update(user._id.toString(), {
      password: hashedPassword,
      refreshToken: null as any
    });
  }

  async refreshTokenService(token: string) {
    if (!token) {
      throw new AppError('No refresh token provided', 401, 'NO_REFRESH_TOKEN');
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, config.JWT_REFRESH_SECRET);
    } catch (err) {
      throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    const user = await this.userRepository.findByIdWithRefreshToken(decoded.userId);
    if (!user) {
      throw new AppError('User not found', 401, 'USER_NOT_FOUND');
    }

    if (!user.refreshToken) {
      throw new AppError('Refresh token mismatch - possible token theft', 401, 'TOKEN_MISMATCH');
    }

    const isMatch = await bcrypt.compare(token, user.refreshToken);
    if (!isMatch) {
      throw new AppError('Refresh token mismatch - possible token theft', 401, 'TOKEN_MISMATCH');
    }

    const accessToken = generateAccessToken(user._id.toString(), user.role);

    return { accessToken };
  }

  async uploadAvatar(req: any) {
    if (!req.file) {
      throw new AppError('No file uploaded', 400, 'NO_FILE_UPLOADED');
    }

    const userId = req.userId;
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const newAvatarUrl = req.file.path;

    if (user.avatar) {
      try {
        const parts = user.avatar.split('/');
        const filename = parts.pop();
        const folder = parts.pop();
        
        if (filename && folder) {
          const publicId = `${folder}/${filename.split('.')[0]}`;
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (err) {
        console.error('Failed to delete old avatar from Cloudinary', err);
      }
    }

    const updatedUser = await this.userRepository.update(userId, { avatar: newAvatarUrl });
    return updatedUser;
  }
}
