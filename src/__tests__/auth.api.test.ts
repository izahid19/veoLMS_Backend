import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import './setup'; // Load global mocks first
import request from 'supertest';
import app from '../index';
import User from '../models/user.model';
import redis from '../config/redis';
import { sendOTPEmail } from '../utils/email';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

describe('Auth API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/signup', () => {
    const validSignupData = {
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe123',
      emailId: 'john@example.com',
      password: 'StrongPassword123!',
    };

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app).post('/api/auth/signup').send({ emailId: 'test@example.com' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('MISSING_FIELDS');
    });

    it('should return 400 if password is weak', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          ...validSignupData,
          password: 'weak',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('WEAK_PASSWORD');
    });

    it('should return 409 if email already exists', async () => {
      // Mock findOne to return a user
      (User.findOne as any).mockResolvedValueOnce({ emailId: validSignupData.emailId });

      const res = await request(app).post('/api/auth/signup').send(validSignupData);
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should successfully create user, generate OTP, and return 201', async () => {
      (User.findOne as any)
        .mockResolvedValueOnce(null) // email check in signupService
        .mockResolvedValueOnce(null) // username check in signupService
        .mockResolvedValueOnce({
          firstName: validSignupData.firstName,
          emailId: validSignupData.emailId,
          isUserVerify: false,
        }); // user check in sendOTP

      (User.create as any).mockResolvedValue({
        _id: 'mockId123',
        ...validSignupData,
        isUserVerify: false,
        createdAt: new Date(),
      });

      const res = await request(app).post('/api/auth/signup').send(validSignupData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.emailId).toBe(validSignupData.emailId);

      // Verify mocks were called
      expect(User.create).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalledTimes(2); // One for OTP, one for attempts
      expect(sendOTPEmail).toHaveBeenCalledWith(
        validSignupData.emailId,
        validSignupData.firstName,
        expect.any(String),
      );
    });
  });

  describe('GET /api/auth/check-username', () => {
    it('should return 400 if username query is missing', async () => {
      const res = await request(app).get('/api/auth/check-username');
      expect(res.status).toBe(400);
    });

    it('should return available: true if username does not exist', async () => {
      (User.findOne as any).mockResolvedValue(null);
      const res = await request(app).get('/api/auth/check-username?username=newuser');
      expect(res.status).toBe(200);
      expect(res.body.available).toBe(true);
    });

    it('should return available: false if username exists', async () => {
      (User.findOne as any).mockResolvedValue({ username: 'existinguser' });
      const res = await request(app).get('/api/auth/check-username?username=existinguser');
      expect(res.status).toBe(200);
      expect(res.body.available).toBe(false);
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should return 404 if user not found', async () => {
      (User.findOne as any).mockResolvedValue(null);
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ emailId: 'test@example.com', otp: '123456' });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('USER_NOT_FOUND');
    });

    it('should return 400 if OTP is expired/missing in redis', async () => {
      (User.findOne as any).mockResolvedValue({ emailId: 'test@example.com', isUserVerify: false });
      (redis.get as any).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ emailId: 'test@example.com', otp: '123456' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('OTP_EXPIRED');
    });
  });

  describe('POST /api/auth/resend-otp', () => {
    it('should return 429 if on cooldown', async () => {
      (redis.get as any).mockImplementation((key: string) => {
        if (key.includes('resend_cooldown')) return '1';
        return null;
      });
      (redis.ttl as any).mockResolvedValue(100);

      const res = await request(app)
        .post('/api/auth/resend-otp')
        .send({ emailId: 'test@example.com' });
      expect(res.status).toBe(429);
      expect(res.body.error).toBe('OTP_ON_COOLDOWN');
    });

    it('should resend OTP if cooldown is expired', async () => {
      (redis.get as any).mockReturnValue(null); // No cooldown, 0 attempts
      (User.findOne as any).mockResolvedValue({
        emailId: 'test@example.com',
        firstName: 'John',
        isUserVerify: false,
      });

      const res = await request(app)
        .post('/api/auth/resend-otp')
        .send({ emailId: 'test@example.com' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(sendOTPEmail).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalled(); // sets new otp and cooldown
    });
  });
  describe('POST /api/auth/login', () => {
    it('should return 401 for invalid credentials', async () => {
      (User.findOne as any).mockResolvedValue(null);
      const res = await request(app).post('/api/auth/login').send({ identifier: 'wrong', password: 'wrong' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('INVALID_CREDENTIALS');
    });

    it('should return 403 if user is not verified', async () => {
      (User.findOne as any).mockResolvedValue({ password: 'hashedpassword', isUserVerify: false });
      (bcrypt.compare as any).mockResolvedValue(true);
      const res = await request(app).post('/api/auth/login').send({ identifier: 'test', password: 'test' });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('USER_NOT_VERIFIED');
    });

    it('should login successfully and set cookies', async () => {
      (User.findOne as any).mockResolvedValue({
        _id: 'mockId123',
        firstName: 'John',
        password: 'hashedpassword',
        isUserVerify: true
      });
      (bcrypt.compare as any).mockResolvedValue(true);
      jest.spyOn(jwt, 'sign').mockReturnValue('mockToken' as any);

      const res = await request(app).post('/api/auth/login').send({ identifier: 'test', password: 'test' });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      const cookies = res.header['set-cookie'];
      expect(cookies).toBeDefined();
      expect((cookies as any).some((c: string) => c.includes('accessToken='))).toBe(true);
      expect((cookies as any).some((c: string) => c.includes('refreshToken='))).toBe(true);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 if no token provided', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return user profile if token is valid', async () => {
      jest.spyOn(jwt, 'verify').mockReturnValue({ userId: 'mockId123' } as any);
      (User.findById as any).mockReturnValue({
        select: jest.fn<any>().mockResolvedValue({ _id: 'mockId123', firstName: 'John', emailId: 'john@example.com' } as any)
      });

      const res = await request(app).get('/api/auth/me').set('Cookie', ['accessToken=mockToken']);
      
      expect(res.status).toBe(200);
      expect(res.body.data.firstName).toBe('John');
    });
  });

  describe('PUT /api/auth/me', () => {
    it('should update user profile successfully', async () => {
      jest.spyOn(jwt, 'verify').mockReturnValue({ userId: 'mockId123' } as any);
      (User.findOne as any).mockResolvedValue(null); // username not taken
      (User.findByIdAndUpdate as any).mockReturnValue({
        select: jest.fn<any>().mockResolvedValue({ _id: 'mockId123', firstName: 'Updated', username: 'newuser' } as any)
      });

      const res = await request(app)
        .put('/api/auth/me')
        .set('Cookie', ['accessToken=mockToken'])
        .send({ firstName: 'Updated', username: 'newuser' });

      expect(res.status).toBe(200);
      expect(res.body.data.firstName).toBe('Updated');
    });

    it('should return 409 if new username is already taken', async () => {
      jest.spyOn(jwt, 'verify').mockReturnValue({ userId: 'mockId123' } as any);
      (User.findOne as any).mockResolvedValue({ _id: 'otherId', username: 'taken' });

      const res = await request(app)
        .put('/api/auth/me')
        .set('Cookie', ['accessToken=mockToken'])
        .send({ username: 'taken' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('USERNAME_ALREADY_EXISTS');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear cookies and return 200', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      
      const cookies = res.header['set-cookie'];
      expect(cookies).toBeDefined();
      expect((cookies as any).some((c: string) => c.includes('accessToken=;'))).toBe(true);
    });
  });
});
