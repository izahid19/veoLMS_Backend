import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  applicableCourses: Types.ObjectId[];
  maxUses: number | null;
  usedCount: number;
  usedBy: Types.ObjectId[];
  expiresAt: Date | null;
  isActive: boolean;
  minOrderAmount: number;
  createdBy: Types.ObjectId;
}

const CouponSchema: Schema<ICoupon> = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 1,
    },
    applicableCourses: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        default: [],
      },
    ],
    maxUses: {
      type: Number,
      default: null,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    usedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: [],
      },
    ],
    expiresAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

CouponSchema.index({ isActive: 1 });
CouponSchema.index({ expiresAt: 1 });

CouponSchema.pre('save', async function () {
  if (this.isModified('code') && this.code) {
    this.code = this.code.toUpperCase();
  }
});

export default mongoose.model<ICoupon>('Coupon', CouponSchema);
