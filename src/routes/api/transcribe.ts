import { createFileRoute } from "@tanstack/react-router";
import { handleTranscribe } from "@/lib/ai.server";

export const Route = createFileRoute("/api/transcribe")({
  server: { handlers: { POST: ({ request }) => handleTranscribe(request) } },
});
