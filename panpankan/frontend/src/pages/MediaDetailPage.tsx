import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Star, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/stores";
import { useEffect } from "react";

export function MediaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { library } = useAppStore();
  const item = library.find((l) => String(l.id) === id);

  useEffect(() => {
    if (item) {
      // 滚动到顶部
    }
  }, [item]);

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
          <img
            src={item.backdrop || item.poster || ""}
            alt={item.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-700 to-pink-600" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="relative z-10 -mt-32 px-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> 返回
        </Button>

        <div className="flex gap-6">
          {item.poster && (
            <img
              src={item.poster}
              alt={item.name}
              className="h-72 w-48 shrink-0 rounded-lg object-cover shadow-2xl"
            />
          )}
          <div className="flex-1 text-white">
            <h1 className="text-4xl font-bold">{item.name}</h1>
            <div className="mt-2 flex items-center gap-4 text-sm text-white/80">
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
                <span className="rounded bg-primary/80 px-2 py-0.5">
                  {item.episode_count} 集
                </span>
              )}
            </div>
            {item.overview && (
              <p className="mt-4 max-w-2xl text-white/90">{item.overview}</p>
            )}
            <div className="mt-6">
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                onClick={() =>
                  navigate(
                    `/player/${item.provider_id}?path=${encodeURIComponent(item.path)}`
                  )
                }
              >
                <Play className="mr-2 h-5 w-5" /> 播放
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
