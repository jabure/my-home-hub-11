import { createFileRoute } from "@tanstack/react-router";
import { getWeatherConfig } from "@/lib/gallery-fs";

export const Route = createFileRoute("/api/weather-config")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(JSON.stringify(getWeatherConfig()), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
