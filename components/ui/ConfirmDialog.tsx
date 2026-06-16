"use client";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  loadingLabel,
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
  zIndex = "z-[60]",
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  loadingLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  zIndex?: string;
}) {
  if (!open) return null;
  return (
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm`}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-5">{message}</p>
        <div className="flex gap-3">
          {cancelLabel && onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 text-sm font-medium text-gray-700 border border-gray-200 py-2.5 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-40 ${
              destructive
                ? "text-white bg-red-500 hover:bg-red-600 active:bg-red-700"
                : "text-white bg-gray-900 hover:bg-gray-700 active:bg-gray-800"
            }`}
          >
            {loading && loadingLabel ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
