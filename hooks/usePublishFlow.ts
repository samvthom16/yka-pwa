"use client";

import { RefObject, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createPost, updatePost, uploadMedia } from "@/lib/api/wordpress";
import type { WPConfig } from "@/lib/api/wordpress";
import type { WPUser } from "@/lib/api/auth";
import type { PublishStatus, PublishTarget } from "@/components/editor/EditorHeader";
import type { TipTapEditorHandle } from "@/components/editor/TipTapEditor";

function dataUrlToFile(dataUrl: string, index: number): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const ext = mime.split("/")[1] ?? "png";
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], `image-${index + 1}.${ext}`, { type: mime });
}

async function uploadContentImages(html: string, cfg: WPConfig): Promise<string> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const imgs = Array.from(doc.querySelectorAll("img[src^='data:']"));
  await Promise.all(
    imgs.map(async (img, i) => {
      const src = img.getAttribute("src")!;
      const file = dataUrlToFile(src, i);
      const media = await uploadMedia(cfg, file, img.getAttribute("alt") ?? undefined);
      img.setAttribute("src", media.source_url);
    })
  );
  return doc.body.innerHTML;
}

export function usePublishFlow({
  user,
  cfg,
  title,
  thumbnailFileRef,
  thumbnail,
  editorRef,
  clearDraft,
  isEditMode,
  postId,
  originalStatus,
}: {
  user: WPUser | null;
  cfg: WPConfig | null;
  title: string;
  thumbnailFileRef: RefObject<File | null>;
  thumbnail: string | null;
  editorRef: RefObject<TipTapEditorHandle | null>;
  clearDraft: () => Promise<void>;
  isEditMode: boolean;
  postId?: number;
  originalStatus: "publish" | "draft" | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [publishStatus, setPublishStatus] = useState<PublishStatus>("idle");
  const [publishTarget, setPublishTarget] = useState<PublishTarget>(null);
  const [publishError, setPublishError] = useState("");
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);

  const handlePublish = useCallback(
    async (targetStatus: "publish" | "draft", confirmed = false) => {
      if (!user || !cfg) return;

      if (targetStatus === "draft" && isEditMode && originalStatus === "publish" && !confirmed) {
        setShowUnpublishConfirm(true);
        return;
      }

      const html = editorRef.current?.getHTML() ?? "";
      const plainText = html.replace(/<[^>]*>/g, "").trim();

      if (!title.trim()) {
        setPublishError("Please add a title before saving.");
        setPublishStatus("error");
        return;
      }
      if (!plainText) {
        setPublishError("The article has no content. Write something before saving.");
        setPublishStatus("error");
        return;
      }

      setPublishStatus("publishing");
      setPublishTarget(targetStatus);
      setPublishError("");

      try {
        let featuredMediaId: number | undefined;
        if (thumbnailFileRef.current) {
          const media = await uploadMedia(cfg, thumbnailFileRef.current);
          featuredMediaId = media.id;
        } else if (isEditMode && thumbnail === null) {
          featuredMediaId = 0;
        }

        const uploadedHtml = await uploadContentImages(html, cfg);

        if (isEditMode) {
          await updatePost(cfg, postId!, {
            title: title.trim(),
            content: uploadedHtml,
            status: targetStatus,
            ...(featuredMediaId !== undefined && { featured_media: featuredMediaId }),
          });
        } else {
          await createPost(cfg, {
            title: title.trim(),
            content: uploadedHtml,
            status: targetStatus,
            ...(featuredMediaId !== undefined && { featured_media: featuredMediaId }),
          });
          await clearDraft();
        }

        await queryClient.invalidateQueries({ queryKey: ["posts"] });
        await queryClient.invalidateQueries({ queryKey: ["post-counts"] });

        router.push("/");
      } catch (err) {
        setPublishError(err instanceof Error ? err.message : "Save failed. Try again.");
        setPublishStatus("error");
        setPublishTarget(null);
      }
    },
    [user, cfg, title, thumbnail, editorRef, thumbnailFileRef, clearDraft, isEditMode, postId, queryClient, originalStatus]
  );

  const dismissPublish = useCallback(() => {
    setPublishStatus("idle");
    setPublishTarget(null);
  }, []);

  return {
    publishStatus,
    publishTarget,
    publishError,
    showUnpublishConfirm,
    setShowUnpublishConfirm,
    handlePublish,
    dismissPublish,
  };
}
