"use client";

import { useEffect, useState } from "react";

interface WpImageProps {
  src: string;
  auth: string;
  className?: string;
  alt?: string;
}

export default function WpImage({ src, auth, className, alt = "" }: WpImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;

    fetch(`/api/media?url=${encodeURIComponent(src)}`, {
      headers: { "x-wp-auth": auth },
    })
      .then((r) => r.blob())
      .then((blob) => {
        if (cancelled) return;
        blobUrl = URL.createObjectURL(blob);
        setObjectUrl(blobUrl);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [src, auth]);

  if (!objectUrl) return <div className={`${className ?? ""} bg-gray-100`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={objectUrl} alt={alt} className={className} />;
}
