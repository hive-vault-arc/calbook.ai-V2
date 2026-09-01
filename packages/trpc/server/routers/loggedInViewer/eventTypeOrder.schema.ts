import { z } from "zod";

export type TEventTypeOrderInputSchema = {
  ids: number[];
};

export const ZEventTypeOrderInputSchema: z.ZodType<TEventTypeOrderInputSchema> = z.object({
  ids: z
    .array(z.number())
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, { message: "Event type IDs must be unique." }),
});
