"use client";

interface StatusBarProps {
  wordCount: number;
  charCount: number;
  saveStatus: "saved" | "saving" | "unsaved";
  focusMode: boolean;
}

function plural(n: number, word: string) {
  return `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
}

export default function StatusBar({
  wordCount,
  charCount,
  saveStatus,
  focusMode,
}: StatusBarProps) {
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <footer
      className={`
        fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-4
        h-9 px-6 bg-white/80 backdrop-blur-sm border-t border-gray-100
        text-[11px] text-gray-400 transition-opacity duration-400
        ${focusMode ? "opacity-0 hover:opacity-100" : "opacity-100"}
      `}
    >
      <span>{plural(wordCount, "word")}</span>
      <Dot />
      <span>{plural(charCount, "character")}</span>
      <Dot />
      <span>{readingTime} min read</span>
      <Dot />
      <span
        className={
          saveStatus === "saved"
            ? "text-green-500"
            : saveStatus === "saving"
              ? "text-gray-400"
              : "text-amber-500"
        }
      >
        {saveStatus === "saved"
          ? "All changes saved"
          : saveStatus === "saving"
            ? "Saving…"
            : "Unsaved changes"}
      </span>
    </footer>
  );
}

function Dot() {
  return <span className="text-gray-200">·</span>;
}
