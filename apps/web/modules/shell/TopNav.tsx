import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { useIsStandalone } from "@calcom/lib/hooks/useIsStandalone";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Logo } from "@calcom/ui/components/logo";
import { SettingsIcon } from "@coss/ui/icons";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { KBarTrigger } from "./Kbar";
import { UserDropdown } from "./user-dropdown/UserDropdown";

export function TopNavContainer() {
  const { status } = useSession();
  const isStandalone = useIsStandalone();
  if (status !== "authenticated" || isStandalone) return null;
  return <TopNav />;
}

function TopNav() {
  const isEmbed = useIsEmbed();
  const { t } = useLocale();
  return (
    <nav
      style={isEmbed ? { display: "none" } : {}}
      className="sticky top-0 z-40 flex w-full items-center justify-between border-subtle border-b bg-cal-muted/50 px-4 py-1.5 backdrop-blur-lg sm:p-4 md:hidden">
      <Link href="/home">
        <Logo />
      </Link>
      <div className="flex items-center gap-2 self-center">
        <span className="group flex items-center rounded-full font-medium text-default text-sm transition hover:bg-cal-muted hover:text-emphasis lg:hidden">
          <KBarTrigger />
        </span>
        <button className="rounded-full p-1 text-muted transition hover:bg-cal-muted hover:text-subtle focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2">
          <span className="sr-only">{t("settings")}</span>
          <Link href="/settings/my-account/profile">
            <SettingsIcon className="h-4 w-4 text-default" />
          </Link>
        </button>
        <UserDropdown small />
      </div>
    </nav>
  );
}
