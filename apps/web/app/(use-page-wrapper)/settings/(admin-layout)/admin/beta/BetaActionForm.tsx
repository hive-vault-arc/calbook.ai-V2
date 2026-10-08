"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import type { ReactNode } from "react";
import { useState } from "react";

export function BetaActionForm({
  action,
  children,
  label,
  className,
}: {
  action: (data: FormData) => Promise<void>;
  children: ReactNode;
  label: string;
  className?: string;
}) {
  const { t } = useLocale();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <form
      className={className}
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        const data = new FormData(event.currentTarget);
        setPending(true);
        setFailed(false);
        try {
          await action(data);
        } catch {
          setFailed(true);
        } finally {
          setPending(false);
        }
      }}>
      {children}
      <div className="self-end">
        <Button type="submit" loading={pending} disabled={pending}>
          {label}
        </Button>
      </div>
      {failed ? (
        <p role="alert" className="text-error text-sm">
          {t("beta_action_failed")}
        </p>
      ) : null}
    </form>
  );
}
