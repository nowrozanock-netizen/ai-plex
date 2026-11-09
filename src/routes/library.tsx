import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Search, Trash2, ArrowLeft, BookmarkX } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { SpeakControls } from "@/components/SpeakControls";
import { deleteItem, listItems, searchItems, type SavedItem } from "@/lib/offline-store";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Offline Library — AI PLEX" },
      { name: "description", content: "Your saved AI PLEX answers, available without internet." },
      { property: "og:title", content: "Offline Library — AI PLEX" },
      { property: "og:description", content: "Your saved AI PLEX answers, available without internet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const [items, setItems] = useState<SavedItem[] | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<SavedItem | null>(null);

  useEffect(() => {
    listItems()
      .then(setItems)
      .catch(() => {
        toast.error("Couldn't open your offline library");
        setItems([]);
      });
  }, []);

  const filtered = useMemo(() => searchItems(items ?? [], q), [items, q]);

  const remove = async (id: string) => {
    if (!confirm("Delete this saved answer?")) return;
    try {
      await deleteItem(id);
      setItems((xs) => (xs ?? []).filter((x) => x.id !== id));
      if (open?.id === id) setOpen(null);
      toast.success("Deleted");
    } catch {
      toast.error("Couldn't delete");
    }
  };

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-6 pb-[max(env(safe-area-inset-bottom),24px)]">
        {open ? (
          <article>
            <button className="chip mb-4" onClick={() => setOpen(null)}>
              <ArrowLeft className="size-4" /> Back
            </button>
            <p className="text-xs text-muted-foreground">{new Date(open.createdAt).toLocaleString()}</p>
            <h1 className="mt-1 text-xl font-semibold">{open.question || "Saved answer"}</h1>
            {open.image && <img src={open.image} alt="Attached" className="mt-3 max-h-64 rounded-2xl" />}
            <div className="prose-ai mt-4">
              <ReactMarkdown>{open.answer}</ReactMarkdown>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <SpeakControls text={open.answer} />
              <button className="chip" onClick={() => remove(open.id)}>
                <Trash2 className="size-4" /> Delete
              </button>
            </div>
          </article>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Offline Library</h1>
            <p className="text-sm text-muted-foreground">Saved answers stay on this device — no internet needed.</p>
            <label className="composer mt-5 flex items-center gap-2 px-4 py-3">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search saved answers"
                className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </label>
            {items === null ? (
              <p className="mt-8 text-center text-muted-foreground">Loading…</p>
            ) : filtered.length === 0 ? (
              <div className="mt-16 flex flex-col items-center text-center text-muted-foreground">
                <BookmarkX className="mb-3 size-10" />
                <p>{items.length ? "No matches." : "Nothing saved yet."}</p>
                {!items.length && (
                  <Link to="/" className="chip mt-4">
                    Start a chat
                  </Link>
                )}
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {filtered.map((it) => (
                  <li key={it.id} className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
                    <div className="flex gap-3">
                      <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(it)}>
                        <p className="truncate font-semibold">{it.question || "Saved answer"}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{it.answer.replace(/[#*`_>]/g, "")}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{new Date(it.createdAt).toLocaleDateString()}</p>
                      </button>
                      <button className="icon-btn" onClick={() => remove(it.id)} aria-label="Delete">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
