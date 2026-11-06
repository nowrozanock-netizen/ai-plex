import { useEffect, useState } from "react";
import { Download, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { SpeakControls } from "./SpeakControls";
import { isSaved, saveItem } from "@/lib/offline-store";

export function ResponseActions({
  id,
  question,
  answer,
  image,
}: {
  id: string;
  question: string;
  answer: string;
  image?: string | null;
}) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    isSaved(id).then(setSaved).catch(() => {});
  }, [id]);

  const save = async () => {
    try {
      await saveItem({ id, question, answer, image: image ?? null, createdAt: Date.now() });
      setSaved(true);
      toast.success("Saved to your offline library");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save offline");
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <SpeakControls text={answer} />
      <button className={saved ? "chip chip-active" : "chip"} onClick={save} disabled={saved}>
        {saved ? <Check className="size-4" /> : <Download className="size-4" />}
        {saved ? "Saved offline" : "Save Offline"}
      </button>
      <button
        className="chip"
        onClick={() => navigator.clipboard?.writeText(answer).then(() => toast.success("Copied"))}
      >
        <Copy className="size-4" /> Copy
      </button>
    </div>
  );
}
