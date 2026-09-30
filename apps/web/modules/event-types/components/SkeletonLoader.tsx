import { SkeletonAvatar, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { ClockIcon, SearchIcon, UserIcon } from "@coss/ui/icons";

function SkeletonLoader() {
  return (
    <SkeletonContainer>
      <div className="mb-4 flex items-center">
        <SkeletonAvatar className="h-8 w-8" />
        <div className="flex flex-col stack-y-1">
          <SkeletonText className="h-4 w-16" />
          <SkeletonText className="h-4 w-24" />
        </div>
      </div>
      <ul className="border-subtle bg-default divide-subtle divide-y rounded-md border sm:mx-0 sm:overflow-hidden">
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
      </ul>
    </SkeletonContainer>
  );
}

export default SkeletonLoader;

export function InfiniteSkeletonLoader() {
  return (
    <SkeletonContainer>
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-brand-subtle bg-brand-subtle px-4 py-3.5">
        <SkeletonAvatar className="h-10 w-10 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <SkeletonText className="h-4 w-32" />
          <SkeletonText className="h-3 w-72 max-w-full" />
        </div>
      </div>
      <ul className="relative flex flex-col gap-4 before:absolute before:top-9 before:bottom-9 before:left-8 before:w-px before:bg-brand-subtle sm:before:left-10">
        <BookingTypeSkeletonCard />
        <BookingTypeSkeletonCard />
        <BookingTypeSkeletonCard />
        <BookingTypeSkeletonCard />
      </ul>
    </SkeletonContainer>
  );
}

function BookingTypeSkeletonCard() {
  return (
    <li className="relative grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-4">
      <div className="relative z-10 flex justify-center pt-4 sm:pt-5">
        <SkeletonAvatar className="h-16 w-16 shrink-0 rounded-full sm:h-[4.5rem] sm:w-[4.5rem]" />
      </div>
      <div className="min-h-48 rounded-2xl border border-subtle bg-default p-4 shadow-sm sm:p-5">
        <div className="min-w-0">
          <SkeletonText className="mb-4 h-3 w-36" />
          <div className="flex items-center gap-2">
            <SkeletonText className="h-5 w-36" />
            <SkeletonText className="h-5 w-12 rounded-full" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <SkeletonText className="h-7 w-36 rounded-full" />
            <SkeletonText className="h-7 w-24 rounded-full" />
          </div>
          <SkeletonText className="mt-4 h-8 w-full rounded-md" />
        </div>
        <div className="mt-4 flex min-h-14 items-end justify-between border-subtle border-t pt-4">
          <SkeletonText className="h-6 w-20" />
          <SkeletonText className="h-8 w-52 max-w-1/2 rounded-md" />
        </div>
      </div>
    </li>
  );
}

function TabsSkeletonLoader() {
  return (
    <div className="mb-2.5 max-w-full">
      <nav className="no-scrollbar flex space-x-0.5 overflow-x-scroll rounded-md">
        <div className="bg-subtle inline-flex h-fit items-center justify-center whitespace-nowrap rounded-md p-1">
          <SkeletonAvatar className="mb-1 mr-1 h-4 w-4 rounded-full" />
          <SkeletonText className="h-4 w-16" />
        </div>
        <div className="inline-flex h-fit items-center justify-center whitespace-nowrap rounded-md p-1">
          <SkeletonAvatar className="mb-1 mr-1 h-4 w-4 rounded-full" />
          <SkeletonText className="h-4 w-16" />
        </div>
      </nav>
    </div>
  );
}

export function SearchSkeletonLoader() {
  return (
    <div className="max-w-64 mb-4">
      <div className="bg-default border-default flex h-8 items-center gap-1 rounded-[10px] border px-3 py-2">
        <div className="flex items-center justify-center">
          <SearchIcon className="text-subtle h-4 w-4" />
        </div>
        <SkeletonText className="max-w-56 h-4 w-full" />
      </div>
    </div>
  );
}

export function EventTypesSkeletonLoader() {
  return (
    <SkeletonContainer>
      <TabsSkeletonLoader />
      <SearchSkeletonLoader />
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-brand-subtle bg-brand-subtle px-4 py-3.5">
        <SkeletonAvatar className="h-10 w-10 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <SkeletonText className="h-4 w-32" />
          <SkeletonText className="h-3 w-72 max-w-full" />
        </div>
      </div>
      <ul className="relative flex flex-col gap-4 before:absolute before:top-9 before:bottom-9 before:left-8 before:w-px before:bg-brand-subtle sm:before:left-10">
        <BookingTypeSkeletonCard />
        <BookingTypeSkeletonCard />
        <BookingTypeSkeletonCard />
        <BookingTypeSkeletonCard />
      </ul>
    </SkeletonContainer>
  );
}

function SkeletonItem() {
  return (
    <li className="group flex w-full items-center justify-between px-4 py-4 sm:px-6">
      <div className="grow truncate text-sm">
        <div>
          <SkeletonText className="h-5 w-32" />
        </div>
        <div className="">
          <ul className="mt-2 flex space-x-4 rtl:space-x-reverse ">
            <li className="flex items-center whitespace-nowrap">
              <ClockIcon className="text-subtle mr-1.5 mt-0.5 inline h-4 w-4" />
              <SkeletonText className="h-4 w-12" />
            </li>
            <li className="flex items-center whitespace-nowrap">
              <UserIcon className="text-subtle mr-1.5 mt-0.5 inline h-4 w-4" />
              <SkeletonText className="h-4 w-12" />
            </li>
          </ul>
        </div>
      </div>
    </li>
  );
}
