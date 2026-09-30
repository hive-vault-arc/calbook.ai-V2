import { trpc } from "../trpc";

type UseEmailVerifyCheckOptions = {
  enabled?: boolean;
};

export function useEmailVerifyCheck({ enabled = true }: UseEmailVerifyCheckOptions = {}) {
  const emailCheck = trpc.viewer.me.shouldVerifyEmail.useQuery(undefined, {
    enabled,
    refetchInterval: enabled ? 4000 : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry(failureCount) {
      return failureCount < 3;
    },
  });

  return emailCheck;
}

export default useEmailVerifyCheck;
