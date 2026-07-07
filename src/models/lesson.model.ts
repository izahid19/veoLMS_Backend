import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILesson extends Document {
  title: string;
  section: Types.ObjectId;
  course: Types.ObjectId;
  videoUrl: string;
  videoPublicId: string;
  duration: number;
  order: number;
  isFree: boolean;
  content: string;
  resources: { title: string; url: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const LessonSchema: Schema<ILesson> = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    section: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section is required'],
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    videoUrl: {
      type: String,
      default: '',
    },
    videoPublicId: {
      type: String,
      default: '',
    },
    duration: {
      type: Number,
      default: 0,
    },
    order: {
      type: Number,
      required: [true, 'Order is required'],
      default: 0,
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    content: {
      type: String,
      default: '',
    },
    resources: [
      {
        title: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
  },
);

LessonSchema.index({ course: 1, order: 1 });
LessonSchema.index({ section: 1, order: 1 });

const Lesson = mongoose.model<ILesson>('Lesson', LessonSchema);

export default Lesson;
