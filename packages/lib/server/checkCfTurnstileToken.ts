import { HttpError } from "../http-error";

export const INVALID_CLOUDFLARE_TOKEN_ERROR = "Invalid cloudflare token";

export async function checkCfTurnstileToken({
  token,
  remoteIp,
  expectedAction,
  expectedHostname,
}: {
  token?: string;
  remoteIp: string;
  expectedAction?: string;
  expectedHostname?: string;
}) {
  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET;
  if (process.env.NEXT_PUBLIC_IS_E2E) return { success: true };
  if (!secret) {
    if (process.env.NEXT_PUBLIC_CLOUDFLARE_SITEKEY) {
      throw new HttpError({ statusCode: 503, message: "Verification unavailable" });
    }
    return { success: true };
  }

  if (!token || token.length > 2048) {
    throw new HttpError({ statusCode: 403, message: INVALID_CLOUDFLARE_TOKEN_ERROR });
  }

  try {
    const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: remoteIp }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!result.ok) throw new Error(`Turnstile siteverify returned ${result.status}`);

    const data: unknown = await result.json();
    if (
      typeof data !== "object" ||
      data === null ||
      !("success" in data) ||
      data.success !== true ||
      (expectedAction && (!("action" in data) || data.action !== expectedAction)) ||
      (expectedHostname && (!("hostname" in data) || data.hostname !== expectedHostname))
    ) {
      throw new Error("Turnstile siteverify rejected the token");
    }
    return { success: true };
  } catch {
    throw new HttpError({ statusCode: 403, message: INVALID_CLOUDFLARE_TOKEN_ERROR });
  }
}
