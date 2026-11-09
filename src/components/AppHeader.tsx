import { Link, useNavigate } from "@tanstack/react-router";
import { Library, MessageSquare, LogOut, UserRound, Coins } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useCredits } from './CreditProvider';

export function AppHeader() {
  const { user, loading } = useAccount();
  const credits = useCredits();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const signOut = async () => {
    setSigningOut(true);
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await navigate({ to: "/auth", replace: true });
    } catch { toast.error("Couldn't log out. Please try again."); }
    finally { setSigningOut(false); }
  };
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex min-h-14 max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-2">
        <Link to="/" className="brand-mark text-lg">
          AI <span>PLEX</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link to="/" className="chip" activeProps={{ className: "chip chip-active" }} activeOptions={{ exact: true }}>
            <MessageSquare className="size-4" /> Chat
          </Link>
          <Button variant="ghost" size="sm" className="chip" onClick={() => credits.setOpen(true)} aria-label="Credits">
            <Coins className="size-4" /> Credits <span className="tabular-nums">{credits.data?.balance ?? '…'}</span>
          </Button>
          <Link to="/library" className="chip" activeProps={{ className: "chip chip-active" }}>
            <Library className="size-4" /> Library
          </Link>
          {!loading && (user ? <>
            <span className="hidden max-w-28 truncate px-2 text-xs text-muted-foreground sm:block">{typeof user.user_metadata['name'] === "string" ? user.user_metadata['name'] : "My account"}</span>
            <Button variant="ghost" size="icon" title="Log out" aria-label="Log out" disabled={signingOut} onClick={() => void signOut()}><LogOut /></Button>
          </> : <Button asChild variant="ghost" size="sm"><Link to="/auth"><UserRound /> Log in</Link></Button>)}
        </nav>
      </div>
    </header>
  );
}
