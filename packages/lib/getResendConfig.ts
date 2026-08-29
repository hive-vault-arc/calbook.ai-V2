import process from "node:process";
export function getResendApiKey(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.RESEND_API_KEY || env.NEXT_RESEND_API_KEY;
}

export function getResendFromAddress(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.RESEND_FROM || env.EMAIL_FROM;
}
