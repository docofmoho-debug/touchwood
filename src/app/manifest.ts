import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Touchwood",
    short_name: "Touchwood",
    description: "Touchwood Furniture",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icon1.jpg",
        sizes: "192x192",
        type: "image/jpg",
      },
      {
        src: "/icon2.jpg",
        sizes: "512x512",
        type: "image/jpg",
      },{
        src: "/favicon.ico",
        sizes: "any",
       
      },
    ],
  };
}