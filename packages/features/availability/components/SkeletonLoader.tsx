"use client";

import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { SkeletonText } from "@calcom/ui/components/skeleton";

function SkeletonLoader() {
  return (
    <div className="animate-pulse">
      <div className="border-subtle bg-default mb-8 overflow-hidden rounded-xl border">
        <div className="border-subtle flex items-center justify-between border-b px-5 py-4">
          <div>
            <SkeletonText className="mb-2 h-3 w-20" />
            <SkeletonText className="h-5 w-40" />
          </div>
          <SkeletonText className="h-4 w-28" />
        </div>
        <div className="grid grid-cols-7 gap-px bg-subtle p-px">
          {Array.from({ length: 7 }, (_, day) => (
            <div key={day} className="bg-default px-2 py-3 sm:px-4">
              <SkeletonText className="mb-3 h-3 w-8" />
              <SkeletonText className="mb-3 h-4 w-7" />
              <SkeletonText className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
        <div className="px-5 py-3">
          <SkeletonText className="h-4 w-64 max-w-full" />
        </div>
      </div>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <SkeletonText className="mb-2 h-4 w-20" />
          <SkeletonText className="h-3 w-72 max-w-full" />
        </div>
        <SkeletonText className="h-3 w-16" />
      </div>
      <ul className="divide-subtle border-subtle bg-default divide-y rounded-xl border sm:mx-0 sm:overflow-hidden">
        <SkeletonItem />
        <SkeletonItem />
      </ul>
    </div>
  );
}

export default SkeletonLoader;

function SkeletonItem() {
  return (
    <li>
      <div className="flex items-center justify-between py-5  ltr:pl-4 rtl:pr-4 sm:ltr:pl-0 sm:rtl:pr-0">
        <div className="items-between flex w-full flex-col justify-center sm:px-6">
          <SkeletonText className="my-1 h-4 w-32" />
          <SkeletonText className="my-1 h-2 w-24" />
          <SkeletonText className="my-1 h-2 w-40" />
        </div>
        <Button
          className="mx-5"
          type="button"
          variant="icon"
          color="secondary"
          StartIcon="ellipsis"
          disabled
        />
      </div>
    </li>
  );
}

export const SelectSkeletonLoader = ({ className }: { className?: string }) => {
  return (
    <li
      className={classNames(
        "border-subtle group flex w-full items-center justify-between rounded-sm border px-[10px] py-3",
        className
      )}>
      <div className="grow truncate text-sm">
        <div className="flex justify-between">
          <SkeletonText className="h-4 w-32" />
          <SkeletonText className="h-4 w-4" />
        </div>
      </div>
    </li>
  );
};
