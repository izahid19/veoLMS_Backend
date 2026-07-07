import Razorpay from 'razorpay';
import crypto from 'crypto';
import { AppError } from '../utils/error';
import { CourseRepository } from '../repositories/course.repository';
import { EnrollmentRepository } from '../repositories/enrollment.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { UserRepository } from '../repositories/user.repository';
import { sendEnrollmentEmail } from './email.service';

// ─── Razorpay Client (lazy — env vars are not available at import time) ────────

let _razorpay: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_TEST_API_KEY!,
      key_secret: process.env.RAZORPAY_TEST_API_SECRET!,
    });
  }
  return _razorpay;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ICreateOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  courseName: string;
  courseId: string;
  keyId: string;
}

export interface IVerifyPaymentData {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  courseId: string;
}

// ─── Service ───────────────────────────────────────────────────────────────────

export class PaymentService {
  constructor(
    private paymentRepository: PaymentRepository,
    private enrollmentRepository: EnrollmentRepository,
    private courseRepository: CourseRepository,
    private userRepository: UserRepository,
  ) {}

  // ── Create Razorpay Order ──────────────────────────────────────────────────

  async createOrder(studentId: string, courseId: string): Promise<ICreateOrderResult> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
    }

    const alreadyEnrolled = await this.enrollmentRepository.findByStudentAndCourse(
      studentId,
      courseId,
    );
    if (alreadyEnrolled) {
      throw new AppError('Already enrolled in this course', 400, 'ALREADY_ENROLLED');
    }

    const razorpayOrder = await getRazorpay().orders.create({
      amount: course.price,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    });

    await this.paymentRepository.create({
      student: studentId as any,
      course: courseId as any,
      razorpayOrderId: razorpayOrder.id,
      amount: course.price,
      status: 'pending',
    });

    return {
      orderId: razorpayOrder.id,
      amount: course.price,
      currency: 'INR',
      courseName: course.title,
      courseId,
      keyId: process.env.RAZORPAY_TEST_API_KEY!,
    };
  }

  // ── Verify Payment & Enroll ────────────────────────────────────────────────

  async verifyPayment(
    studentId: string,
    verifyData: IVerifyPaymentData,
  ): Promise<{ success: boolean; message: string; courseSlug: string }> {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, courseId } = verifyData;

    const payment = await this.paymentRepository.findByOrderId(razorpayOrderId);
    if (!payment) {
      throw new AppError('Payment record not found', 404, 'PAYMENT_NOT_FOUND');
    }

    // Verify HMAC-SHA256 signature
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_TEST_API_SECRET!)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw new AppError('Invalid payment signature', 400, 'INVALID_SIGNATURE');
    }

    // Mark payment as completed
    const updatedPayment = await this.paymentRepository.update(payment._id.toString(), {
      razorpayPaymentId,
      razorpaySignature,
      status: 'completed',
    });

    // Create enrollment
    const enrollment = await this.enrollmentRepository.create({
      student: studentId as any,
      course: courseId as any,
      payment: updatedPayment!._id as any,
      enrolledAt: new Date(),
    });

    // Retrieve course slug for redirect + email
    const course = await this.courseRepository.findById(courseId);

    // Send confirmation email — fire and forget, email service swallows its own errors
    try {
      const student = await this.userRepository.findById(studentId);
      if (student && course) {
        await sendEnrollmentEmail(
          { email: student.emailId, firstName: student.firstName },
          { title: course.title, slug: course.slug, thumbnail: course.thumbnail },
        );
      }
    } catch (emailErr) {
      console.error('[PaymentService] Enrollment email failed:', emailErr);
    }

    return {
      success: true,
      message: 'Enrollment successful',
      courseSlug: course?.slug ?? '',
    };
  }

  // ── Get My Payments ────────────────────────────────────────────────────────

  async getMyPayments(studentId: string) {
    return this.paymentRepository.findByStudent(studentId);
  }

  // ── Handle Failed Payment ─────────────────────────────────────────────────

  async handleFailedPayment(razorpayOrderId: string) {
    const payment = await this.paymentRepository.findByOrderId(razorpayOrderId);
    if (!payment) {
      throw new AppError('Payment record not found', 404, 'PAYMENT_NOT_FOUND');
    }

    const updated = await this.paymentRepository.update(payment._id.toString(), {
      status: 'failed',
    });

    return updated;
  }
}
