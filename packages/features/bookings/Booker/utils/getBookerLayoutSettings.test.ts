import { BookerLayouts, defaultBookerLayoutSettings } from "@calcom/prisma/zod-utils";
import { describe, expect, it } from "vitest";
import { getBookerLayoutSettings } from "./getBookerLayoutSettings";

describe("getBookerLayoutSettings", () => {
  const configuredLayouts = {
    defaultLayout: BookerLayouts.WEEK_VIEW,
    enabledLayouts: [BookerLayouts.MONTH_VIEW, BookerLayouts.WEEK_VIEW, BookerLayouts.COLUMN_VIEW],
  };

  it("forces normal public booking pages to month view", () => {
    expect(
      getBookerLayoutSettings({
        profileBookerLayouts: configuredLayouts,
        isEmbed: false,
      })
    ).toEqual({
      defaultLayout: BookerLayouts.MONTH_VIEW,
      enabledLayouts: [BookerLayouts.MONTH_VIEW],
    });
  });

  it("uses month view when the public profile has no layout configuration", () => {
    expect(getBookerLayoutSettings({ profileBookerLayouts: null, isEmbed: false })).toEqual({
      defaultLayout: BookerLayouts.MONTH_VIEW,
      enabledLayouts: [BookerLayouts.MONTH_VIEW],
    });
  });

  it("preserves configured layouts for embeds", () => {
    expect(
      getBookerLayoutSettings({
        profileBookerLayouts: configuredLayouts,
        isEmbed: true,
      })
    ).toEqual(configuredLayouts);
  });

  it("uses the upstream defaults for embeds without profile settings", () => {
    expect(getBookerLayoutSettings({ profileBookerLayouts: undefined, isEmbed: true })).toEqual(
      defaultBookerLayoutSettings
    );
  });
});
