import { createFileRoute } from "@tanstack/react-router";
import { EmailAuthPage } from "@/components/EmailAuthPage";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [
    { title: "Sign up — AI PLEX" },
    { name: "description", content: "Create your AI PLEX account with your name and verified email address." },
    { property: "og:title", content: "Sign up — AI PLEX" },
    { property: "og:description", content: "Join AI PLEX using your name and a secure email verification code." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <EmailAuthPage mode="signup" />,
});