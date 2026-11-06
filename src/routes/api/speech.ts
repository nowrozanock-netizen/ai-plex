import { createFileRoute } from "@tanstack/react-router";
import { handleSpeech } from "@/lib/ai.server";

export const Route = createFileRoute("/api/speech")({
  server: { handlers: { POST: ({ request }) => handleSpeech(request) } },
});
