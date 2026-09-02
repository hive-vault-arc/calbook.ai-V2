import type { Metadata } from "next";
import { LandingPage } from "~/marketing/LandingPage";

export const metadata: Metadata = {
  title: "Interview Scheduling Software for Recruitment Teams | CalBook.ai",
  description:
    "Create interview templates, coordinate calendars, and give candidates a polished self-scheduling experience with CalBook.ai.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Interview scheduling without the back-and-forth | CalBook.ai",
    description: "A focused interview scheduling workflow for recruitment teams and candidates.",
  },
};

export default function LandingPreviewPage() {
  return <LandingPage />;
}
