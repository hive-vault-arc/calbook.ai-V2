import { COMPANY_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { LegalPage, type LegalSection } from "../../modules/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern access to and use of CalBook.ai.",
};

const contact = SUPPORT_MAIL_ADDRESS || "the support address published in the CalBook.ai service";

const sections: LegalSection[] = [
  {
    title: "Agreement and eligibility",
    content: (
      <>
        <p>
          These Terms govern your access to CalBook.ai and form an agreement between you and {COMPANY_NAME}.
          By creating an account or using the service, you confirm that you can enter into this agreement and
          that the information you provide is accurate.
        </p>
        <p>
          You must be at least 18 years old and use the service for lawful business or professional purposes.
        </p>
      </>
    ),
  },
  {
    title: "The service",
    content: (
      <p>
        CalBook.ai provides interview templates, availability coordination, candidate booking pages,
        reminders, calendar connections, meeting-provider connections, and related scheduling tools. We may
        improve or change features while preserving paid functionality in a commercially reasonable way.
      </p>
    ),
  },
  {
    title: "Accounts and organizations",
    content: (
      <>
        <p>
          You are responsible for safeguarding your sign-in credentials and for activity performed through
          your account. Organization administrators may manage member access, settings, integrations, and data
          within their workspace.
        </p>
        <p>Tell us promptly at {contact} if you believe an account has been compromised.</p>
      </>
    ),
  },
  {
    title: "Customer and candidate data",
    content: (
      <>
        <p>
          You retain your rights in data submitted to the service. You authorize us to host, process,
          transmit, and display that data only as needed to operate, secure, support, and improve the service
          and to follow your documented instructions.
        </p>
        <p>
          Recruiters and organizations are responsible for having a lawful basis to collect candidate data and
          for configuring their booking forms and retention practices appropriately.
        </p>
      </>
    ),
  },
  {
    title: "Connected services",
    content: (
      <p>
        Calendar, video, email, payment, and other third-party integrations are governed by their providers'
        terms. You authorize CalBook.ai to take the actions you request through a connected account, such as
        reading availability or creating, updating, and cancelling calendar events. You can disconnect an
        integration from its settings or provider account.
      </p>
    ),
  },
  {
    title: "Acceptable use",
    content: (
      <p>
        You may not misuse the service, bypass access controls, probe or disrupt systems, send unlawful or
        abusive communications, infringe another person's rights, upload malicious code, resell the service
        without permission, or use scheduling data for discrimination, surveillance, or decisions prohibited
        by law.
      </p>
    ),
  },
  {
    title: "Plans, fees, and cancellation",
    content: (
      <>
        <p>
          Paid plans renew for the interval shown at checkout until cancelled. Prices, taxes, billing dates,
          and plan features are shown before purchase. Unless required by law or stated at checkout, fees
          already paid are non-refundable.
        </p>
        <p>
          Cancelling a subscription stops future renewals and normally preserves access through the current
          paid period. Separate charges collected by a recruiter for an interview or related service are
          governed by that recruiter's disclosed policy.
        </p>
      </>
    ),
  },
  {
    title: "Ownership and open source",
    content: (
      <p>
        We and our licensors retain rights in the service, branding, and proprietary materials. Components
        distributed under open-source licenses remain governed by those licenses. These Terms do not restrict
        rights granted directly by an applicable open-source license.
      </p>
    ),
  },
  {
    title: "Availability and warranties",
    content: (
      <p>
        We work to provide a secure and reliable service, but internet and third-party services can fail. To
        the extent permitted by law, the service is provided "as is" and "as available" without implied
        warranties of merchantability, fitness for a particular purpose, or non-infringement. Nothing here
        excludes a warranty or consumer right that cannot legally be excluded.
      </p>
    ),
  },
  {
    title: "Liability",
    content: (
      <p>
        To the extent permitted by law, neither party is liable for indirect, incidental, special,
        consequential, or punitive damages, or for lost profits, revenue, goodwill, or data. Our aggregate
        liability arising from the service will not exceed the amount you paid for it during the 12 months
        before the event giving rise to the claim. Limits do not apply where they are prohibited by law or to
        liability that cannot be limited.
      </p>
    ),
  },
  {
    title: "Suspension and termination",
    content: (
      <p>
        You may stop using the service at any time. We may suspend or terminate access for material breach,
        unlawful use, security risk, or non-payment, normally after notice where practical. Account data is
        handled according to the Privacy Policy and applicable retention obligations.
      </p>
    ),
  },
  {
    title: "Changes and contact",
    content: (
      <p>
        We may update these Terms to reflect legal, security, or product changes. We will provide reasonable
        notice of material changes before they take effect. Questions about these Terms can be sent to{" "}
        {contact}.
      </p>
    ),
  },
];

export default function TermsPage(): ReactElement {
  return (
    <LegalPage
      title="Terms of Service"
      description="The rules and responsibilities that apply when you use CalBook.ai."
      updatedAt="September 24, 2026"
      sections={sections}
    />
  );
}
