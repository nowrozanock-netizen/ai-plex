import { describe, it, expect } from "vitest";
import { searchItems, type SavedItem } from "./offline-store";

const items: SavedItem[] = [
  { id: "1", question: "What is photosynthesis?", answer: "Plants make food", createdAt: 1 },
  { id: "2", question: "Capital of France", answer: "Paris", createdAt: 2 },
];

describe("offline library search", () => {
  it("matches question or answer text, case-insensitive", () => {
    expect(searchItems(items, "PARIS").map((i) => i.id)).toEqual(["2"]);
    expect(searchItems(items, "photo").map((i) => i.id)).toEqual(["1"]);
  });
  it("returns everything for an empty search", () => {
    expect(searchItems(items, "  ")).toHaveLength(2);
  });
});
