import { decodeParams } from "@lib/buildLegacyCtx";
import type { PageProps } from "app/_types";
import { redirect } from "next/navigation";
import type React from "react";

/**
 * R2.4: Canonical tier-link behavior for embeds.
 * /pro/jane/consultation/embed → /jane/consultation/embed?tier=pro
 */
const ServerPage = async ({ params, searchParams }: PageProps): Promise<JSX.Element> => {
  const decodedParams = decodeParams(await params);
  const tier = decodedParams.tier;
  const user = decodedParams.user;
  const type = decodedParams.type;

  const queryString = new URLSearchParams();
  queryString.set("tier", tier);
  const sp = await searchParams;
  if (sp && typeof sp === "object") {
    for (const [key, value] of Object.entries(sp)) {
      if (key !== "tier" && typeof value === "string") {
        queryString.set(key, value);
      }
    }
  }

  redirect(`/${user}/${type}/embed?${queryString.toString()}`);
};

export default ServerPage;
