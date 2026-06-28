import { useState } from "react";
import { Shield, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  safetyCheckFilename,
  safetyBlurSource,
  safetySetAutoHideNsfw,
  safetyGetAutoHideNsfw,
} from "@/lib/tauri";
import { EmptyState } from "@/components/ui/EmptyState";

export function NsfwPage() {
  const [name, setName] = useState("");
  const [autoHide, setAutoHide] = useState(true);
  const [result, setResult] = useState<{ is_nsfw: boolean; keywords: string[] } | null>(null);
  const [blurred, setBlurred] = useState("");

  useEffectOnce(() => {
    safetyGetAutoHideNsfw().then(setAutoHide);
  });

  const check = async () => {
    if (!name) return;
    const r = await safetyCheckFilename(name);
    setResult({ is_nsfw: r.is_nsfw, keywords: r.matched_keywords });
    const b = await safetyBlurSource(name);
    setBlurred(b);
  };

  const toggleAutoHide = async () => {
    const next = !autoHide;
    setAutoHide(next);
    await safetySetAutoHideNsfw(next);
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">NSFW 内容检测</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            基于文件名 + 关键词启发式检测，演示用，不替代专业审核
          </p>
        </div>
        <Button variant={autoHide ? "default" : "outline"} onClick={toggleAutoHide}>
          {autoHide ? <Shield className="mr-2 h-4 w-4" /> : <ShieldOff className="mr-2 h-4 w-4" />}
          自动隐藏 NSFW: {autoHide ? "开" : "关"}
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <label className="text-sm font-medium">输入文件名测试</label>
        <div className="mt-2 flex gap-2">
          <input
            className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
            placeholder="例如: ABC-123 1080p.mkv"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button onClick={check} disabled={!name}>检测</Button>
        </div>

        {result && (
          <div className="mt-4 space-y-2">
            <div
              className={`rounded-md p-3 ${
                result.is_nsfw ? "bg-red-500/15 text-red-400" : "bg-green-500/15 text-green-400"
              }`}
            >
              {result.is_nsfw
                ? `⚠ NSFW: 命中关键词 ${result.keywords.join(", ")}`
                : "✓ 无 NSFW 关键词"}
            </div>
            {blurred && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <div className="text-xs text-muted-foreground">脱敏后:</div>
                <div>{blurred}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <EmptyState
        icon={<Shield className="h-10 w-10" />}
        title="关键词库"
        description={`JAV / FC2 / 1Pondo / HEYZO / Caribbean 等 ${12} 个家族关键词，命中后自动打码文件名`}
      />
    </div>
  );
}

// 简易 hooks
import { useEffect as useEffectOnce } from "react";
