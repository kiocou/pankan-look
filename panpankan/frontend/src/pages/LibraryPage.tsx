import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Film, Loader2 } from "lucide-react";
import { useAppStore } from "@/stores";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MediaGrid } from "@/components/media/MediaGrid";

export function LibraryPage() {
  const navigate = useNavigate();
  const { library, loadLibrary, scanLibrary } = useAppStore();

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">媒体库</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {library.length} 项
          </p>
        </div>
        <Button onClick={() => scanLibrary()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          扫描
        </Button>
      </div>

      {library.length === 0 ? (
        <EmptyState
          icon={<Film className="h-12 w-12" />}
          title="媒体库为空"
          description="点击右上角扫描，从已添加的云盘发现媒体文件"
        />
      ) : (
        <MediaGrid items={library} onItemClick={() => navigate("/library")} />
      )}
    </div>
  );
}
