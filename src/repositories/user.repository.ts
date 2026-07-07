import User, { IUser } from '../models/user.model';
import { SignupPayload } from '../types/auth.types';

export class UserRepository {
  async create(userData: SignupPayload): Promise<IUser> {
    return User.create(userData);
  }

  async findByEmail(emailId: string): Promise<IUser | null> {
    return User.findOne({ emailId });
  }

  async findByUsername(username: string): Promise<IUser | null> {
    return User.findOne({ username });
  }

  async findById(id: string): Promise<IUser | null> {
    return User.findById(id);
  }

  async findByIdWithRefreshToken(id: string): Promise<IUser | null> {
    return User.findById(id).select('+refreshToken');
  }

  async findByIdWithPassword(id: string): Promise<IUser | null> {
    return User.findById(id).select('+password');
  }

  async findByIdentifier(identifier: string): Promise<IUser | null> {
    return User.findOne({
      $or: [{ emailId: identifier }, { username: identifier }],
    }).select('+password');
  }

  async update(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, { $set: updates }, { returnDocument: 'after', runValidators: true }).select('-password');
  }
}
