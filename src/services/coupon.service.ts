import { CouponRepository } from '../repositories/coupon.repository';
import { CourseRepository } from '../repositories/course.repository';
import { calculatePrice } from '../utils/price.util';
import { AppError } from '../utils/error';
import { ICourse } from '../models/course.model';
import { ICoupon } from '../models/coupon.model';

export class CouponService {
  constructor(
    private couponRepository: CouponRepository,
    private courseRepository: CourseRepository
  ) {}

  async validateCoupon(code: string, courseId: string, userId: string, courseData?: ICourse) {
    const coupon = await this.couponRepository.findByCode(code);

    if (!coupon) {
      throw new AppError('Invalid coupon code', 400, 'INVALID_COUPON');
    }

    if (!coupon.isActive) {
      throw new AppError('This coupon is no longer active', 400, 'INACTIVE_COUPON');
    }

    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
      throw new AppError('Coupon has expired', 400, 'EXPIRED_COUPON');
    }

    if (coupon.maxUses !== null && coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses) {
      throw new AppError('Coupon usage limit reached', 400, 'LIMIT_REACHED');
    }

    if (coupon.usedBy.some((id) => id.toString() === userId.toString())) {
      throw new AppError('You have already used this coupon', 400, 'ALREADY_USED');
    }

    if (
      coupon.applicableCourses &&
      coupon.applicableCourses.length > 0 &&
      !coupon.applicableCourses.some((id) => id.toString() === courseId.toString())
    ) {
      throw new AppError('This coupon is not valid for this course', 400, 'INVALID_COURSE');
    }

    let course = courseData;
    if (!course) {
      course = (await this.courseRepository.findById(courseId)) as ICourse;
      if (!course) {
        throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
      }
    }

    const priceBreakdown = calculatePrice(
      {
        price: course.price,
        discountPercent: course.discountPercent || 0,
        discountExpiresAt: course.discountExpiresAt,
        taxPercent: course.taxPercent || 18,
      },
      {
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      }
    );

    if (coupon.minOrderAmount > 0 && priceBreakdown.discountedPrice < coupon.minOrderAmount) {
      throw new AppError(`Minimum order amount is ₹${coupon.minOrderAmount / 100}`, 400, 'MIN_ORDER_NOT_MET');
    }

    return { valid: true, coupon, priceBreakdown };
  }

  async createCoupon(data: Partial<ICoupon>, adminId: string) {
    if (data.code) {
      data.code = data.code.toUpperCase();
      const existingCoupon = await this.couponRepository.findByCode(data.code);
      if (existingCoupon) {
        throw new AppError('Coupon code already exists', 400, 'COUPON_EXISTS');
      }
    }

    const couponData = {
      ...data,
      createdBy: adminId as any,
    };

    return this.couponRepository.create(couponData);
  }

  async getAllCoupons() {
    return this.couponRepository.findAll();
  }

  async updateCoupon(id: string, data: Partial<ICoupon>) {
    if (data.code) {
      data.code = data.code.toUpperCase();
    }
    const updated = await this.couponRepository.update(id, data);
    if (!updated) {
      throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
    }
    return updated;
  }

  async deleteCoupon(id: string) {
    const deleted = await this.couponRepository.delete(id);
    if (!deleted) {
      throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
    }
    return deleted;
  }

  async toggleCoupon(id: string) {
    const coupon = await this.couponRepository.findById(id);
    if (!coupon) {
      throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
    }
    return this.couponRepository.update(id, { isActive: !coupon.isActive });
  }

  async applyCouponUsage(couponCode: string, userId: string) {
    const coupon = await this.couponRepository.findByCode(couponCode);
    if (coupon) {
      await this.couponRepository.incrementUsage(coupon._id.toString(), userId);
    }
  }
}
