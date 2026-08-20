import type { IconName } from "@calcom/ui/components/icon";
import { Icon } from "@calcom/ui/components/icon";
import type { ReactElement } from "react";

type Feature = {
  icon: IconName;
  title: string;
  description: string;
};

type Plan = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlight: boolean;
};

const features: Feature[] = [
  {
    icon: "users",
    title: "Interview Pipeline",
    description:
      "Drag-and-drop Kanban board to track candidates through every interview stage. Move candidates with a simple drag.",
  },
  {
    icon: "zap",
    title: "Automation Engine",
    description:
      "Automate follow-ups, stage transitions, and notifications. Trigger workflows on booking events, stage changes, and more.",
  },
  {
    icon: "calendar",
    title: "Multi-Party Scheduling",
    description:
      "Schedule interviews with multiple interviewers, observers, and candidates. Find time slots that work for everyone.",
  },
  {
    icon: "layout-dashboard",
    title: "Analytics Dashboard",
    description:
      "Real-time insights into your recruiting pipeline. Booking trends, candidate flow, automation success rates.",
  },
  {
    icon: "mail",
    title: "Email & SMS Actions",
    description:
      "Send automated emails, SMS via Twilio, and Slack notifications. Keep candidates engaged at every step.",
  },
  {
    icon: "shield",
    title: "Secure & Reliable",
    description:
      "Built on Cal.com's battle-tested infrastructure. SSO, audit logs, and enterprise-grade security.",
  },
];

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    description: "For solo recruiters",
    features: ["3 automations", "50 candidates", "Interview pipeline", "Basic dashboard"],
    cta: "Get started",
    href: "/auth/signup",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    description: "For growing teams",
    features: [
      "50 automations",
      "5,000 candidates",
      "Multi-party scheduling",
      "Custom branding",
      "API access",
      "Email + SMS + Slack",
    ],
    cta: "Start 14-day trial",
    href: "/auth/signup",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/mo",
    description: "For large organizations",
    features: [
      "Unlimited automations",
      "Unlimited candidates",
      "Priority support",
      "SSO & SAML",
      "Custom integrations",
      "Audit logs",
    ],
    cta: "Contact us",
    href: "/auth/signup",
    highlight: false,
  },
];

export function LandingPage(): ReactElement {
  return (
    <div className="bg-default min-h-screen">
      {/* Header */}
      <header className="border-subtle sticky top-0 z-50 border-b bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="bg-brand text-brand-inverted flex h-8 w-8 items-center justify-center rounded-lg font-bold">
              C
            </span>
            <span className="text-emphasis text-lg font-bold">CalBook.ai</span>
          </div>
          <nav className="flex items-center gap-6">
            <a
              href="#features"
              className="text-subtle hover:text-emphasis text-sm font-medium transition-colors">
              Features
            </a>
            <a
              href="#pricing"
              className="text-subtle hover:text-emphasis text-sm font-medium transition-colors">
              Pricing
            </a>
            <a
              href="/auth/login"
              className="text-subtle hover:text-emphasis text-sm font-medium transition-colors">
              Sign in
            </a>
            <a
              href="/auth/signup"
              className="bg-brand text-brand-inverted hover:bg-brand-emphasis rounded-lg px-4 py-2 text-sm font-semibold transition-colors">
              Get started
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-20">
        <div className="bg-brand-subtle absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full opacity-30 blur-3xl" />
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="bg-brand-subtle text-brand-default mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium">
            <Icon name="sparkles" className="h-4 w-4" />
            AI-powered recruiting automation
          </div>
          <h1 className="text-emphasis text-5xl font-bold tracking-tight sm:text-6xl">
            Hire faster with
            <span className="text-brand-default"> intelligent recruiting</span>
          </h1>
          <p className="text-subtle mx-auto mt-6 max-w-2xl text-lg">
            CalBook.ai transforms your hiring process with automated interview pipelines, multi-party
            scheduling, and workflow automation. Stop managing spreadsheets — start hiring.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <a
              href="/auth/signup"
              className="bg-brand text-brand-inverted hover:bg-brand-emphasis rounded-xl px-6 py-3 text-base font-semibold shadow-lg transition-all hover:shadow-xl">
              Start free trial
            </a>
            <a
              href="#features"
              className="border-subtle text-emphasis hover:bg-subtle rounded-xl border px-6 py-3 text-base font-semibold transition-colors">
              See features
            </a>
          </div>
          <p className="text-subtle mt-4 text-sm">No credit card required · 14-day Pro trial</p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-subtle border-y bg-subtle/30 py-8">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-6 sm:grid-cols-4">
          {[
            { value: "10x", label: "Faster hiring" },
            { value: "80%", label: "Less manual work" },
            { value: "24/7", label: "Automation runs" },
            { value: "100%", label: "Customizable" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-brand-default text-3xl font-bold">{stat.value}</div>
              <div className="text-subtle mt-1 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-emphasis text-3xl font-bold sm:text-4xl">Everything you need to hire</h2>
          <p className="text-subtle mt-4 text-lg">
            From candidate pipeline to automated follow-ups, CalBook.ai has you covered.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="border-subtle bg-default hover:border-brand rounded-2xl border p-6 transition-colors">
              <div className="bg-brand-subtle text-brand-default mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
                <Icon name={feature.icon} className="h-6 w-6" />
              </div>
              <h3 className="text-emphasis text-lg font-semibold">{feature.title}</h3>
              <p className="text-subtle mt-2 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-subtle/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-emphasis text-3xl font-bold sm:text-4xl">Simple, transparent pricing</h2>
            <p className="text-subtle mt-4 text-lg">Start free. Upgrade when you grow.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 ${
                  plan.highlight ? "border-brand bg-default shadow-lg" : "border-subtle bg-default"
                }`}>
                {plan.highlight && (
                  <span className="bg-brand text-brand-inverted absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold">
                    Most Popular
                  </span>
                )}
                <h3 className="text-emphasis text-xl font-bold">{plan.name}</h3>
                <p className="text-subtle mt-1 text-sm">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-emphasis text-4xl font-bold">{plan.price}</span>
                  <span className="text-subtle">{plan.period}</span>
                </div>
                <ul className="mt-6 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="text-emphasis flex items-center gap-2 text-sm">
                      <Icon name="check" className="text-success h-4 w-4" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.href}
                  className={`mt-6 block rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? "bg-brand text-brand-inverted hover:bg-brand-emphasis"
                      : "border-subtle text-emphasis hover:bg-subtle border"
                  }`}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="text-emphasis text-3xl font-bold sm:text-4xl">Ready to transform your hiring?</h2>
        <p className="text-subtle mt-4 text-lg">
          Join recruiters who use CalBook.ai to hire faster and smarter.
        </p>
        <a
          href="/auth/signup"
          className="bg-brand text-brand-inverted hover:bg-brand-emphasis mt-8 inline-block rounded-xl px-8 py-3.5 text-base font-semibold shadow-lg transition-all hover:shadow-xl">
          Get started for free
        </a>
      </section>

      {/* Footer */}
      <footer className="border-subtle border-t py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="bg-brand text-brand-inverted flex h-6 w-6 items-center justify-center rounded text-xs font-bold">
              C
            </span>
            <span className="text-emphasis text-sm font-semibold">CalBook.ai</span>
          </div>
          <p className="text-subtle text-sm">
            © {new Date().getFullYear()} CalBook.ai · Open-source under AGPL-3.0
          </p>
        </div>
      </footer>
    </div>
  );
}
