type BrowserLocation = Pick<Location, "assign" | "replace">;

export function navigateAfterLogin(url: string, browserLocation: BrowserLocation = window.location): void {
  // A server navigation ensures the newly issued session cookie cannot reuse the anonymous landing-page cache.
  browserLocation.assign(url);
}

export function navigateAfterEmailVerification(browserLocation: BrowserLocation = window.location): void {
  // The root server route decides whether the verified user needs onboarding or can enter the authenticated home.
  browserLocation.replace("/");
}
