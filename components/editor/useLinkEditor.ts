"use client";

import { useCallback, useState } from "react";
import type { Editor } from "@tiptap/react";

// Prepend https:// only when the URL has no scheme at all
const normalizeUrl = (url: string) =>
  /^[a-z][a-z\d+\-.]*:/i.test(url) ? url : `https://${url}`;

/**
 * Shared link-editing state for BubbleMenuBar and MobileFormattingSheet.
 * Pass `focus: true` when the toolbar should re-focus the editor after applying
 * (BubbleMenuBar), or `false` when focus restoration is managed externally
 * via onPointerDown + preventDefault (MobileFormattingSheet).
 */
export function useLinkEditor(editor: Editor, { focus = false } = {}) {
  const [linkMode, setLinkMode] = useState(false);
  const [linkInput, setLinkInput] = useState("");

  const openLink = useCallback(() => {
    setLinkInput(editor.getAttributes("link").href ?? "");
    setLinkMode(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    const url = linkInput.trim();
    if (url) {
      const chain = editor.chain();
      if (focus) chain.focus();
      chain.setLink({ href: normalizeUrl(url) }).run();
    } else {
      const chain = editor.chain();
      if (focus) chain.focus();
      chain.unsetLink().run();
    }
    setLinkMode(false);
    setLinkInput("");
  }, [editor, linkInput, focus]);

  const cancelLink = useCallback(() => {
    setLinkMode(false);
    setLinkInput("");
  }, []);

  return { linkMode, linkInput, setLinkInput, openLink, applyLink, cancelLink };
}
