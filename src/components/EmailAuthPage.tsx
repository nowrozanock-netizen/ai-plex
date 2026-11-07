import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AppHeader } from "@/components/AppHeader";
import { useAccount } from "@/components/AuthProvider";
import { codeSchema, emailCodeRequest } from "@/lib/auth-validation";

export function EmailAuthPage({ mode }: { mode: "signup" | "login" }) {
  const signup = mode === "signup";
  const navigate = useNavigate();
  const { user, loading } = useAccount();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => { if (!loading && user) void navigate({ to: "/", replace: true }); }, [user, loading, navigate]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async (event?: FormEvent) => {
    event?.preventDefault();
    if (busy || (sentEmail && cooldown > 0)) return;
    setError(""); setNotice("");
    const parsed = (() => {
      try { return emailCodeRequest(mode, sentEmail ?? email, name); }
      catch (e) { setError(e instanceof Error && "issues" in e ? (e as { issues: { message: string }[] }).issues[0]?.message ?? "Check your details." : "Check your details."); return null; }
    })();
    if (!parsed) return;
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOtp(parsed);
      if (authError) throw authError;
      setSentEmail(parsed.email); setCode(""); setCooldown(60);
      setNotice("Check your inbox and spam folder for your verification code.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your code. Please try again.");
    } finally { setBusy(false); }
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (!sentEmail || busy) return;
    const parsed = codeSchema.safeParse(code);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Enter your code."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const { data, error: authError } = await supabase.auth.verifyOtp({ email: sentEmail, token: parsed.data, type: "email" });
      if (authError) throw authError;
      if (!data.session) throw new Error("Verification didn't complete. Please request a new code.");
      await navigate({ to: "/", replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code couldn't be verified. Try again.");
    } finally { setBusy(false); }
  };

  return <div className="min-h-dvh">
    <AppHeader />
    <main className="mx-auto w-full max-w-sm px-5 py-10 sm:py-14">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Back to chat</Link>
      <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">{sentEmail ? <ShieldCheck className="size-6" /> : <Mail className="size-6" />}</div>
      <p className="brand-mark mb-2 text-lg">AI <span>PLEX</span></p>
      <h1 className="text-2xl font-bold">{sentEmail ? "Verify your email" : signup ? "Create your account" : "Welcome back"}</h1>
      {sentEmail && <p className="mt-3 break-words text-sm text-muted-foreground">Enter the six-digit code sent to <span className="text-foreground">{sentEmail}</span>.</p>}
      <form className="mt-7 space-y-5" onSubmit={sentEmail ? verify : sendCode}>
        {!sentEmail ? <>
          {signup && <div className="space-y-2"><label htmlFor="account-name" className="text-sm">Name</label><Input id="account-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} maxLength={100} required disabled={busy} className="h-11" placeholder="Your name" /></div>}
          <div className="space-y-2"><label htmlFor="account-email" className="text-sm">Email address</label><Input id="account-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={254} required disabled={busy} className="h-11" placeholder="you@example.com" /></div>
        </> : <div className="space-y-3"><label htmlFor="email-code" className="text-sm">Verification code</label><InputOTP id="email-code" aria-label="Verification code" autoComplete="one-time-code" inputMode="numeric" pattern={REGEXP_ONLY_DIGITS} maxLength={6} value={code} onChange={setCode} disabled={busy} autoFocus containerClassName="w-full"><InputOTPGroup className="w-full">{[0,1,2,3,4,5].map(index => <InputOTPSlot key={index} index={index} className="h-12 min-w-0 flex-1 text-xl" />)}</InputOTPGroup></InputOTP></div>}
        {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
        {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
        <Button type="submit" className="h-11 w-full" disabled={busy || (sentEmail !== null && code.length !== 6)}>{busy ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}{sentEmail ? "Verify and continue" : "Send verification code"}</Button>
      </form>
      {sentEmail ? <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><Button variant="link" className="px-0" disabled={busy || cooldown > 0} onClick={() => void sendCode()}>{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}</Button><Button variant="link" className="px-0 text-muted-foreground" disabled={busy} onClick={() => { setSentEmail(null); setCode(""); setError(""); setNotice(""); }}>Change email</Button></div> : <p className="mt-6 text-center text-sm text-muted-foreground">{signup ? "Already have an account?" : "New to AI PLEX?"} <Link to={signup ? "/auth" : "/signup"} className="text-primary">{signup ? "Log in" : "Sign up"}</Link></p>}
    </main>
  </div>;
}