import { Link } from "@tanstack/react-router";
import { Library, MessageSquare } from "lucide-react";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link to="/" className="brand-mark text-lg">
          AI <span>PLEX</span>
        </Link>
        <nav className="flex gap-1">
          <Link to="/" className="chip" activeProps={{ className: "chip chip-active" }} activeOptions={{ exact: true }}>
            <MessageSquare className="size-4" /> Chat
          </Link>
          <Link to="/library" className="chip" activeProps={{ className: "chip chip-active" }}>
            <Library className="size-4" /> Library
          </Link>
        </nav>
      </div>
    </header>
  );
}
