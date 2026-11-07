import { createFileRoute } from "@tanstack/react-router";
import { EmailAuthPage } from "@/components/EmailAuthPage";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Log in — AI PLEX" },
    { name: "description", content: "Log in to AI PLEX with a verification code sent to your email." },
    { property: "og:title", content: "Log in — AI PLEX" },
    { property: "og:description", content: "Access your AI PLEX account with secure email verification." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <EmailAuthPage mode="login" />,
});