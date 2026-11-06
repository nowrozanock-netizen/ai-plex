import { useRef, useState } from "react";
import { Mic, Loader2, Square } from "lucide-react";
import { toast } from "sonner";

export function MicButton({ onText, disabled }: { onText: (t: string) => void; disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "recording" | "working">("idle");
  const recRef = useRef<MediaRecorder | null>(null);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Voice input isn't supported on this device.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Please allow microphone access to use voice input.");
      return;
    }
    const mime = ["audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const parts: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const type = ((rec.mimeType || "audio/webm").split(";")[0] ?? "audio/webm").replace("video/", "audio/");
      const blob = new Blob(parts, { type });
      if (blob.size < 1000) {
        setState("idle");
        toast.message("Didn't catch that — hold on a little longer.");
        return;
      }
      setState("working");
      try {
        const fd = new FormData();
        fd.append("file", new File([blob], `speech.${type.split("/")[1]}`, { type }));
        const res = await fetch("/api/transcribe", { method: "POST", body: fd });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error ?? "Transcription failed");
        if (!j.text) toast.message("No speech detected.");
        else onText(j.text);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Transcription failed");
      } finally {
        setState("idle");
      }
    };
    recRef.current = rec;
    rec.start();
    setState("recording");
  };

  const stop = () => recRef.current?.state === "recording" && recRef.current.stop();

  return (
    <button
      type="button"
      className={state === "recording" ? "icon-btn icon-btn-live" : "icon-btn"}
      onClick={state === "recording" ? stop : start}
      disabled={disabled || state === "working"}
      aria-label={state === "recording" ? "Stop recording" : "Speak your question"}
    >
      {state === "working" ? (
        <Loader2 className="size-5 animate-spin" />
      ) : state === "recording" ? (
        <Square className="size-5" />
      ) : (
        <Mic className="size-5" />
      )}
    </button>
  );
}
