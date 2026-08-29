type BookingPackageBalance = {
  totalSessions: number;
  usedSessions: number;
};

export function getRemainingPackageSessions(bookingPackage: BookingPackageBalance): number {
  return Math.max(bookingPackage.totalSessions - bookingPackage.usedSessions, 0);
}
