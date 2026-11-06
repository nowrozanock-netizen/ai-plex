import { useEffect, useRef, useState } from "react";
import { Volume2, Pause, Play, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";

function chunkText(text: string, max = 1200) {
  const clean = text.replace(/```[\s\S]*?```/g, " code block. ").replace(/[#*_`>|]/g, "").replace(/\s+/g, " ").trim();
  const sentences = clean.match(/[^.!?]+[.!?]*\s*/g) ?? [clean];
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > max && cur) {
      chunks.push(cur.trim());
      cur = "";
    }
    cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

async function fetchAudio(text: string, signal: AbortSignal) {
  const res = await fetch("/api/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal,
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? "Couldn't generate audio");
  }
  return URL.createObjectURL(await res.blob());
}

type State = "idle" | "loading" | "playing" | "paused";

export function SpeakControls({ text }: { text: string }) {
  const [state, setState] = useState<State>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setState("idle");
  };

  useEffect(() => stop, []);

  const play = async () => {
    stop();
    const ac = new AbortController();
    abortRef.current = ac;
    setState("loading");
    const chunks = chunkText(text);
    try {
      let next: Promise<string> | null = fetchAudio(chunks[0] ?? "", ac.signal);
      for (let i = 0; i < chunks.length; i++) {
        const url: string = await next!;
        next = i + 1 < chunks.length ? fetchAudio(chunks[i + 1] ?? "", ac.signal) : null;
        if (ac.signal.aborted) return;
        const audio = audioRef.current ?? new Audio();
        audioRef.current = audio;
        audio.src = url;
        await audio.play();
        setState("playing");
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error("Playback failed"));
          ac.signal.addEventListener("abort", () => resolve(), { once: true });
        });
        URL.revokeObjectURL(url);
        if (ac.signal.aborted) return;
      }
      setState("idle");
    } catch (e) {
      if (ac.signal.aborted) return;
      toast.error(e instanceof Error ? e.message : "Couldn't read this aloud");
      setState("idle");
    }
  };

  const pause = () => {
    audioRef.current?.pause();
    setState("paused");
  };
  const resume = () => {
    audioRef.current?.play();
    setState("playing");
  };

  if (state === "idle")
    return (
      <button className="chip" onClick={play} aria-label="Read aloud">
        <Volume2 className="size-4" /> Listen
      </button>
    );

  return (
    <div className="flex items-center gap-1">
      {state === "loading" && (
        <span className="chip" aria-live="polite">
          <Loader2 className="size-4 animate-spin" /> Preparing…
        </span>
      )}
      {state === "playing" && (
        <button className="chip chip-active" onClick={pause} aria-label="Pause">
          <Pause className="size-4" /> Pause
        </button>
      )}
      {state === "paused" && (
        <button className="chip chip-active" onClick={resume} aria-label="Resume">
          <Play className="size-4" /> Resume
        </button>
      )}
      <button className="chip" onClick={stop} aria-label="Stop">
        <Square className="size-4" /> Stop
      </button>
    </div>
  );
}
