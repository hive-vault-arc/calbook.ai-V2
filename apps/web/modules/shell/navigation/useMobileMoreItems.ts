import { useSession } from "next-auth/react";
import { getPublicPageUrl } from "../getPublicPageUrl";
import { useBottomNavItems } from "../useBottomNavItems";
import type { NavigationItemType } from "./NavigationItem";

export function useMobileMoreItems(): NavigationItemType[] {
  const { data: session } = useSession();
  const user = session?.user;
  const publicPageUrl = getPublicPageUrl(user?.orgAwareUsername, user?.username);

  const bottomNavItems = useBottomNavItems({
    publicPageUrl,
  });

  const filteredBottomNavItems = bottomNavItems.filter(
    (item: NavigationItemType) => item.name !== "settings"
  );
  return filteredBottomNavItems;
}
