import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

// Import lazily to avoid circular dep — resolved at runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _FigureImageView: any = null;
async function getView() {
  if (!_FigureImageView) {
    _FigureImageView = (await import("../FigureImageView")).default;
  }
  return _FigureImageView;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    figureImage: {
      setFigureImage: (attrs: { src: string; alt?: string }) => ReturnType;
    };
  }
}

export const FigureImage = Node.create({
  name: "figureImage",
  group: "block",
  content: "inline*",   // the caption lives here as inline text
  draggable: true,
  selectable: true,
  isolating: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure",
        getAttrs(dom) {
          const el = dom as HTMLElement;
          const img = el.querySelector("img");
          return {
            src: img?.getAttribute("src") ?? null,
            alt: img?.getAttribute("alt") ?? "",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      { class: "editor-figure" },
      ["img", mergeAttributes({ src: HTMLAttributes.src, alt: HTMLAttributes.alt })],
      ["figcaption", 0],
    ];
  },

  addCommands() {
    return {
      setFigureImage:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { src: attrs.src, alt: attrs.alt ?? "" },
            content: [],
          });
        },
    };
  },

  addNodeView() {
    // ReactNodeViewRenderer expects a synchronous component — we import
    // FigureImageView here directly (no lazy loading needed since this
    // file is already client-only via the editor).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const View = require("../FigureImageView").default;
    return ReactNodeViewRenderer(View);
  },
});
