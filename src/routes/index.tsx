import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Camera, ImageIcon, ArrowUp, X, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { MicButton } from "@/components/MicButton";
import { ResponseActions } from "@/components/ResponseActions";
import { initNotifications, notifyReady, pickImage } from "@/lib/native";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI PLEX — Ask with text, voice or photos" },
      { name: "description", content: "Chat with AI PLEX using text, your voice or your camera. Listen to answers and save them offline." },
      { property: "og:title", content: "AI PLEX — Ask with text, voice or photos" },
      { property: "og:description", content: "Chat with AI using text, voice or photos. Listen to answers and save them offline." },
    ],
  }),
  component: ChatPage,
});

type Msg = { id: string; role: "user" | "assistant"; content: string; image?: string; done?: boolean; error?: boolean };

const SUGGESTIONS = ["Explain quantum computing simply", "Plan a 3-day trip to Lisbon", "What's in this photo?"];

function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const choose = async (src: "camera" | "gallery") => {
    try {
      const d = await pickImage(src);
      if (d) setImage(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't open the camera");
    }
  };

  const send = async (text = input) => {
    const content = text.trim();
    if ((!content && !image) || busy) return;
    void initNotifications();
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: content || "Analyze this image.", image: image ?? undefined };
    const aiId = crypto.randomUUID();
    const history = [...messages.filter((m) => !m.error), userMsg];
    setMessages([...messages, userMsg, { id: aiId, role: "assistant", content: "" }]);
    setInput("");
    setImage(null);
    setBusy(true);
    const ac = new AbortController();
    abortRef.current = ac;
    let full = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, content, image }) => ({ role, content, image })) }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Something went wrong. Please try again.");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += dec.decode(value, { stream: true });
        setMessages((ms) => ms.map((m) => (m.id === aiId ? { ...m, content: full } : m)));
      }
      if (!full.trim()) throw new Error("No answer came back. Please try again.");
      setMessages((ms) => ms.map((m) => (m.id === aiId ? { ...m, done: true } : m)));
      void notifyReady(full);
    } catch (e) {
      if (ac.signal.aborted) {
        setMessages((ms) => ms.map((m) => (m.id === aiId ? { ...m, done: !!full.trim(), content: full || "Stopped." , error: !full.trim()} : m)));
      } else {
        const msg = navigator.onLine === false ? "You're offline. Saved answers are still in your Library." : e instanceof Error ? e.message : "Something went wrong.";
        setMessages((ms) => ms.map((m) => (m.id === aiId ? { ...m, content: msg, error: true } : m)));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const questionFor = (idx: number) => {
    for (let i = idx - 1; i >= 0; i--) if (messages[i].role === "user") return messages[i];
    return undefined;
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-44 pt-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center pt-16 text-center">
            <div className="mb-6 inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground" style={{ boxShadow: "var(--shadow-glow)" }}>
              <Sparkles className="size-7" />
            </div>
            <h1 className="text-3xl font-bold sm:text-4xl">What can I help with?</h1>
            <p className="mt-2 text-muted-foreground">Type, speak, or snap a photo.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => (s.includes("photo") ? choose("gallery") : send(s))}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={m.id} className="bubble-user">
                  {m.image && <img src={m.image} alt="Your upload" className="mb-2 max-h-64 rounded-2xl" />}
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              ) : (
                <div key={m.id}>
                  {m.content ? (
                    <div className={m.error ? "text-destructive" : "prose-ai"}>
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex gap-1 py-2" aria-label="AI is thinking">
                      {[0, 1, 2].map((d) => (
                        <span key={d} className="size-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${d * 120}ms` }} />
                      ))}
                    </div>
                  )}
                  {m.done && !m.error && (
                    <ResponseActions id={m.id} question={questionFor(i)?.content ?? ""} image={questionFor(i)?.image} answer={m.content} />
                  )}
                </div>
              ),
            )}
            <div ref={endRef} />
          </div>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background to-transparent px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-6">
        <div className="composer mx-auto max-w-3xl p-2">
          {image && (
            <div className="relative mb-2 ml-2 inline-block">
              <img src={image} alt="Selected" className="h-20 rounded-xl" />
              <button className="absolute -right-2 -top-2 rounded-full bg-secondary p-1" onClick={() => setImage(null)} aria-label="Remove image">
                <X className="size-3.5" />
              </button>
            </div>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Ask AI PLEX anything…"
            className="max-h-40 w-full resize-none bg-transparent px-3 py-2 text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center gap-1">
            <button className="icon-btn" onClick={() => choose("camera")} aria-label="Take a photo">
              <Camera className="size-5" />
            </button>
            <button className="icon-btn" onClick={() => choose("gallery")} aria-label="Choose from gallery">
              <ImageIcon className="size-5" />
            </button>
            <MicButton disabled={busy} onText={(t) => setInput((v) => (v ? `${v} ${t}` : t))} />
            <div className="flex-1" />
            {busy ? (
              <button className="send-btn" onClick={() => abortRef.current?.abort()} aria-label="Stop">
                <Square className="size-4" />
              </button>
            ) : (
              <button className="send-btn" onClick={() => send()} disabled={!input.trim() && !image} aria-label="Send">
                <ArrowUp className="size-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
