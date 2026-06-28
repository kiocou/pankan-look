import { cn } from "@/lib/utils";
import type { LibraryItem } from "@/lib/tauri";

export interface MediaCardProps {
  item: LibraryItem;
  onClick?: () => void;
}

export function MediaCard({ item, onClick }: MediaCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex aspect-[2/3] flex-col overflow-hidden rounded-lg border bg-card text-left transition-all hover:scale-105 hover:border-primary/50"
      )}
    >
      {item.poster ? (
        <img
          src={item.poster}
          alt={item.name}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <div className="relative z-10 mt-auto p-3 text-white">
        <h3 className="line-clamp-2 text-sm font-semibold">{item.name}</h3>
        <div className="mt-1 flex items-center gap-2 text-xs text-white/70">
          {item.year && <span>{item.year}</span>}
          {item.rating && (
            <span className="rounded bg-yellow-500/80 px-1.5 py-0.5 text-black">
              ★ {item.rating.toFixed(1)}
            </span>
          )}
          {item.kind === "series" && (
            <span className="rounded bg-primary/80 px-1.5 py-0.5">
              {item.episode_count} 集
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
