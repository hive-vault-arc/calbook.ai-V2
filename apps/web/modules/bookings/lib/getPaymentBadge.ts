type BookingPaymentBadgeKind = "cardHeld" | "deposit" | "paid" | "pending" | "refunded" | "tip";

type BookingPayment = {
  paymentOption: string | null;
  success: boolean;
  refunded: boolean;
};

export function getPaymentBadgeKind(payment: BookingPayment): BookingPaymentBadgeKind {
  if (payment.refunded) return "refunded";
  if (!payment.success) return "pending";
  if (payment.paymentOption === "HOLD") return "cardHeld";
  if (payment.paymentOption === "DEPOSIT") return "deposit";
  if (payment.paymentOption === "TIP") return "tip";
  return "paid";
}
