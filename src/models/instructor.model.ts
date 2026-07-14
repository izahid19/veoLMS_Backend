import mongoose, { Document, Schema } from 'mongoose';

export interface ISocialLinks {
  website?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  youtube?: string;
}

export interface IInstructor extends Document {
  firstName: string;
  lastName: string;
  emailId: string;
  avatar: string;
  socialLinks?: ISocialLinks;
  createdAt: Date;
  updatedAt: Date;
}

const InstructorSchema: Schema<IInstructor> = new Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
      default: '',
    },
    emailId: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    socialLinks: {
      website: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      github: { type: String, default: '' },
      twitter: { type: String, default: '' },
      youtube: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

const Instructor = mongoose.model<IInstructor>('Instructor', InstructorSchema);
export default Instructor;
