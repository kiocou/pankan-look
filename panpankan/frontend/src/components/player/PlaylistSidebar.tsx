import { Film } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PlaylistItem {
  id: string;
  name: string;
  thumbnail?: string | null;
}

export interface PlaylistSidebarProps {
  items: PlaylistItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
}

export function PlaylistSidebar({ items, activeId, onSelect }: PlaylistSidebarProps) {
  return (
    <aside className="flex h-full w-72 flex-col border-l bg-card/50">
      <div className="border-b p-3 text-sm font-medium">
        播放列表 <span className="ml-1 text-muted-foreground">({items.length})</span>
      </div>
      <div className="flex-1 overflow-auto">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => onSelect?.(it.id)}
            className={cn(
              "flex w-full items-center gap-3 border-b px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
              activeId === it.id && "bg-primary/10"
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
              {it.thumbnail ? (
                <img src={it.thumbnail} alt={it.name} className="h-full w-full object-cover" />
              ) : (
                <Film className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <span className="flex-1 truncate">{it.name}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
