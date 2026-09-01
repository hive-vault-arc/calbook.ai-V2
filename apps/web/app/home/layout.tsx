import PageWrapper from "@components/PageWrapperAppDir";
import { headers } from "next/headers";
import type { ReactElement, ReactNode } from "react";
import Shell from "~/shell/Shell";

export default async function HomeLayout({ children }: { children: ReactNode }): Promise<ReactElement> {
  const nonce = (await headers()).get("x-csp-nonce") ?? undefined;

  return (
    <PageWrapper requiresLicense={false} nonce={nonce}>
      <Shell withoutMain={true}>{children}</Shell>
    </PageWrapper>
  );
}
