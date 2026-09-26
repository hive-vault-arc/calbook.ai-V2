import { randomBytes } from "node:crypto";
import process from "node:process";
import { APP_NAME, IS_MAILHOG_ENABLED } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { IS_GOOGLE_LOGIN_ENABLED } from "../server/lib/constants";
import { test } from "./lib/fixtures";
import { getEmailsReceivedByUser } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

const preventFlakyTest = async (page: Page) => {
  await expect(page.locator("text=Create your account")).toBeVisible();
};

const selectRecruitingWorkspace = async (page: Page) => {
  await page.getByTestId("signup-workspace-recruiting").click();
};

test.describe("Signup Main Page Test", async () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
    await preventFlakyTest(page);
  });

  test("Continue with Email button must exist / work", async ({ page }) => {
    const button = page.getByTestId("continue-with-email-button");
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await button.click();
    await expect(page.getByTestId("signup-back-button")).toBeVisible();
    await expect(page.getByTestId("signup-workspace-recruiting")).toBeVisible();
    await expect(page.getByTestId("signup-workspace-scheduling")).toBeVisible();
  });

  test("Continue with google button must exist / work", async ({ page }) => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(!IS_GOOGLE_LOGIN_ENABLED, "It should only run if Google Login is installed");
    const button = page.getByTestId("continue-with-google-button");
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await button.click();
    await page.waitForURL("/auth/sso/google");
  });
});

test.describe("Email verification handoff", () => {
  test("shows a sign-in action after an email is confirmed in another session", async ({ page }) => {
    await page.goto("/auth/verify-email?verified=1");

    await expect(page.getByTestId("verify-email-page")).toBeVisible();
    await expect(page.getByText("Email confirmed")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in to continue" })).toBeVisible();
  });
});

test.describe("Email Signup Flow Test", async () => {
  test.beforeEach(async ({ features }) => {
    features.reset(); // This resets to the initial state not an empt yarray
  });
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });
  test("Username is taken", async ({ page, users }) => {
    // log in trail user
    await test.step("Sign up", async () => {
      await users.create({
        username: "pro",
      });

      await page.goto("/signup");
      await preventFlakyTest(page);
      const continueWithEmailButton = page.getByTestId("continue-with-email-button");
      await expect(continueWithEmailButton).toBeVisible();
      await continueWithEmailButton.click();
      await selectRecruitingWorkspace(page);

      const alertMessage = "Username or email is already taken";

      // Fill form
      await page.locator('input[name="username"]').fill("pro");
      await page.locator('input[name="email"]').fill("pro@example.com");
      await page.locator('input[name="password"]').fill("Password99!");

      // Submit form
      const submitButton = page.getByTestId("signup-submit-button");
      await submitButton.click();

      const alert = await page.waitForSelector('[data-testid="alert"]');
      const alertMessageInner = await alert.innerText();

      expect(alertMessage).toBeDefined();
      expect(alertMessageInner).toContain(alertMessageInner);
    });
  });
  test("Email is taken", async ({ page, users }) => {
    // log in trail user
    await test.step("Sign up", async () => {
      const user = await users.create({
        username: "pro",
      });

      await page.goto("/signup");
      await preventFlakyTest(page);
      const continueWithEmailButton = page.getByTestId("continue-with-email-button");
      await expect(continueWithEmailButton).toBeVisible();
      await continueWithEmailButton.click();
      await selectRecruitingWorkspace(page);

      const alertMessage = "Username or email is already taken";

      // Fill form
      await page.locator('input[name="username"]').fill("randomuserwhodoesntexist");
      await page.locator('input[name="email"]').fill(user.email);
      await page.locator('input[name="password"]').fill("Password99!");

      // Submit form
      const submitButton = page.getByTestId("signup-submit-button");
      await submitButton.click();

      const alert = await page.waitForSelector('[data-testid="alert"]');
      const alertMessageInner = await alert.innerText();

      expect(alertMessage).toBeDefined();
      expect(alertMessageInner).toContain(alertMessageInner);
    });
  });

  test("Signup with valid (non premium) username", async ({ page, users }) => {
    const userToCreate = users.buildForSignup({
      username: "rick-jones",
      password: "Password99!",
      // Email intentonally kept as different from username
      email: `rickjones${Math.random()}-${Date.now()}@example.com`,
    });

    await page.goto("/signup");
    await preventFlakyTest(page);
    const continueWithEmailButton = page.getByTestId("continue-with-email-button");
    await expect(continueWithEmailButton).toBeVisible();
    await continueWithEmailButton.click();
    await selectRecruitingWorkspace(page);

    // Fill form
    await page.locator('input[name="username"]').fill(userToCreate.username);
    await page.locator('input[name="email"]').fill(userToCreate.email);
    await page.locator('input[name="password"]').fill(userToCreate.password);

    // Submit form
    const submitButton = page.getByTestId("signup-submit-button");
    await submitButton.click();

    await page.waitForURL("/auth/verify-email**");

    // Check that the URL matches the expected URL
    expect(page.url()).toContain("/auth/verify-email");
    await expect(page.getByTestId("verify-email-page")).toBeVisible();
    await expect(page.getByRole("button", { name: "Resend email" })).toBeVisible();
    const dbUser = await prisma.user.findUnique({ where: { email: userToCreate.email } });
    // Verify that the username is the same as the one provided and isn't accidentally changed to email derived username - That happens only for organization member signup
    expect(dbUser?.username).toBe(userToCreate.username);
    expect(dbUser?.metadata).toMatchObject({ workspaceType: "recruiting" });
  });

  test("Signup fields prefilled with query params", async ({ page, users: _users }) => {
    const signupUrlWithParams = "/signup?username=rick-jones&email=rick-jones%40example.com";
    await page.goto(signupUrlWithParams);
    await preventFlakyTest(page);
    const continueWithEmailButton = page.getByTestId("continue-with-email-button");
    await expect(continueWithEmailButton).toBeVisible();
    await continueWithEmailButton.click();
    await expect(page.getByTestId("signup-submit-button")).toBeVisible();

    // Fill form
    const usernameInput = page.locator('input[name="username"]');
    const emailInput = page.locator('input[name="email"]');

    expect(await usernameInput.inputValue()).toBe("rick-jones");
    expect(await emailInput.inputValue()).toBe("rick-jones@example.com");
  });
  test("Email verification sent if enabled", async ({ page, prisma, emails, users, features }) => {
    const EmailVerifyFlag = features.get("email-verification")?.enabled;

    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(!EmailVerifyFlag || !IS_MAILHOG_ENABLED, "Skipping check - Email verify disabled");
    // Ensure email verification before testing (TODO: this could break other tests but we can fix that later)
    await prisma.feature.update({
      where: { slug: "email-verification" },
      data: { enabled: true },
    });
    const userToCreate = users.buildForSignup({
      email: users.trackEmail({ username: "email-verify", domain: "example.com" }),
      username: "email-verify",
      password: "Password99!",
    });

    await page.goto("/signup");
    await preventFlakyTest(page);
    const continueWithEmailButton = page.getByTestId("continue-with-email-button");
    await expect(continueWithEmailButton).toBeVisible();
    await continueWithEmailButton.click();
    await selectRecruitingWorkspace(page);

    // Fill form
    await page.locator('input[name="username"]').fill(userToCreate.username);
    await page.locator('input[name="email"]').fill(userToCreate.email);
    await page.locator('input[name="password"]').fill(userToCreate.password);

    // Submit form
    const submitButton = page.getByTestId("signup-submit-button");
    await submitButton.click();

    await page.waitForURL((url) => url.pathname.includes("/auth/verify-email"));
    // Find the newly created user and add it to the fixture store
    const newUser = await users.set(userToCreate.email);
    expect(newUser).not.toBeNull();

    const receivedEmails = await getEmailsReceivedByUser({
      emails,
      userEmail: userToCreate.email,
    });

    expect(receivedEmails?.total).toBe(1);

    const verifyEmail = receivedEmails?.items[0];
    expect(verifyEmail?.subject).toBe(`${APP_NAME}: Confirm your email`);
  });
  test("Checkbox for cookie consent does not need to be checked", async ({ page, users: _users }) => {
    await page.goto("/signup");
    await preventFlakyTest(page);

    // Navigate to email form
    await page.getByTestId("continue-with-email-button").click();
    await selectRecruitingWorkspace(page);

    // Fill form
    await page.locator('input[name="username"]').fill("pro");
    await page.locator('input[name="email"]').fill("pro@example.com");
    await page.locator('input[name="password"]').fill("Password99!");

    const submitButton = page.getByTestId("signup-submit-button");
    const checkbox = page.getByTestId("signup-cookie-content-checkbox");

    await checkbox.check();
    await expect(submitButton).toBeEnabled();

    // the cookie consent checkbox does not need to be checked for user to proceed
    await checkbox.uncheck();
    await expect(submitButton).toBeEnabled();
  });
});
