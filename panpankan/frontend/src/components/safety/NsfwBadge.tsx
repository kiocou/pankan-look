import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { safetyCheckFilename } from "@/lib/tauri";

export interface NsfwBadgeProps {
  name: string;
  className?: string;
}

export function NsfwBadge({ name, className }: NsfwBadgeProps) {
  const [result, setResult] = useState<{ is_nsfw: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (result) return;
    setLoading(true);
    try {
      const r = await safetyCheckFilename(name);
      setResult(r);
    } catch {
      setResult({ is_nsfw: false });
    } finally {
      setLoading(false);
    }
  };

  if (!result && !loading) {
    // 首次 hover 才检查
    return (
      <span
        className={className}
        onMouseEnter={check}
      />
    );
  }

  if (loading) {
    return (
      <span className={className}>
        <Loader2 className="h-3 w-3 animate-spin" />
      </span>
    );
  }

  if (result?.is_nsfw) {
    return (
      <span className={`inline-flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400 ${className ?? ""}`}>
        <AlertTriangle className="h-3 w-3" />
        NSFW
      </span>
    );
  }
  return null;
}
