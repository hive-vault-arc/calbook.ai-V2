import Image from "next/image";
import type { ReactElement } from "react";

export function BookingBrandHeader(): ReactElement {
  return (
    <div className="mx-auto flex w-full max-w-5xl items-center px-6 py-6" data-testid="booking-brand">
      <Image src="/calbook-logo.svg" alt="CalBook.ai" width={132} height={28} className="h-7 w-auto" />
    </div>
  );
}
