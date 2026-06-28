import type { LibraryItem } from "@/lib/tauri";
import { MediaCard } from "./MediaCard";

export interface MediaGridProps {
  items: LibraryItem[];
  onItemClick?: (item: LibraryItem) => void;
}

export function MediaGrid({ items, onItemClick }: MediaGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
      {items.map((it) => (
        <MediaCard key={it.id} item={it} onClick={() => onItemClick?.(it)} />
      ))}
    </div>
  );
}
