"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import EditorHeader from "./EditorHeader";
import StatusBar from "./StatusBar";
import type { TipTapEditorHandle } from "./TipTapEditor";

const TipTapEditor = dynamic(() => import("./TipTapEditor"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse">
      <div className="h-5 w-3/4 bg-gray-100 rounded mb-4" />
      <div className="h-4 w-full bg-gray-100 rounded mb-2" />
      <div className="h-4 w-5/6 bg-gray-100 rounded mb-2" />
      <div className="h-4 w-4/6 bg-gray-100 rounded" />
    </div>
  ),
});

export default function WritingApp() {
  const editorRef = useRef<TipTapEditorHandle>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [focusMode, setFocusMode] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Auto-resize textarea to fit content */
  const resizeTitleArea = useCallback(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resizeTitleArea();
  }, [title, resizeTitleArea]);

  const handleEditorUpdate = useCallback(
    ({ wordCount, charCount }: { wordCount: number; charCount: number }) => {
      setWordCount(wordCount);
      setCharCount(charCount);
      setSaveStatus("saving");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus("saved"), 1500);
    },
    []
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setTitle(e.target.value);
      setSaveStatus("saving");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus("saved"), 1500);
    },
    []
  );

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        editorRef.current?.focus();
      }
    },
    []
  );

  return (
    <div
      className={`flex flex-col min-h-screen bg-white transition-all duration-300 ${
        focusMode ? "editor-focus-mode" : ""
      }`}
    >
      <EditorHeader
        title={title}
        focusMode={focusMode}
        saveStatus={saveStatus}
        editorRef={editorRef}
        onToggleFocusMode={() => setFocusMode((f) => !f)}
      />

      <main className="flex-1 w-full max-w-[720px] mx-auto px-6 pb-20 pt-12 md:px-8">
        {/* Post title — textarea auto-grows with content */}
        <textarea
          ref={titleRef}
          value={title}
          onChange={handleTitleChange}
          onKeyDown={handleTitleKeyDown}
          placeholder="Title"
          spellCheck
          rows={1}
          className={`
            w-full text-[2.5rem] md:text-[3rem] font-bold leading-tight tracking-tight
            text-gray-900 placeholder:text-gray-200
            outline-none border-none bg-transparent
            mb-10 resize-none overflow-hidden font-sans block
            transition-opacity duration-300
            ${focusMode ? "opacity-60 focus:opacity-100" : ""}
          `}
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        />

        {/* Editor body */}
        <TipTapEditor ref={editorRef} onUpdate={handleEditorUpdate} />
      </main>

      <StatusBar
        wordCount={wordCount}
        charCount={charCount}
        saveStatus={saveStatus}
        focusMode={focusMode}
      />
    </div>
  );
}
