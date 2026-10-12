import { HttpError } from "./http-error";
import type { RateLimitHelper } from "./rateLimit";
import { rateLimiter } from "./rateLimit";

export async function checkRateLimitAndThrowError({
  rateLimitingType = "core",
  identifier,
  onRateLimiterResponse,
  opts,
  failClosed,
}: RateLimitHelper) {
  const response = await rateLimiter()({ rateLimitingType, identifier, opts, failClosed });
  if (onRateLimiterResponse) onRateLimiterResponse(response);
  const { success, reset } = response;
  if (failClosed && reset === -1) {
    throw new HttpError({
      statusCode: 503,
      message: "Sign-in protection is temporarily unavailable. Please try again shortly.",
    });
  }
  if (!success) {
    const convertToSeconds = (ms: number) => Math.floor(ms / 1000);
    const secondsToWait = Math.max(0, convertToSeconds(reset - Date.now()));
    throw new HttpError({
      statusCode: 429,
      message: `Rate limit exceeded. Try again in ${secondsToWait} seconds.`,
    });
  }
  return response;
}
