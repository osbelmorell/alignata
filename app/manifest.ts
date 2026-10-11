import type { MetadataRoute } from "next";

/** Web app manifest (app icon, Oct 10 2026): purple squircle A with the coral check crossbar. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Alignata",
    short_name: "Alignata",
    description: "Small tools for busy people, and AI techniques in plain English.",
    start_url: "/",
    display: "standalone",
    theme_color: "#5B4FCF",
    background_color: "#FDFAF5",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
