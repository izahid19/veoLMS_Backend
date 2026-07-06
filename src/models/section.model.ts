import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISection extends Document {
  title: string;
  course: Types.ObjectId;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema: Schema<ISection> = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Section title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    order: {
      type: Number,
      required: [true, 'Order is required'],
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

SectionSchema.index({ course: 1, order: 1 });

const Section = mongoose.model<ISection>('Section', SectionSchema);

export default Section;
