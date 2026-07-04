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

  async findByIdentifier(identifier: string): Promise<IUser | null> {
    return User.findOne({
      $or: [{ emailId: identifier }, { username: identifier }],
    });
  }

  async update(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true }).select('-password');
  }
}
