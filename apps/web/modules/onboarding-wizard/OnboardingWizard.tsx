"use client";

import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Input } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import type { ReactElement } from "react";
import { useState } from "react";

type Step = "organization" | "branding" | "invite" | "complete";

const stepOrder: Step[] = ["organization", "branding", "invite", "complete"];

export function OnboardingWizard(): ReactElement {
  const utils = trpc.useUtils();
  const [step, setStep] = useState<Step>("organization");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [brandColor, setBrandColor] = useState("#e8a317");
  const [invites, setInvites] = useState<Array<{ email: string; name: string }>>([{ email: "", name: "" }]);

  const slugCheck = trpc.viewer.organizations.checkSlug.useQuery(
    { slug },
    { enabled: slug.length >= 2, refetchOnWindowFocus: false }
  );
  const createOrg = trpc.viewer.organizations.create.useMutation({
    onSuccess: async (data) => {
      setStep("complete");
      await utils.viewer.organizations.checkSlug.invalidate();
      showToast(
        data.skippedInviteEmails.length > 0
          ? `Organization created. Could not invite: ${data.skippedInviteEmails.join(", ")}`
          : "Organization created!",
        data.skippedInviteEmails.length > 0 ? "warning" : "success"
      );
    },
    onError: (error) => showToast(error.message, "error"),
  });

  const slugAvailable = slugCheck.data === true;
  const slugValid = /^[a-zA-Z0-9-]+$/.test(slug) && slug.length >= 2;

  function handleSlugChange(value: string) {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  }

  function addInvite() {
    setInvites([...invites, { email: "", name: "" }]);
  }

  function removeInvite(index: number) {
    setInvites(invites.filter((_, i) => i !== index));
  }

  function updateInvite(index: number, field: "email" | "name", value: string) {
    setInvites(invites.map((inv, i) => (i === index ? { ...inv, [field]: value } : inv)));
  }

  const validInvites = invites.filter((inv) => inv.email.includes("@"));

  function handleSubmit() {
    createOrg.mutate({
      name,
      slug,
      bio: bio || undefined,
      brandColor,
      startTrial: true,
      invitedMembers: validInvites.map((inv) => ({
        email: inv.email,
        name: inv.name || undefined,
      })),
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {stepOrder.map((s, i) => {
          const currentIndex = stepOrder.indexOf(step);
          const isActive = s === step;
          const isDone = stepOrder.indexOf(s) < currentIndex;
          return (
            <div key={s} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand text-brand-inverted"
                    : isDone
                      ? "bg-success text-success"
                      : "bg-subtle text-subtle"
                }`}>
                {isDone ? <Icon name="check" className="h-4 w-4" /> : i + 1}
              </div>
              {i < 3 && <div className={`h-0.5 w-12 ${isDone ? "bg-success" : "bg-subtle"}`} />}
            </div>
          );
        })}
      </div>

      <div className="border-subtle bg-default rounded-2xl border p-6 shadow-sm">
        {step === "organization" && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-emphasis text-xl font-bold">Name your organization</h2>
              <p className="text-subtle mt-1 text-sm">
                This is how your team will identify your CalBook workspace.
              </p>
            </div>
            <label className="block">
              <span className="text-emphasis text-sm font-medium">Organization name</span>
              <Input
                className="mt-1.5"
                placeholder="Acme Recruiting"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-emphasis text-sm font-medium">URL slug</span>
              <div className="mt-1.5">
                <Input
                  placeholder="acme-recruiting"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                />
              </div>
              {slug.length >= 2 && (
                <p className={`mt-1 text-xs ${slugAvailable ? "text-success" : "text-error"}`}>
                  {slugAvailable
                    ? "✓ Available"
                    : slugValid
                      ? "✗ Already taken"
                      : "Only letters, numbers, and hyphens"}
                </p>
              )}
            </label>
            <label className="block">
              <span className="text-emphasis text-sm font-medium">Description (optional)</span>
              <Input
                className="mt-1.5"
                placeholder="A brief description of your organization"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </label>
            <Button
              color="primary"
              className="w-full"
              disabled={!name.trim() || !slugAvailable}
              onClick={() => setStep("branding")}>
              Continue
            </Button>
          </div>
        )}

        {step === "branding" && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-emphasis text-xl font-bold">Customize your brand</h2>
              <p className="text-subtle mt-1 text-sm">Choose colors that represent your organization.</p>
            </div>
            <label className="block">
              <span className="text-emphasis text-sm font-medium">Brand color</span>
              <div className="mt-1.5 flex items-center gap-3">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-subtle"
                />
                <Input
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </label>
            <div className="bg-subtle/50 rounded-xl p-4">
              <p className="text-subtle mb-2 text-xs">Preview</p>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-white font-bold"
                  style={{ background: brandColor }}>
                  {name.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-emphasis font-semibold">{name || "Your Organization"}</p>
                  <p className="text-subtle text-sm">{slug || "your-slug"}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button color="minimal" variant="button" onClick={() => setStep("organization")}>
                Back
              </Button>
              <Button color="primary" className="flex-1" onClick={() => setStep("invite")}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === "invite" && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-emphasis text-xl font-bold">Invite your team</h2>
              <p className="text-subtle mt-1 text-sm">
                Add team members to collaborate on candidates and interviews.
              </p>
            </div>
            {invites.map((invite, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="name@example.com"
                  value={invite.email}
                  onChange={(e) => updateInvite(index, "email", e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Name (optional)"
                  value={invite.name}
                  onChange={(e) => updateInvite(index, "name", e.target.value)}
                  className="flex-1"
                />
                {invites.length > 1 && (
                  <button onClick={() => removeInvite(index)} className="text-subtle hover:text-error px-2">
                    <Icon name="x" className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addInvite}
              className="text-brand-default flex items-center gap-1 text-sm font-medium">
              <Icon name="plus" className="h-4 w-4" /> Add another
            </button>
            <div className="flex gap-2">
              <Button color="minimal" variant="button" onClick={() => setStep("branding")}>
                Back
              </Button>
              <Button
                color="primary"
                className="flex-1"
                disabled={createOrg.isPending}
                onClick={handleSubmit}>
                {createOrg.isPending ? "Creating…" : "Create organization"}
              </Button>
            </div>
            <p className="text-subtle text-center text-xs">
              You can skip invites and add team members later.
            </p>
          </div>
        )}

        {step === "complete" && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success">
              <Icon name="check" className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-emphasis text-xl font-bold">You're all set!</h2>
            <p className="text-subtle text-sm">
              Your organization <strong className="text-emphasis">{name}</strong> has been created. You have a
              14-day Pro trial — explore all features freely.
            </p>
            <div className="space-y-2">
              <Button color="primary" className="w-full" onClick={() => (window.location.href = "/home")}>
                Go to dashboard
              </Button>
              <Button
                color="minimal"
                variant="button"
                className="w-full"
                onClick={() => (window.location.href = "/recruiting/pipeline")}>
                Set up your interview pipeline
              </Button>
              <Button
                color="minimal"
                variant="button"
                className="w-full"
                onClick={() => (window.location.href = "/settings/my-account/billing")}>
                Manage billing
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
