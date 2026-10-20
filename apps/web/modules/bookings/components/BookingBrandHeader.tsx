import Image from "next/image";
import type { ReactElement } from "react";

export function BookingBrandHeader(): ReactElement {
  return (
    <div className="mx-auto flex w-full max-w-5xl items-center gap-2.5 px-6 py-6" data-testid="booking-brand">
      <Image src="/calbook-icon.svg" alt="" width={28} height={28} className="h-7 w-7" />
      <span className="font-cal font-semibold text-[#17132a] text-xl tracking-tight dark:text-white">
        CalBook<span className="text-violet-600 dark:text-violet-400">.ai</span>
      </span>
    </div>
  );
}
