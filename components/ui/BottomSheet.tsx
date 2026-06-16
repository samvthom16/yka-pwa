"use client";

export default function BottomSheet({
  onClose,
  zIndex = "z-50",
  children,
}: {
  onClose: () => void;
  zIndex?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`fixed inset-0 ${zIndex} flex items-end`} onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full bg-white rounded-t-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 bg-gray-200 rounded-full" />
        </div>
        {children}
      </div>
    </div>
  );
}
