import { redirect } from "next/navigation";

/**
 * Keep the product-facing home URL stable while the authenticated dashboard
 * remains organized around the event types view.
 */
export default function HomePage() {
  redirect("/event-types");
}
