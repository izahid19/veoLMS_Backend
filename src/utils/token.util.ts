import jwt from 'jsonwebtoken';
import { config } from '../config/config';

export const generateAccessToken = (userId: string, role: string) => {
  return jwt.sign({ userId, role }, config.JWT_ACCESS_SECRET, {
    expiresIn: '15m',
  });
};

export const generateRefreshToken = (userId: string) => {
  return jwt.sign({ userId }, config.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
};
