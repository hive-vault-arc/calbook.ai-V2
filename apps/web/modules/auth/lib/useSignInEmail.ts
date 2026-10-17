import { WEBAPP_URL } from "@calcom/lib/constants";
import { signIn } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

export function getEmailCooldown(sentAt: string | null, now = Date.now()): number {
  const timestamp = Number(sentAt);
  if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > now) return 0;
  return Math.max(0, Math.ceil((timestamp + 30_000 - now) / 1000));
}

export function useSignInEmail({
  email,
  username,
  autoSend = true,
}: {
  email?: string;
  username?: string;
  autoSend?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [sentAt, setSentAt] = useState<number>();
  const inFlight = useRef(false);
  const attempted = useRef<string>();

  const send = useCallback(async () => {
    if (!email || !username || inFlight.current) return;
    inFlight.current = true;
    setStatus("sending");
    try {
      const result = await signIn("email", {
        email: email.trim().toLowerCase(),
        username: username.trim().toLowerCase(),
        redirect: false,
        callbackUrl: WEBAPP_URL,
      });
      // NextAuth can return a successful HTTP response containing a CSRF sign-in redirect.
      const target = result?.url ? new URL(result.url, WEBAPP_URL) : undefined;
      if (
        !result?.ok ||
        result.error ||
        target?.pathname !== "/api/auth/verify-request" ||
        target.searchParams.get("provider") !== "email" ||
        target.searchParams.get("type") !== "email"
      ) {
        setStatus("error");
        return;
      }
      setSentAt(Date.now());
      setStatus("sent");
    } catch {
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }, [email, username]);

  useEffect(() => {
    if (!autoSend || !email || !username) return;
    const key = JSON.stringify([email, username]);
    if (attempted.current === key) return;
    attempted.current = key;
    void send();
  }, [autoSend, email, username, send]);

  return { status, sentAt, send };
}
