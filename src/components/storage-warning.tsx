import type { StorageWarning as StorageWarningValue } from "../lib/progress-storage";

export function StorageWarning({ warning }: { warning: StorageWarningValue | null }) {
  if (!warning) {
    return null;
  }

  return (
    <p
      className="rounded-xl border border-amber-300/50 bg-amber-300/10 px-4 py-3 text-base text-amber-100"
      role="status"
    >
      {warning.message}
    </p>
  );
}
