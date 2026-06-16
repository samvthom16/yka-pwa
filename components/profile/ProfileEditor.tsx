"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { useAuth } from "@/hooks/useAuth";
import { useWpConfig } from "@/hooks/useWpConfig";
import LoginScreen from "@/components/auth/LoginScreen";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { getMyProfile, updateMyProfile } from "@/lib/api/wordpress";

export default function ProfileEditor() {
  const router = useRouter();
  const { user, isLoading: authLoading, login } = useAuth();
  const cfg = useWpConfig(user);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!cfg) return;
    setIsLoading(true);
    getMyProfile(cfg)
      .then((profile) => {
        setFirstName(profile.first_name ?? "");
        setLastName(profile.last_name ?? "");
        setBio(profile.description ?? "");
      })
      .finally(() => setIsLoading(false));
  }, [cfg]);

  const handleSave = useCallback(async () => {
    if (!cfg) return;
    setIsSaving(true);
    setSaveStatus("idle");
    setError("");
    try {
      await updateMyProfile(cfg, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        description: bio.trim(),
      });
      setSaveStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save. Please try again.");
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  }, [cfg, firstName, lastName, bio]);

  if (authLoading) return <LoadingScreen />;
  if (!user) return <LoginScreen onLogin={login} />;

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      {/* Header */}
      <header className="safe-top sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between h-14 px-5">
          <div className="flex items-center gap-2">
            <IconButton onClick={() => router.back()}>
              <ArrowLeft size={15} />
            </IconButton>
            <span className="text-sm font-semibold text-gray-900">Edit Profile</span>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex items-center gap-1.5 pl-4 pr-5 h-9 rounded-full text-sm font-medium bg-gray-900 text-white active:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <Loader2 size={13} className="animate-spin" />
            ) : saveStatus === "saved" ? (
              <Check size={13} />
            ) : null}
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      <main className="w-full max-w-[720px] mx-auto px-6 pt-8 pb-12 md:px-8">
        {isLoading ? (
          <div className="space-y-5 animate-pulse">
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="h-12 bg-gray-100 rounded-xl" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="h-12 bg-gray-100 rounded-xl" />
            <div className="h-4 w-16 bg-gray-100 rounded" />
            <div className="h-28 bg-gray-100 rounded-xl" />
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                First name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); setSaveStatus("idle"); }}
                placeholder="First name"
                className="w-full text-base text-gray-900 placeholder:text-gray-300 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-gray-400 transition-colors bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Last name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); setSaveStatus("idle"); }}
                placeholder="Last name"
                className="w-full text-base text-gray-900 placeholder:text-gray-300 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-gray-400 transition-colors bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => { setBio(e.target.value); setSaveStatus("idle"); }}
                placeholder="Tell readers a little about yourself…"
                rows={5}
                className="w-full text-base text-gray-900 placeholder:text-gray-300 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-gray-400 transition-colors bg-white resize-none"
              />
            </div>

            {saveStatus === "saved" && (
              <p className="text-sm text-green-600 flex items-center gap-1.5">
                <Check size={14} /> Profile saved
              </p>
            )}
            {saveStatus === "error" && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
