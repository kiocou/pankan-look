import { useEffect } from "react";
import { Play, Clock, ChevronRight, Film } from "lucide-react";
import { useAppStore } from "@/stores";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useNavigate } from "react-router-dom";
import { ProxiedImage } from "@/lib/image";
import { openWithMpv } from "@/lib/tauri";

export function HomePage() {
  const navigate = useNavigate();
  const {
    providers,
    activeProviderId,
    recentHistory,
    continueWatching,
    library,
    loadProviders,
    loadHistory,
    loadLibrary,
  } = useAppStore();

  useEffect(() => {
    loadProviders();
    loadHistory();
    loadLibrary();
  }, [loadProviders, loadHistory, loadLibrary]);

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-6">
      {/* Hero —— 跟随主题品牌色：dark 下从主红到深红，light 下从主蓝到深蓝 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/50 p-8 text-primary-foreground shadow-2xl">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl font-bold">盘盘看</h1>
          <p className="mt-2 text-lg text-white/90">
            桌面云媒体中心 · 海报墙 · 最强画质 MPV 播放
          </p>
          <div className="mt-6 flex gap-3">
            <Button
              variant="secondary"
              className="bg-white/90 text-black hover:bg-white"
              onClick={() => navigate("/browser")}
            >
              <Film className="mr-2 h-4 w-4" />
              浏览云盘
            </Button>
            <Button
              variant="outline"
              className="border-white/40 bg-white/10 text-white hover:bg-white/20"
              onClick={() => navigate("/library")}
            >
              查看媒体库
            </Button>
          </div>
        </div>
      </div>

      {/* Provider 状态 */}
      {providers.length === 0 ? (
        <EmptyState
          icon={<Film className="h-12 w-12" />}
          title="还没有云盘"
          description="先去设置里添加一个光鸭云盘、OpenList 或 WebDAV 吧"
          action={
            <Button onClick={() => navigate("/settings")}>添加云盘</Button>
          }
        />
      ) : (
        <>
          {/* 继续观看 */}
          {continueWatching.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <Play className="h-5 w-5 text-primary" />
                  继续观看
                </h2>
                <Button variant="ghost" size="sm" onClick={() => navigate("/browser")}>
                  查看全部 <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {continueWatching.slice(0, 6).map((h) => (
                  <button
                    key={h.id}
                    onClick={() =>
                      openWithMpv(h.provider_id, h.path).catch((e) =>
                        console.error("open mpv failed", e)
                      )
                    }
                    className="group overflow-hidden rounded-lg border bg-card text-left transition-all hover:scale-105 hover:border-primary/50"
                  >
                    <div className="relative aspect-video overflow-hidden bg-muted">
                      {h.thumbnail ? (
                        <ProxiedImage src={h.thumbnail} alt={h.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                          <Play className="h-8 w-8" />
                        </div>
                      )}
                      {h.duration > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(h.position / h.duration) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="truncate text-sm font-medium">{h.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round(h.position)} / {Math.round(h.duration)} 秒
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 最近观看 */}
          {recentHistory.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
                <Clock className="h-5 w-5 text-primary" />
                最近观看
              </h2>
              <div className="rounded-lg border bg-card">
                {recentHistory.slice(0, 10).map((h) => (
                  <button
                    key={h.id}
                    onClick={() =>
                      openWithMpv(h.provider_id, h.path).catch((e) =>
                        console.error("open mpv failed", e)
                      )
                    }
                    className="flex w-full items-center gap-3 border-b px-4 py-3 text-left text-sm last:border-b-0 hover:bg-accent"
                  >
                    <div className="flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                      {h.thumbnail ? (
                        <ProxiedImage src={h.thumbnail} className="h-full w-full object-cover" />
                      ) : (
                        <Film className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 truncate">{h.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.updated_at).toLocaleString("zh-CN")}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 媒体库 */}
          {library.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-semibold">媒体库</h2>
                <Button variant="ghost" size="sm" onClick={() => navigate("/library")}>
                  查看全部 <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {library.slice(0, 8).map((it) => (
                  <button
                    key={it.id}
                    onClick={() => navigate("/library")}
                    className="group flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-all hover:scale-105"
                  >
                    <div className="relative aspect-[2/3] overflow-hidden bg-muted">
                      {it.poster ? (
                        <ProxiedImage src={it.poster} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary to-primary/50">
                          <Film className="h-8 w-8 text-primary-foreground/80" />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="truncate text-xs font-medium">{it.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {activeProviderId && (
        <div className="rounded-md border bg-card/50 p-3 text-xs text-muted-foreground">
          当前云盘: <span className="font-medium text-foreground">{activeProviderId}</span>
        </div>
      )}
    </div>
  );
}
