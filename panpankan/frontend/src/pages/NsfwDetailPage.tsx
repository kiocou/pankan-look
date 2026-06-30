import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Shield,
  ShieldOff,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  safetySetAutoHideNsfw,
  safetyGetAutoHideNsfw,
  safetyBlurSource,
  openWithMpv,
} from "@/lib/tauri";
import { useAppStore } from "@/stores";
import { formatFileSize } from "@/lib/tauri";
import { useProxiedImage } from "@/lib/image";

export function NsfwDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { nsfwLibrary } = useAppStore();
  const item = nsfwLibrary.find((it) => String(it.id) === id);

  const [autoHide, setAutoHide] = useState(true);
  const [blurredName, setBlurredName] = useState<string>("");
  const thumb = useProxiedImage(item?.thumbnail);

  useEffect(() => {
    safetyGetAutoHideNsfw().then(setAutoHide).catch(() => {});
  }, []);

  useEffect(() => {
    if (!item) return;
    safetyBlurSource(item.name).then((b) => setBlurredName(b));
  }, [item?.id]);

  if (!item) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> 返回
        </Button>
        <div className="mt-4 text-center text-muted-foreground">未找到该项目</div>
      </div>
    );
  }

  const toggleHide = async () => {
    const next = !autoHide;
    setAutoHide(next);
    await safetySetAutoHideNsfw(next).catch(() => {});
  };

  return (
    <div className="flex h-full flex-col overflow-auto">
      {/* 海报区 */}
      <div className="relative h-[400px] w-full overflow-hidden">
        {thumb ? (
          <img
            src={thumb}
            alt={item.name}
            className={"absolute inset-0 h-full w-full object-cover " + (autoHide ? "blur-2xl" : "")}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-destructive to-destructive/60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="relative z-10 -mt-32 px-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> 返回
        </Button>

        <div className="flex gap-6">
          {thumb && (
            <img
              src={thumb}
              alt={item.name}
              className={"h-72 w-48 shrink-0 rounded-lg object-cover shadow-2xl " + (autoHide ? "blur-md" : "")}
            />
          )}
          <div className="flex-1 text-white">
            <h1 className="text-2xl font-bold">
              {autoHide ? blurredName || "已打码" : item.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/80">
              <span className="rounded bg-destructive/80 px-2 py-0.5 text-white">NSFW</span>
              <span className="text-white/60">{formatFileSize(item.size)}</span>
              <span className="text-white/60">云盘: {item.provider_id}</span>
            </div>

            {/* 命中关键词 */}
            {item.matched_keywords.length > 0 && (
              <div className="mt-4">
                <div className="mb-1 text-xs text-white/60">命中关键词</div>
                <div className="flex flex-wrap gap-1">
                  {item.matched_keywords.map((k) => (
                    <span
                      key={k}
                      className="rounded bg-destructive/20 px-2 py-0.5 text-xs text-red-200"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 操作区 */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() =>
                  openWithMpv(item.provider_id, item.file_id).catch((e) =>
                    console.error("open mpv failed", e)
                  )
                }
              >
                <Play className="mr-2 h-5 w-5" /> 播放 (打码不影响播放)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={toggleHide}
              >
                {autoHide ? (
                  <Shield className="mr-2 h-3.5 w-3.5" />
                ) : (
                  <ShieldOff className="mr-2 h-3.5 w-3.5" />
                )}
                切换打码
              </Button>
            </div>

            {/* 安全提示 */}
            <div className="mt-6 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div>
                基于文件名启发式的 NSFW 检测仅作为辅助手段, 不替代专业内容审核。
                自动隐藏开启时, 海报 / 文件名会被打码; 播放时不影响实际视频内容。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
