import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HifzDeen",
    short_name: "HifzDeen",
    description:
      "An immersive memorization and recitation coach built with Quran.Foundation APIs.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0f0e",
    theme_color: "#0b0f0e",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/maskable-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}

