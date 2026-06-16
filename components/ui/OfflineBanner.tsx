"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const handleOffline = () => setOffline(true);
    const handleOnline = () => setOffline(false);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[500] flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white text-sm font-medium"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <WifiOff size={14} className="flex-shrink-0" />
      <span>You&rsquo;re offline — drafts still save locally</span>
    </div>
  );
}
