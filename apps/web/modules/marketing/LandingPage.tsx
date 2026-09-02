import { Icon } from "@calcom/ui/components/icon";
import Image from "next/image";
import type { CSSProperties, ReactElement } from "react";
import styles from "./LandingPage.module.css";
import { LandingScrollMotion } from "./LandingScrollMotion";

type LandingStyle = CSSProperties & {
  "--cal-brand": string;
  "--cal-brand-emphasis": string;
  "--cal-brand-muted": string;
  "--cal-brand-subtle": string;
  "--cal-brand-text": string;
};

// The restrained editorial system keeps the product credible while black media slots remain easy to replace.
const landingStyle: LandingStyle = {
  "--cal-brand": "#7C3AED",
  "--cal-brand-emphasis": "#6D28D9",
  "--cal-brand-muted": "#DDD6FE",
  "--cal-brand-subtle": "#EDE9FE",
  "--cal-brand-text": "#FFFFFF",
  backgroundImage: "radial-gradient(#DDD6FE 0.7px, transparent 0.7px)",
  backgroundSize: "24px 24px",
};

const benefits = [
  {
    title: "Move interviews out of the inbox",
    description:
      "Give candidates a clear scheduling link instead of asking recruiters to coordinate every reply, reminder, and reschedule by hand.",
    detail: "Candidate self-scheduling",
  },
  {
    title: "Keep every interviewer in sync",
    description:
      "Check connected calendars before a time is offered, then carry the right meeting details into each confirmed interview.",
    detail: "Calendar coordination",
  },
  {
    title: "Make the next step obvious",
    description:
      "From the interview template to the confirmation email, candidates always know what they booked and what happens next.",
    detail: "Reliable follow-through",
  },
];

const faqs = [
  [
    "Can I start without paying?",
    "Yes. The Free plan lets you create a booking page and connect your calendar before choosing a paid plan.",
  ],
  [
    "Can candidates schedule their own interview?",
    "Yes. Share an interview link or embed it on your site and candidates can choose from the times your team has made available.",
  ],
  [
    "Will CalBook prevent double bookings?",
    "Connected calendars are checked before availability is shown, so occupied times are not offered to candidates.",
  ],
  [
    "Does it work with Google Calendar?",
    "Yes. Users connect their own Google account through OAuth; they do not need to provide an API key.",
  ],
  [
    "Can we use Google Meet, Microsoft Teams, or Zoom?",
    "Yes. CalBook keeps the meeting experience consistent and carries the correct provider details into the candidate invitation.",
  ],
  [
    "Is CalBook built for recruitment teams?",
    "Yes. The V1 workflow is intentionally focused on interview templates, candidate scheduling, recruiter operations, and the integrations teams use every day.",
  ],
] as const;

function BrandLockup({ inverted = false }: { inverted?: boolean }): ReactElement {
  return (
    <span className="flex items-center gap-2.5">
      <Image src="/calbook-icon.svg" alt="" width={30} height={30} priority />
      <span className={inverted ? "font-cal text-lg text-white" : "font-cal text-lg text-slate-950"}>
        CalBook<span className="text-brand-default">.ai</span>
      </span>
    </span>
  );
}

function MediaPlaceholder({ label, tall = false }: { label: string; tall?: boolean }): ReactElement {
  return (
    <div
      className={`${styles.mediaPlaceholder} ${
        tall
          ? "flex min-h-96 items-center justify-center bg-inverted p-8 text-inverted"
          : "flex min-h-72 items-center justify-center bg-inverted p-8 text-inverted"
      }`}>
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-slate-700">
          <Icon name="play" className="h-5 w-5" />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export function LandingPage(): ReactElement {
  return (
    <main className="min-h-screen bg-white text-slate-950" style={landingStyle}>
      <LandingScrollMotion />
      <header className="sticky top-0 z-50 border-b border-subtle bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="/" aria-label="CalBook.ai home">
            <BrandLockup />
          </a>
          <nav className="flex items-center gap-5 text-sm" aria-label="Main navigation">
            <a
              href="#product"
              className="hidden font-medium text-slate-500 transition hover:text-slate-950 sm:block">
              Product
            </a>
            <a
              href="#pricing"
              className="hidden font-medium text-slate-500 transition hover:text-slate-950 sm:block">
              Pricing
            </a>
            <a
              href="#faq"
              className="hidden font-medium text-slate-500 transition hover:text-slate-950 md:block">
              FAQ
            </a>
            <a href="/auth/login" className="font-semibold text-slate-950">
              Sign in
            </a>
            <a
              href="/signup"
              className={`${styles.primaryButton} inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full bg-brand px-6 py-2.5 font-semibold leading-5 text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-brand-emphasis`}>
              Start free
            </a>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-2 lg:items-center lg:pb-28">
        <div>
          <p
            className={`${styles.heroEyebrow} text-xs font-bold uppercase tracking-widest text-brand-default`}>
            Interview scheduling for recruitment teams
          </p>
          <h1
            className={`${styles.heroTitle} font-cal mt-6 max-w-2xl text-5xl leading-none tracking-tight text-slate-950 sm:text-6xl lg:text-7xl`}>
            Let candidates schedule the next interview—without the back-and-forth.
          </h1>
          <p className={`${styles.heroCopy} mt-7 max-w-xl text-lg leading-8 text-slate-600`}>
            Build interview templates your team can trust, share a candidate-ready link, and keep calendars,
            meeting details, and confirmations moving together.
          </p>
          <div
            className={`${styles.heroActions} mt-9 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center`}>
            <a
              href="/signup"
              className={`${styles.primaryButton} group inline-flex min-h-14 w-full items-center justify-center gap-3 whitespace-nowrap rounded-full bg-brand px-8 py-3.5 text-base font-semibold leading-6 text-white shadow-xl transition hover:-translate-y-1 hover:bg-brand-emphasis sm:w-auto`}>
              Create an interview template{" "}
              <Icon name="arrow-right" className="h-4 w-4 transition group-hover:translate-x-1" />
            </a>
            <a
              href="#demo"
              className={`${styles.secondaryButton} inline-flex min-h-14 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-slate-300 bg-white px-8 py-3.5 text-base font-semibold leading-6 text-slate-950 transition hover:border-slate-950 sm:w-auto`}>
              <Icon name="play" className="h-4 w-4" /> Watch product demo
            </a>
          </div>
          <p className={`${styles.heroActions} mt-5 text-sm text-slate-500`}>
            Free to start · Built for your first interview workflow
          </p>
          <div
            className={`${styles.heroProof} mt-9 grid max-w-xl grid-cols-3 border-y border-subtle py-5 text-sm`}>
            <div>
              <p className="font-semibold text-slate-950">Candidate links</p>
              <p className="mt-1 text-xs text-slate-500">Shareable</p>
            </div>
            <div>
              <p className="font-semibold text-slate-950">Calendar checks</p>
              <p className="mt-1 text-xs text-slate-500">Connected</p>
            </div>
            <div>
              <p className="font-semibold text-slate-950">Email follow-up</p>
              <p className="mt-1 text-xs text-slate-500">Automated</p>
            </div>
          </div>
        </div>
        <div id="demo" className={`${styles.mediaFrame} relative p-3 shadow-2xl ring-1 ring-slate-200`}>
          <MediaPlaceholder label="Hero product demo / screenshot" tall />
          <span className="absolute -bottom-4 -left-4 rounded-full bg-brand px-4 py-2 text-xs font-bold text-white shadow-lg">
            Add your product demo
          </span>
        </div>
      </section>

      <section id="product" className="bg-white px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div
            className={`${styles.scrollReveal} grid gap-8 lg:grid-cols-2 lg:items-end`}
            data-calbook-reveal>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-default">
                Built around the booking
              </p>
              <h2 className="font-cal mt-5 max-w-xl text-4xl leading-tight tracking-tight sm:text-5xl">
                Your interview templates, calendars, and follow-up. One booking flow.
              </h2>
            </div>
            <p className="max-w-lg text-lg leading-8 text-slate-600 lg:justify-self-end">
              Candidates choose a time. CalBook takes care of availability, invitations, meeting details, and
              the scheduling admin that slows a hiring process down.
            </p>
          </div>
          <div
            className={`${styles.scrollReveal} ${styles.scrollRevealDelay} mt-16 divide-y divide-slate-200 border-y border-slate-200`}
            data-calbook-reveal>
            {benefits.map((benefit, index) => (
              <article
                key={benefit.title}
                className={`${styles.featureRow} grid gap-5 py-8 md:grid-cols-3 md:items-start`}>
                <span className="font-cal text-4xl text-brand-default">0{index + 1}</span>
                <h3 className="font-cal text-2xl leading-tight text-slate-950">{benefit.title}</h3>
                <div>
                  <p className="leading-7 text-slate-600">{benefit.description}</p>
                  <p className="mt-4 text-xs font-bold uppercase tracking-widest text-brand-default">
                    {benefit.detail}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-subtle px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className={`${styles.scrollReveal} max-w-2xl`} data-calbook-reveal>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-default">
              See the product in context
            </p>
            <h2 className="font-cal mt-5 text-4xl leading-tight sm:text-5xl">
              Show the real workflow. Let the product earn trust.
            </h2>
          </div>
          <div
            className={`${styles.scrollReveal} ${styles.scrollRevealDelay} mt-12 grid gap-6 lg:grid-cols-3`}
            data-calbook-reveal>
            <div className="lg:col-span-2">
              <MediaPlaceholder label="Interview templates screenshot" />
            </div>
            <MediaPlaceholder label="Mobile booking flow screenshot" />
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className={styles.scrollReveal} data-calbook-reveal>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-default">Customer proof</p>
            <div className="mt-5 grid gap-10 lg:grid-cols-2">
              <h2 className="font-cal max-w-xl text-4xl leading-tight sm:text-5xl">
                Real stories belong here—not made-up testimonials.
              </h2>
              <p className="max-w-lg text-lg leading-8 text-slate-600">
                These black story slots are ready for verified customer quotes, portraits, and outcomes once
                beta users have given permission to publish them.
              </p>
            </div>
          </div>
          <div
            className={`${styles.scrollReveal} ${styles.scrollRevealDelay} mt-12 grid gap-5 md:grid-cols-3`}
            data-calbook-reveal>
            {["Customer story 01", "Customer story 02", "Customer story 03"].map((label) => (
              <MediaPlaceholder key={label} label={label} />
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-inverted px-5 py-24 text-inverted sm:px-8">
        <div
          className={`${styles.scrollReveal} mx-auto grid max-w-7xl gap-14 lg:grid-cols-2`}
          data-calbook-reveal>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-muted">
              Straightforward pricing
            </p>
            <h2 className="font-cal mt-5 max-w-xl text-4xl leading-tight sm:text-5xl">
              Start free. Upgrade when interview scheduling becomes a team workflow.
            </h2>
            <p className="mt-6 max-w-md leading-7 text-slate-300">
              Start with a dependable candidate scheduling workflow, then unlock the controls your recruitment
              team needs as hiring volume grows.
            </p>
          </div>
          <div className="grid gap-px bg-slate-700 sm:grid-cols-2">
            <article className="bg-inverted p-7">
              <p className="text-sm font-semibold text-slate-400">Free</p>
              <p className="font-cal mt-5 text-5xl">$0</p>
              <p className="mt-5 text-sm leading-6 text-slate-300">
                Interview templates, candidate links, calendar connections, and email confirmations.
              </p>
              <a
                href="/signup"
                className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-600 px-5 py-3 font-semibold leading-5 text-white transition hover:border-white hover:bg-white hover:text-slate-950">
                Start free <Icon name="arrow-right" className="h-4 w-4" />
              </a>
            </article>
            <article className="bg-brand p-7">
              <p className="text-sm font-semibold text-brand-muted">Pro</p>
              <p className="font-cal mt-5 text-5xl">
                $29<span className="font-sans text-sm">/month</span>
              </p>
              <p className="mt-5 text-sm leading-6 text-brand-muted">
                Advanced availability, team workflows, custom branding, and recruitment-ready controls.
              </p>
              <a
                href="/signup"
                className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 font-semibold leading-5 text-brand-default shadow-lg transition hover:-translate-y-0.5">
                Explore Pro <Icon name="arrow-right" className="h-4 w-4" />
              </a>
            </article>
          </div>
        </div>
      </section>

      <section id="faq" className="bg-white px-5 py-24 sm:px-8">
        <div
          className={`${styles.scrollReveal} mx-auto grid max-w-7xl gap-12 lg:grid-cols-3`}
          data-calbook-reveal>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-default">
              Questions, answered
            </p>
            <h2 className="font-cal mt-5 text-4xl leading-tight">Know what happens before you sign up.</h2>
          </div>
          <div className="divide-y divide-slate-200 border-y border-slate-200 lg:col-span-2">
            {faqs.map(([question, answer]) => (
              <details key={question} className={`${styles.faqItem} group py-5`}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-semibold text-slate-950">
                  <span>{question}</span>
                  <Icon
                    name="plus"
                    className="h-4 w-4 shrink-0 text-brand-default transition group-open:rotate-45"
                  />
                </summary>
                <p className="max-w-2xl pt-4 leading-7 text-slate-600">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-8 sm:px-8">
        <div
          className={`${styles.finalCta} ${styles.scrollReveal} mx-auto max-w-7xl bg-brand px-6 py-20 text-center text-white sm:px-12`}
          data-calbook-reveal>
          <h2 className="font-cal mx-auto max-w-3xl text-4xl leading-tight sm:text-6xl">
            Your next candidate should be able to book the interview.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-brand-muted">
            Create an interview template, connect your calendar, and share one candidate-ready link. Start
            without a credit card.
          </p>
          <a
            href="/signup"
            className="mt-9 inline-flex min-h-14 w-full items-center justify-center gap-3 whitespace-nowrap rounded-full bg-white px-9 py-4 text-base font-bold leading-6 text-brand-default shadow-xl transition hover:-translate-y-1 sm:w-auto">
            Create an interview template <Icon name="arrow-right" className="h-4 w-4" />
          </a>
        </div>
      </section>

      <footer className="bg-inverted px-5 py-12 text-inverted sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className={`${styles.footerGrid} grid gap-10 border-b border-slate-800 pb-10`}>
            <div>
              <BrandLockup inverted />
              <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">
                Interview scheduling, calendar coordination, and candidate follow-through for recruitment
                teams.
              </p>
            </div>
            <div>
              <p className="font-semibold">Product</p>
              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
                <a href="#product" className="hover:text-white">
                  Features
                </a>
                <a href="#pricing" className="hover:text-white">
                  Pricing
                </a>
                <a href="/signup" className="hover:text-white">
                  Create account
                </a>
              </div>
            </div>
            <div className={styles.footerLegal}>
              <p className="font-semibold">Legal & support</p>
              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
                <a href="/terms" className="hover:text-white">
                  Terms
                </a>
                <a href="/privacy" className="hover:text-white">
                  Privacy
                </a>
                <span>Support details coming before launch</span>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} CalBook.ai</span>
            <span>Scheduling for recruitment teams.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
