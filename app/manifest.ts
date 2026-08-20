import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Two-Up Booth",
    short_name: "Two-Up",
    description: "A private, in-browser photo booth for two.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1b1620",
    theme_color: "#1b1620",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
