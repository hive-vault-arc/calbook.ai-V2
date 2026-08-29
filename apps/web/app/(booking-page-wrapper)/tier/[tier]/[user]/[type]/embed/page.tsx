import { decodeParams } from "@lib/buildLegacyCtx";
import type { PageProps } from "app/_types";
import { notFound, redirect } from "next/navigation";

const ServerPage = async ({ params, searchParams }: PageProps): Promise<JSX.Element> => {
  const decodedParams = decodeParams(await params);
  const tier = decodedParams.tier;
  const user = decodedParams.user;
  const type = decodedParams.type;
  if (typeof tier !== "string" || typeof user !== "string" || typeof type !== "string") notFound();

  const queryString = new URLSearchParams({ tier });
  const sp = await searchParams;
  if (sp && typeof sp === "object") {
    for (const [key, value] of Object.entries(sp)) {
      if (key !== "tier" && typeof value === "string") queryString.set(key, value);
    }
  }

  redirect(`/${user}/${type}/embed?${queryString.toString()}`);
};

export default ServerPage;
