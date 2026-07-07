import Payment, { IPayment } from '../models/payment.model';

const STUDENT_POPULATE = {
  path: 'student',
  select: 'firstName lastName emailId avatar',
};

const COURSE_POPULATE = {
  path: 'course',
  select: 'title slug thumbnail',
};

export class PaymentRepository {
  async create(data: Partial<IPayment>): Promise<IPayment> {
    return Payment.create(data);
  }

  async findByOrderId(orderId: string): Promise<IPayment | null> {
    return Payment.findOne({ razorpayOrderId: orderId });
  }

  async findByStudent(studentId: string): Promise<IPayment[]> {
    return Payment.find({ student: studentId })
      .populate(COURSE_POPULATE)
      .sort({ createdAt: -1 });
  }

  async findAll(): Promise<IPayment[]> {
    return Payment.find()
      .populate(STUDENT_POPULATE)
      .populate(COURSE_POPULATE)
      .sort({ createdAt: -1 });
  }

  async update(id: string, data: Partial<IPayment>): Promise<IPayment | null> {
    return Payment.findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after', runValidators: true });
  }

  async getRevenue(): Promise<number> {
    const result = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return result.length > 0 ? result[0].total : 0;
  }
}
