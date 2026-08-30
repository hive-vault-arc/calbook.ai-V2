import { getAppRegistry } from "@calcom/app-store/_appRegistry";
import prisma from "@calcom/prisma";
import type { AppCategories } from "@calcom/prisma/enums";
import { isCuratedRecruitmentIntegration } from "~/apps/curatedIntegrations";

export type CategoryDataProps = NonNullable<Awaited<ReturnType<typeof getStaticProps>>>;

export const getStaticProps = async (category: AppCategories) => {
  const appQuery = await prisma.app.findMany({
    where: {
      categories: {
        has: category,
      },
      enabled: true,
    },
    select: {
      slug: true,
    },
  });

  const dbAppsSlugs = appQuery.map((category) => category.slug);

  const appStore = await getAppRegistry();

  const apps = appStore.filter(
    (app) => dbAppsSlugs.includes(app.slug) && isCuratedRecruitmentIntegration(app.slug)
  );
  return {
    apps,
    category,
  };
};
