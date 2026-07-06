import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProgress extends Document {
  student: Types.ObjectId;
  course: Types.ObjectId;
  lesson: Types.ObjectId;
  watchedSeconds: number;
  completed: boolean;
  lastWatchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProgressSchema: Schema<IProgress> = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    lesson: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      required: [true, 'Lesson is required'],
    },
    watchedSeconds: {
      type: Number,
      default: 0,
      min: [0, 'Watched seconds cannot be negative'],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    lastWatchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

ProgressSchema.index({ student: 1, lesson: 1 }, { unique: true });
ProgressSchema.index({ student: 1, course: 1 });

const Progress = mongoose.model<IProgress>('Progress', ProgressSchema);

export default Progress;
