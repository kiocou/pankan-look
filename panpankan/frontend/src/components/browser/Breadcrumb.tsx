import { ChevronRight } from "lucide-react";
import { useAppStore } from "@/stores";

export function Breadcrumb() {
  const { pathStack, navigateToDepth, navigateRoot } = useAppStore();

  return (
    <nav className="flex items-center gap-1 text-sm">
      <button
        onClick={navigateRoot}
        className="rounded px-2 py-1 hover:bg-accent text-muted-foreground"
      >
        根目录
      </button>
      {pathStack.map((seg, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          <button
            onClick={() => navigateToDepth(i + 1)}
            className="rounded px-2 py-1 hover:bg-accent"
          >
            {seg.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
