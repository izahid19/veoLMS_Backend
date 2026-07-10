interface PriceBreakdown {
  originalPrice: number      // base price in paise
  courseDiscount: number     // amount saved from course discount
  discountedPrice: number    // after course discount
  couponDiscount: number     // amount saved from coupon
  taxableAmount: number      // after coupon, before tax
  taxAmount: number          // tax in paise
  totalAmount: number        // final amount to charge
  discountPercent: number    // course discount %
  taxPercent: number         // tax %
  isFree: boolean            // if totalAmount === 0
}

export function calculatePrice(
  course: { price: number, discountPercent: number, discountExpiresAt: Date | null, taxPercent: number },
  coupon?: { discountType: 'percentage' | 'flat', discountValue: number } | null
): PriceBreakdown {

  const originalPrice = course.price  // in paise

  // Step 1: Course discount — only if not expired
  let discountPercent = 0
  if (course.discountPercent > 0) {
    if (!course.discountExpiresAt || new Date(course.discountExpiresAt) > new Date()) {
      discountPercent = course.discountPercent
    }
  }
  const courseDiscount = Math.floor(originalPrice * discountPercent / 100)
  const discountedPrice = originalPrice - courseDiscount

  // Step 2: Coupon discount
  let couponDiscount = 0
  if (coupon) {
    if (coupon.discountType === 'percentage') {
      couponDiscount = Math.floor(discountedPrice * coupon.discountValue / 100)
    } else {
      couponDiscount = Math.min(coupon.discountValue, discountedPrice)
    }
  }
  const taxableAmount = Math.max(0, discountedPrice - couponDiscount)

  // Step 3: Tax on taxable amount
  const taxAmount = Math.floor(taxableAmount * course.taxPercent / 100)
  
  // Step 4: Total — minimum 100 paise (₹1) if not free
  let totalAmount = taxableAmount + taxAmount
  if (totalAmount > 0 && totalAmount < 100) totalAmount = 100

  return {
    originalPrice,
    courseDiscount,
    discountedPrice,
    couponDiscount,
    taxableAmount,
    taxAmount,
    totalAmount,
    discountPercent,
    taxPercent: course.taxPercent,
    isFree: totalAmount === 0,
  }
}
