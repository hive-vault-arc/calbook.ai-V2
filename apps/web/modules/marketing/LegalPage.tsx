import { SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import Image from "next/image";
import type { ReactElement, ReactNode } from "react";

export type LegalSection = {
  title: string;
  content: ReactNode;
};

export function LegalPage({
  title,
  description,
  updatedAt,
  sections,
}: {
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
}): ReactElement {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="/" aria-label="CalBook.ai home" className="flex items-center gap-2.5">
            <Image src="/calbook-icon.svg" alt="" width={30} height={30} priority />
            <span className="font-cal text-lg">
              CalBook<span className="text-brand-default">.ai</span>
            </span>
          </a>
          <nav
            aria-label="Legal pages"
            className="flex items-center gap-5 text-sm font-medium text-slate-600">
            <a className="transition hover:text-slate-950" href="/terms">
              Terms
            </a>
            <a className="transition hover:text-slate-950" href="/privacy">
              Privacy
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:py-24">
        <article className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-default">Legal</p>
          <h1 className="font-cal mt-4 text-4xl leading-tight sm:text-6xl">{title}</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">{description}</p>
          <p className="mt-4 text-sm text-slate-500">Last updated: {updatedAt}</p>

          <div className="mt-14 space-y-12">
            {sections.map((section, index) => (
              <section key={section.title} id={`section-${index + 1}`} className="scroll-mt-24">
                <h2 className="font-cal text-2xl text-slate-950">{section.title}</h2>
                <div className="mt-4 space-y-4 text-base leading-7 text-slate-600">{section.content}</div>
              </section>
            ))}
          </div>
        </article>

        <aside className="h-fit border-t border-slate-200 pt-6 lg:sticky lg:top-8 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
          <p className="text-sm font-semibold text-slate-950">On this page</p>
          <ol className="mt-4 space-y-3 text-sm text-slate-600">
            {sections.map((section, index) => (
              <li key={section.title}>
                <a className="transition hover:text-brand-default" href={`#section-${index + 1}`}>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      <footer className="border-t border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-600 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} CalBook.ai</span>
          {SUPPORT_MAIL_ADDRESS ? (
            <a
              className="font-medium text-brand-default hover:underline"
              href={`mailto:${SUPPORT_MAIL_ADDRESS}`}>
              {SUPPORT_MAIL_ADDRESS}
            </a>
          ) : (
            <span>Contact details will be published before public launch.</span>
          )}
        </div>
      </footer>
    </main>
  );
}
