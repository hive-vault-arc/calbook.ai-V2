import { WEBAPP_URL } from "@calcom/lib/constants";
import type { MetadataRoute } from "next";

const baseUrl = WEBAPP_URL.replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
