import Loader from "@components/Loader";
import classNames from "classnames";

interface Props {
  footerText?: React.ReactNode | string;
  showLogo?: boolean;
  heading?: string;
  loading?: boolean;
}

export default function AuthContainer(props: React.PropsWithChildren<Props>) {
  return (
    <div className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-[#faf9ff] py-12 dark:bg-[#110d20] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -top-40 -right-32 h-96 w-96 rounded-full bg-violet-200/55 blur-3xl dark:bg-violet-700/20" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-fuchsia-100/70 blur-3xl dark:bg-fuchsia-700/10" />
      {props.showLogo && (
        <a href="/" aria-label="CalBook.ai home" className="relative mx-auto mb-auto">
          <img src="/calbook-logo.svg" alt="CalBook.ai" className="h-9 w-auto" />
        </a>
      )}

      <div
        className={classNames(
          props.showLogo ? "relative text-center" : "",
          "sm:mx-auto sm:w-full sm:max-w-md"
        )}>
        {props.heading && <h2 className="font-cal text-emphasis text-center text-3xl">{props.heading}</h2>}
      </div>
      {props.loading && (
        <div className="bg-cal-muted absolute z-50 flex h-screen w-full items-center">
          <Loader />
        </div>
      )}
      <div className="relative mb-auto mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-2 rounded-2xl border border-violet-100 bg-default px-4 py-10 shadow-[0_24px_70px_-30px_rgba(91,33,182,0.35)] dark:border-violet-900/70 dark:bg-[#181126] sm:px-10">
          {props.children}
        </div>
        <div className="text-default mt-8 text-center text-sm">{props.footerText}</div>
      </div>
    </div>
  );
}
