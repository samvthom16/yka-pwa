"use client";

import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function FigureImageView({ node, selected }: any) {
  const isEmptyCaption = node.content.size === 0;

  return (
    <NodeViewWrapper
      as="figure"
      className={`
        editor-figure my-8 mx-0
        ${selected ? "figure-selected" : ""}
      `}
    >
      {/* Image */}
      <img
        src={node.attrs.src}
        alt={node.attrs.alt}
        draggable={false}
        className={`
          w-full rounded-md block
          transition-all duration-150
          ${selected ? "ring-2 ring-offset-2 ring-gray-900" : ""}
        `}
      />

      {/* Caption */}
      <figcaption className="relative mt-2.5 min-h-[1.5rem]">
        {/* Placeholder shown only when caption is empty */}
        {isEmptyCaption && (
          <span
            className="
              absolute inset-0 flex items-center justify-center
              text-sm text-gray-300 italic
              select-none pointer-events-none
            "
          >
            Add a caption…
          </span>
        )}
        <NodeViewContent
          className="
            text-sm text-center text-gray-500 italic
            outline-none leading-relaxed
          "
        />
      </figcaption>
    </NodeViewWrapper>
  );
}
