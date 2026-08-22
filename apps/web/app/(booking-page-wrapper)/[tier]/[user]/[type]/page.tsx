import { decodeParams } from "@lib/buildLegacyCtx";
import type { PageProps } from "app/_types";
import { notFound, redirect } from "next/navigation";
import type React from "react";

/**
 * R2.4: Canonical tier-link behavior.
 * /pro/jane/consultation → /jane/consultation?tier=pro
 * This route extracts the tier from the path segment and redirects
 * to the standard booking page with the tier as a query parameter.
 */
const ServerPage = async ({ params, searchParams }: PageProps): Promise<JSX.Element> => {
  const decodedParams = decodeParams(await params);
  const tier = decodedParams.tier;
  const user = decodedParams.user;
  const type = decodedParams.type;
  if (typeof tier !== "string" || typeof user !== "string" || typeof type !== "string") notFound();

  const queryString = new URLSearchParams();
  queryString.set("tier", tier);
  // Preserve any existing search params
  const sp = await searchParams;
  if (sp && typeof sp === "object") {
    for (const [key, value] of Object.entries(sp)) {
      if (key !== "tier" && typeof value === "string") {
        queryString.set(key, value);
      }
    }
  }

  redirect(`/${user}/${type}?${queryString.toString()}`);
};

export default ServerPage;
