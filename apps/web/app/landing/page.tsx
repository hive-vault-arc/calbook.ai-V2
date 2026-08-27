import type { Metadata } from "next";
import { LandingPage } from "~/marketing/LandingPage";

export const metadata: Metadata = {
  title: "Online Scheduling and Paid Bookings | CalBook.ai",
  description:
    "Create a professional booking page, connect your calendar, collect payment, and automate meeting confirmations with CalBook.ai.",
  keywords: ["online scheduling", "paid bookings", "appointment scheduling", "booking page"],
  openGraph: {
    title: "Turn available time into booked work | CalBook.ai",
    description: "Scheduling, payments, and follow-through for professionals who sell their time.",
  },
};

export default function LandingPreviewPage() {
  return <LandingPage />;
}
