import { useEffect, useState } from "react";
import { Grid, List, RefreshCw, ArrowUp } from "lucide-react";
import { useAppStore } from "@/stores";
import { Breadcrumb } from "./Breadcrumb";
import { FileGrid } from "./FileGrid";
import { FileList } from "./FileList";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { FileItem } from "@/lib/tauri";
import { isVideoFile, openWithMpv } from "@/lib/tauri";

export function FileBrowser() {
  const {
    activeProviderId,
    files,
    loading,
    loadError,
    pathStack,
    loadFiles,
    navigateInto,
    navigateUp,
  } = useAppStore();
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    if (activeProviderId) {
      loadFiles();
    }
  }, [
    activeProviderId,
    pathStack.length,
    pathStack[pathStack.length - 1]?.fileId,
    loadFiles,
  ]);

  const handleFileClick = (file: FileItem) => {
    if (file.isDirectory) {
      // 光鸭 API 偶尔返回空 file.id（默认 ""），空串传给后端会被当根目录，
      // 导致点击第二层文件夹列表停在根不动。用 path 兜底，与
      // FolderPickerModal.tsx:73 / MediaDetailPage.tsx 的处理保持一致。
      navigateInto({ fileId: file.id || file.path, name: file.name });
    } else if (isVideoFile(file.name)) {
      if (activeProviderId) {
        // 用 file.id(数字 fileId)而非 file.path(人读路径)传给播放器
        // 光鸭 API 只认 fileId;若传 path,后端 resolve_parent_id 会失败
        openWithMpv(activeProviderId, file.id || file.path).catch((e) =>
          console.error("open mpv failed", e)
        );
      }
    }
  };

  if (!activeProviderId) {
    return (
      <EmptyState
        title="未选择云盘"
        description="请在侧边栏或设置页面添加并选择一个云盘提供方。"
      />
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <Breadcrumb />
        <div className="flex items-center gap-2">
          {pathStack.length > 0 && (
            <Button variant="outline" size="icon" onClick={navigateUp}>
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => loadFiles()} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
          <Button
            variant={view === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setView("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loadError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <div className="font-medium">加载失败</div>
            <div className="mt-1 break-all text-xs">{loadError}</div>
          </div>
        ) : files.length === 0 && !loading ? (
          <EmptyState title="空目录" description="该目录下没有任何文件。" />
        ) : view === "grid" ? (
          <FileGrid files={files} onFileClick={handleFileClick} />
        ) : (
          <FileList files={files} onFileClick={handleFileClick} />
        )}
      </div>
    </div>
  );
}
