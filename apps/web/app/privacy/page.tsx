import { COMPANY_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { LegalPage, type LegalSection } from "../../modules/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How CalBook.ai collects, uses, shares, and protects personal information.",
};

const contact = SUPPORT_MAIL_ADDRESS || "the support address published in the CalBook.ai service";

const sections: LegalSection[] = [
  {
    title: "Scope and our role",
    content: (
      <>
        <p>
          This Policy explains how {COMPANY_NAME} handles personal information when people visit, create an
          account, connect a calendar, or schedule through CalBook.ai.
        </p>
        <p>
          We act as a controller for account, security, product, and billing administration. When an
          organization uses CalBook.ai to schedule candidates, that organization generally controls the
          candidate data and we process it on its instructions.
        </p>
      </>
    ),
  },
  {
    title: "Information we collect",
    content: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Account and workspace details, such as name, email, role, organization, settings, and profile data.
        </li>
        <li>
          Scheduling data, such as availability, time zone, booking answers, attendees, notes, and event
          status.
        </li>
        <li>
          Connected-service data and authorization tokens needed for calendar, meeting, email, or other
          integrations.
        </li>
        <li>
          Payment and plan records; payment-card details are handled by the payment provider rather than
          stored by us.
        </li>
        <li>
          Technical and security data, such as IP address, browser, device, logs, diagnostics, and audit
          events.
        </li>
        <li>Communications and support requests you send to us.</li>
      </ul>
    ),
  },
  {
    title: "Google Calendar data",
    content: (
      <>
        <p>
          If you connect Google Calendar, CalBook.ai requests only the permissions shown during Google
          consent. Depending on the feature you enable, we use calendar lists, free/busy information, event
          details, and event-management access to calculate availability and create, update, or remove
          scheduling events and Google Meet conference details.
        </p>
        <p>
          We store the authorization credentials and identifiers required to keep the connection working. We
          do not sell Google user data, use it for advertising, or use it to train general-purpose AI models.
          We do not permit humans to read Google user data except with your permission, for security or
          support when necessary, when required by law, or when the data is aggregated and de-identified for
          internal operations.
        </p>
        <p>
          CalBook.ai's use and transfer of information received from Google APIs adheres to the Google API
          Services User Data Policy, including its Limited Use requirements. You can revoke access in
          CalBook.ai or your Google Account permissions.
        </p>
      </>
    ),
  },
  {
    title: "How we use information",
    content: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Provide scheduling, availability, calendar synchronization, meetings, reminders, and support.</li>
        <li>
          Authenticate users, secure accounts, prevent abuse, investigate incidents, and maintain audit
          records.
        </li>
        <li>Administer plans and payments and communicate operational or service changes.</li>
        <li>Diagnose performance and improve user-facing features using appropriately limited data.</li>
        <li>Comply with law and enforce our agreements.</li>
      </ul>
    ),
  },
  {
    title: "Legal bases",
    content: (
      <p>
        Where applicable, we process information to perform our contract, follow your consent or instructions,
        comply with legal obligations, and pursue legitimate interests such as securing and improving the
        service. You may withdraw consent for a connected service by disconnecting it, without affecting
        earlier lawful processing.
      </p>
    ),
  },
  {
    title: "How information is shared",
    content: (
      <p>
        We share information with workspace members you authorize; candidates and attendees involved in a
        booking; infrastructure, email, monitoring, calendar, meeting, support, and payment providers that
        help deliver the service; professional advisers; and authorities when legally required. We may
        transfer data in a corporate transaction with appropriate safeguards. We do not sell personal
        information.
      </p>
    ),
  },
  {
    title: "Retention",
    content: (
      <p>
        We keep information only as long as needed for the service, security, disputes, and legal obligations.
        Workspace administrators may control or delete scheduling records. When an account or connection is
        removed, we delete or de-identify associated data within a reasonable period unless law or a
        legitimate security need requires longer retention. Backups expire on their normal protected rotation.
      </p>
    ),
  },
  {
    title: "Security and international transfers",
    content: (
      <p>
        We use administrative, technical, and organizational safeguards designed to protect personal
        information, including access controls, encryption in transit, and protected credentials. No service
        can guarantee absolute security. Where information crosses borders, we use safeguards required by
        applicable law.
      </p>
    ),
  },
  {
    title: "Your choices and rights",
    content: (
      <p>
        Depending on your location, you may ask to access, correct, delete, restrict, object to, or export
        your personal information, withdraw consent, or complain to a data-protection authority. Contact your
        recruiting organization first for candidate data it controls, or contact us at {contact}. We may
        verify your identity before completing a request.
      </p>
    ),
  },
  {
    title: "Children",
    content: (
      <p>
        CalBook.ai is a business service and is not directed to children under 16. Do not intentionally submit
        a child's information unless you have the authority and lawful basis to do so.
      </p>
    ),
  },
  {
    title: "Changes and contact",
    content: (
      <p>
        We may update this Policy as the service or law changes. We will post the new date and provide
        additional notice when a change materially affects how information is used. Questions and privacy
        requests can be sent to {contact}.
      </p>
    ),
  },
];

export default function PrivacyPage(): ReactElement {
  return (
    <LegalPage
      title="Privacy Policy"
      description="A clear account of the information CalBook.ai needs, why it is used, and the choices available to you."
      updatedAt="September 24, 2026"
      sections={sections}
    />
  );
}
