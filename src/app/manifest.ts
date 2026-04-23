import type { MetadataRoute } from "next";

// Next auto-serves this as /manifest.webmanifest. Keeps the app installable
// as a lightweight PWA (home-screen icon, standalone display mode).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fantasy Survivor",
    short_name: "Fantasy Survivor",
    description:
      "Run a Fantasy Survivor league: snake draft, per-episode scoring, live leaderboard.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
