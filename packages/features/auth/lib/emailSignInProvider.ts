import EmailProvider from "next-auth/providers/email";

export const EMAIL_SIGN_IN_MAX_AGE_SECONDS = 10 * 60;

export function createEmailSignInProvider() {
  return EmailProvider({
    type: "email",
    maxAge: EMAIL_SIGN_IN_MAX_AGE_SECONDS,
    sendVerificationRequest: async (props) => (await import("./sendVerificationRequest")).default(props),
  });
}
