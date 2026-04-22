# YKA PWA Editor — Session Notes
> Generated: 2026-04-22

---

## Project

A production-grade, distraction-free PWA writing tool that publishes to WordPress via REST API. Styled after Medium/Notion's minimal writing experience.

**GitHub:** https://github.com/samvthom16/yka-pwa
**Dev server:** `npm run dev` → http://localhost:3010
**Working dir:** `C:\Users\LH Media\ClaudeCode\yka-app-new`

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.4 — App Router, no `src/` dir |
| Editor | TipTap v3 (`^3.22.4`) |
| Styling | Tailwind CSS v4 (CSS-based config — no `tailwind.config.js`) |
| Language | TypeScript strict |
| State | React hooks only (no Redux / Zustand) |
| Offline storage | IndexedDB via `idb` |
| Sanitization | DOMPurify |

---

## File Map

```
app/
  layout.tsx            PWA metadata, Geist font, viewport config
  page.tsx              Server component — renders <WritingApp /> directly
  globals.css           TipTap prose styles, heading margins, figure/figcaption, animations

components/editor/
  WritingApp.tsx        Full-screen shell: auto-resize title textarea, save state, focus mode toggle
  TipTapEditor.tsx      Core editor (forwardRef exposes getHTML / getJSON / focus)
  BubbleMenuBar.tsx     Dark pill formatting toolbar — appears on text selection
  SlashCommandMenu.tsx  "/" command palette with arrow-key + Enter navigation
  EditorHeader.tsx      Sticky top bar: brand, save indicator, focus mode, preview modal, HTML export, Publish
  StatusBar.tsx         Fixed footer: word count, char count, reading time, save status
  FigureImageView.tsx   React NodeView — <figure><img> + editable <figcaption> with placeholder
  extensions/
    FigureImage.ts      Custom TipTap Node (content: "inline*") + setFigureImage command

hooks/
  useDraft.ts           IndexedDB draft persistence (save / load / clear)

lib/api/
  wordpress.ts          createPost / updatePost / uploadMedia — WP REST API with App Password auth

utils/
  htmlExport.ts         sanitizeHTML (DOMPurify) + buildStandaloneHTML + downloadHTML trigger

public/
  manifest.json         PWA manifest (standalone display, icons placeholders)
```

---

## TipTap v3 — Key API Differences from v2

These caught us during the build and are non-obvious:

1. **`BubbleMenu` is NOT in `@tiptap/react`.**
   It moved to `@tiptap/extension-bubble-menu` and is a TipTap *Extension*, not a React component.
   → We implemented it manually: `onSelectionUpdate` → `requestAnimationFrame` → `window.getSelection().getRangeAt(0).getBoundingClientRect()` → `position: fixed` React element.

2. **`immediatelyRender: false` is required.**
   Pass it to `useEditor(...)` or TipTap throws a hydration mismatch error on SSR.

3. **`NodeViewContent` only accepts `as="div"`.**
   Cannot use `as="figcaption"`. Wrap with a native `<figcaption>` HTML element and put `<NodeViewContent>` (div) inside it.

4. **`CharacterCount` storage values are functions.**
   Call as `editor.storage.characterCount.words()` and `.characters()` — not plain properties.

5. **`ssr: false` in Server Components is blocked.**
   Next.js 16 App Router rejects `dynamic(..., { ssr: false })` in Server Components.
   → Import client components directly from server pages; they carry their own `"use client"` boundary.

---

## Feature Implementation Details

| Feature | How it works |
|---|---|
| **Slash menu** | `onUpdate` checks `$from.parent.textContent.startsWith('/')` → fixed-position dropdown |
| **Bubble toolbar** | `onSelectionUpdate` + `rAF` + native selection rect → fixed-position dark pill |
| **Image + caption** | `FigureImage` custom node, `setFigureImage` command, React NodeView with editable figcaption |
| **Title wrapping** | `<textarea rows={1} resize-none overflow-hidden>` + `el.style.height = el.scrollHeight + "px"` |
| **Focus mode** | `.editor-focus-mode` CSS class dims non-focused blocks; header/footer fade via opacity |
| **HTML export** | `editor.getHTML()` → DOMPurify → standalone `.html` blob download |
| **Preview modal** | Full-screen overlay renders title + `dangerouslySetInnerHTML` with same prose CSS |
| **Autosave indicator** | Debounced 1500 ms timer: `"saving"` → `"saved"` |

---

## WordPress Integration

**Status:** API client is fully wired — publishing UI not yet built.

- **Auth:** HTTP Basic using [Application Passwords](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/) (built into WP 5.6+)
- **Endpoints used:**
  - `POST   /wp-json/wp/v2/posts`  → create post
  - `PUT    /wp-json/wp/v2/posts/:id` → update post
  - `POST   /wp-json/wp/v2/media`  → upload image
- **Next step:** Build a `PublishModal` component that collects `siteUrl / username / appPassword`, persists them (localStorage or env), and calls `lib/api/wordpress.ts`.

---

## Bugs Fixed This Session

| Bug | Fix |
|---|---|
| `BubbleMenu` import error (TipTap v3) | Replaced with custom selection-tracking implementation |
| SSR hydration mismatch | Added `immediatelyRender: false` to `useEditor` |
| `ssr: false` blocked in Server Component | Changed `app/page.tsx` to import `WritingApp` directly |
| Long title overflows on mobile (preview) | Added `break-words` + `overflow-x-hidden` to preview modal |
| Title doesn't wrap to next line | Replaced `<input>` with auto-resizing `<textarea>` |
| Heading margin-bottom too tight | Changed from `-0.25rem` to `0.5 × line-height` in `em` units |
| `NodeViewContent as="figcaption"` type error | Wrapped NodeViewContent in native `<figcaption>` element |
