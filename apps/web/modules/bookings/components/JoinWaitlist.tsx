"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { EmailInput, TextField } from "@calcom/ui/components/form";
import { useState } from "react";

type JoinWaitlistProps = {
  eventTypeId: number;
  slotTime: string;
  slotEndTime?: string;
  tier?: string;
};

export function JoinWaitlist({ eventTypeId, slotTime, slotEndTime, tier }: JoinWaitlistProps) {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinMutation = trpc.viewer.slots.joinWaitlist.useMutation({
    onSuccess: () => {
      setJoined(true);
      setError(null);
    },
    onError: (err: { message: string }) => {
      setError(err.message);
    },
  });

  const leaveMutation = trpc.viewer.slots.leaveWaitlist.useMutation({
    onSuccess: () => {
      setJoined(false);
      setEmail("");
      setName("");
    },
  });

  if (joined) {
    return (
      <div className="mt-4 flex flex-col items-center gap-3 p-4">
        <Alert severity="neutral" title={t("waitlist_joined_success")} />
        <Button
          color="minimal"
          onClick={() => leaveMutation.mutate({ eventTypeId, slotUtcStartDate: slotTime, email })}
          loading={leaveMutation.isPending}>
          {t("leave_waitlist")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3 p-4">
      <p className="text-default text-sm">{t("no_slots_available_waitlist")}</p>
      {error && <Alert severity="error" title={error} />}
      <TextField
        label={t("name")}
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("your_name")}
      />
      <EmailInput
        label={t("email")}
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("your_email")}
        required
      />
      <Button
        color="primary"
        onClick={() =>
          joinMutation.mutate({
            eventTypeId,
            slotUtcStartDate: slotTime,
            slotUtcEndDate: slotEndTime,
            tier,
            email,
            name,
          })
        }
        loading={joinMutation.isPending}
        disabled={!email}>
        {t("join_waitlist")}
      </Button>
    </div>
  );
}
