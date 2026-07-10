import Coupon, { ICoupon } from '../models/coupon.model';
import { Types } from 'mongoose';

export class CouponRepository {
  async create(data: Partial<ICoupon>): Promise<ICoupon> {
    const coupon = new Coupon(data);
    return coupon.save();
  }

  async findByCode(code: string): Promise<ICoupon | null> {
    return Coupon.findOne({ code: { $regex: new RegExp(`^${code}$`, 'i') } }).exec();
  }

  async findAll(): Promise<ICoupon[]> {
    return Coupon.find().populate('applicableCourses', 'title slug').exec();
  }

  async findById(id: string): Promise<ICoupon | null> {
    return Coupon.findById(id).exec();
  }

  async update(id: string, data: Partial<ICoupon>): Promise<ICoupon | null> {
    return Coupon.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<ICoupon | null> {
    return Coupon.findByIdAndDelete(id).exec();
  }

  async incrementUsage(id: string, userId: string): Promise<ICoupon | null> {
    return Coupon.findByIdAndUpdate(
      id,
      {
        $inc: { usedCount: 1 },
        $push: { usedBy: new Types.ObjectId(userId) },
      },
      { new: true }
    ).exec();
  }
}
