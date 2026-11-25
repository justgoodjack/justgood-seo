import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SEO + GEO Engine",
    short_name: "SEO + GEO",
    description: "Multi-site WordPress content engine",
    start_url: "/",
    display: "standalone",
    background_color: "#ecf0f3",
    theme_color: "#0d1b2e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
