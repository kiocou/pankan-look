import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Star,
  Calendar,
  Layers,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/stores";
import {
  libraryGetSeriesEpisodes,
  parseEpisodeFilename,
  searchMetadata,
  dbSaveMediaMeta,
  openWithMpv,
} from "@/lib/tauri";
import type { FileItem } from "@/lib/tauri";
import { ProxiedImage } from "@/lib/image";

interface EpisodeInfo {
  file: FileItem;
  season: number | null;
  episode: number | null;
}

export function MediaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { library } = useAppStore();
  const item = library.find((l) => String(l.id) === id);

  // ============ 剧集 (series) 状态 ============
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [episodesError, setEpisodesError] = useState<string | null>(null);

  // ============ 元数据拉取 ============
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaMessage, setMetaMessage] = useState<string | null>(null);

  // series: 并发拉取所有 source_folders 的剧集
  useEffect(() => {
    if (!item || item.kind !== "series") return;
    let alive = true;
    setLoadingEpisodes(true);
    setEpisodesError(null);

    const folders = item.source_folders ?? [];
    if (folders.length === 0) {
      setLoadingEpisodes(false);
      setEpisodesError("未配置剧集目录, 无法列出剧集");
      return;
    }

    (async () => {
      try {
        const allFiles: FileItem[] = [];
        const seen = new Set<string>();
        // 串行, 避免对同一 provider 频繁并发
        for (const sf of folders) {
          const list = await libraryGetSeriesEpisodes(sf.provider_id, sf.folder_id);
          for (const f of list) {
            if (!seen.has(f.id)) {
              seen.add(f.id);
              allFiles.push(f);
            }
          }
        }
        // 解析每集的 season/episode
        const parsed: EpisodeInfo[] = await Promise.all(
          allFiles.map(async (f) => {
            try {
              const r = await parseEpisodeFilename(f.name);
              return { file: f, season: r.season, episode: r.episode };
            } catch {
              return { file: f, season: null, episode: null };
            }
          })
        );
        if (!alive) return;
        // 排序: season 升序, 同 season episode 升序, 缺失放最后
        parsed.sort((a, b) => {
          const sa = a.season ?? 9999;
          const sb = b.season ?? 9999;
          if (sa !== sb) return sa - sb;
          const ea = a.episode ?? 9999;
          const eb = b.episode ?? 9999;
          return ea - eb;
        });
        setEpisodes(parsed);
        // 默认选第 1 季
        const seasons = Array.from(
          new Set(parsed.map((e) => e.season ?? -1))
        ).sort((a, b) => a - b);
        const firstRealSeason = seasons.find((s) => s !== -1) ?? null;
        setSelectedSeason(firstRealSeason === -1 ? null : firstRealSeason);
      } catch (e) {
        if (alive) setEpisodesError(String(e));
      } finally {
        if (alive) setLoadingEpisodes(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [item]);

  const seasons = useMemo(() => {
    const set = new Set<number | -1>();
    for (const e of episodes) set.add(e.season ?? -1);
    return Array.from(set).sort((a, b) => a - b);
  }, [episodes]);

  const filteredEpisodes = useMemo(() => {
    if (selectedSeason === null) {
      return episodes.filter((e) => e.season === null);
    }
    return episodes.filter((e) => (e.season ?? -1) === selectedSeason);
  }, [episodes, selectedSeason]);

  const fetchMeta = async () => {
    if (!item) return;
    const title = item.title || item.name;
    setMetaLoading(true);
    setMetaMessage(null);
    try {
      const r = await searchMetadata(title);
      const hit = r[0];
      if (!hit) {
        setMetaMessage("未找到匹配的元数据");
      } else {
        await dbSaveMediaMeta({
          id: 0,
          provider_id: item.provider_id,
          path: item.path,
          title: hit.title,
          year: hit.year ?? null,
          season: null,
          episode: null,
          poster: hit.poster ?? null,
          backdrop: hit.backdrop ?? null,
          overview: hit.overview ?? null,
          rating: hit.rating ?? null,
          genres: hit.genres ? hit.genres.join(",") : null,
          source: "auto",
          source_id: hit.source_id,
        });
        setMetaMessage(`已缓存元数据: ${hit.title}`);
      }
    } catch (e) {
      setMetaMessage(`拉取失败: ${e}`);
    } finally {
      setMetaLoading(false);
    }
  };

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

  return (
    <div className="flex h-full flex-col overflow-auto">
      {/* Backdrop */}
      <div className="relative h-[400px] w-full overflow-hidden">
        {item.backdrop || item.poster ? (
          <ProxiedImage
            src={item.backdrop || item.poster || undefined}
            alt={item.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="relative z-10 -mt-32 px-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> 返回
        </Button>

        <div className="flex gap-6">
          {item.poster && (
            <ProxiedImage
              src={item.poster}
              alt={item.name}
              className="h-72 w-48 shrink-0 rounded-lg object-cover shadow-2xl"
            />
          )}
          <div className="flex-1 text-white">
            <h1 className="text-4xl font-bold">{item.name}</h1>
            {item.title && item.title !== item.name && (
              <div className="mt-1 text-sm text-white/60">归一标题: {item.title}</div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/80">
              {item.year && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {item.year}
                </span>
              )}
              {item.rating && (
                <span className="flex items-center gap-1 rounded bg-yellow-500/80 px-2 py-0.5 text-black">
                  <Star className="h-3 w-3" /> {item.rating.toFixed(1)}
                </span>
              )}
              {item.kind === "series" && (
                <span className="flex items-center gap-1 rounded bg-primary/80 px-2 py-0.5">
                  <Layers className="h-3 w-3" />
                  {item.episode_count} 集
                </span>
              )}
              <span className="rounded bg-white/15 px-2 py-0.5 text-xs">
                {item.provider_id}
              </span>
            </div>
            {item.overview && (
              <p className="mt-4 max-w-2xl text-white/90">{item.overview}</p>
            )}
            {/* 元数据拉取 (海报 / 简介 / 评分补全) */}
            <div className="mt-4 flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={fetchMeta}
                disabled={metaLoading}
              >
                {metaLoading ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                )}
                拉取详情 (缓存到本地)
              </Button>
              {metaMessage && (
                <span className="text-xs text-white/60">{metaMessage}</span>
              )}
            </div>
            {/* 电影: 直接播放按钮 */}
            {item.kind === "movie" && (
              <div className="mt-6">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() =>
                    openWithMpv(item.provider_id, item.path).catch((e) =>
                      console.error("open mpv failed", e)
                    )
                  }
                >
                  <Play className="mr-2 h-5 w-5" /> 播放
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 剧集: 季切换 + 集列表 */}
        {item.kind === "series" && (
          <div className="mt-10 rounded-lg border bg-card/60 p-5 backdrop-blur-sm">
            <h2 className="mb-4 text-lg font-semibold text-white">剧集列表</h2>

            {/* source_folders 贡献提示 */}
            {item.source_folders && item.source_folders.length > 1 && (
              <div className="mb-3 text-xs text-white/60">
                已合并 {item.source_folders.length} 个目录, 共 {item.episode_count} 集
              </div>
            )}

            {loadingEpisodes ? (
              <div className="flex items-center justify-center py-8 text-white/60">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="ml-2">加载剧集…</span>
              </div>
            ) : episodesError ? (
              <div className="text-sm text-red-300">{episodesError}</div>
            ) : episodes.length === 0 ? (
              <EmptyState
                title="本目录没有检测到剧集"
                description="剧集识别需要文件名遵循 SxxExx 或「第N话」等规则"
              />
            ) : (
              <>
                {/* 季选择 */}
                {seasons.length > 1 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {seasons.map((s) => (
                      <button
                        key={s === -1 ? "null" : s}
                        onClick={() => setSelectedSeason(s === -1 ? null : s)}
                        className={
                          "rounded-md px-3 py-1 text-xs transition-colors " +
                          ((selectedSeason === null && s === -1) ||
                          selectedSeason === s
                            ? "bg-primary text-primary-foreground"
                            : "bg-white/10 text-white/70 hover:bg-white/15")
                        }
                      >
                        {s === -1 ? "特别篇" : `第 ${s} 季`}
                      </button>
                    ))}
                  </div>
                )}

                {/* 集列表 */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {filteredEpisodes.map((e) => (
                    <button
                      key={e.file.id || e.file.path}
                      onClick={() =>
                        openWithMpv(
                          item.provider_id,
                          e.file.id || e.file.path
                        ).catch((e2) => console.error("open mpv failed", e2))
                      }
                      className="group flex items-center gap-2 rounded-md border border-white/10 bg-white/5 p-3 text-left text-sm text-white/90 transition-all hover:border-primary/50 hover:bg-white/10"
                    >
                      <Play className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="flex-1 truncate">
                        {e.episode !== null ? `E${e.episode}` : "—"}
                      </span>
                    </button>
                  ))}
                </div>
                {filteredEpisodes.length === 0 && (
                  <div className="py-4 text-center text-sm text-white/50">
                    本季没有解析出剧集
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
