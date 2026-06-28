import { useEffect, useState } from "react";
import { Grid, List, RefreshCw, ArrowUp } from "lucide-react";
import { useAppStore } from "@/stores";
import { Breadcrumb } from "./Breadcrumb";
import { FileGrid } from "./FileGrid";
import { FileList } from "./FileList";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { FileItem } from "@/lib/tauri";
import { isVideoFile } from "@/lib/tauri";
import { useNavigate } from "react-router-dom";

export function FileBrowser() {
  const {
    activeProviderId,
    files,
    loading,
    pathStack,
    loadFiles,
    navigateInto,
    navigateUp,
  } = useAppStore();
  const navigate = useNavigate();
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
      navigateInto({ fileId: file.id, name: file.name });
    } else if (isVideoFile(file.name)) {
      if (activeProviderId) {
        navigate(
          `/player/${activeProviderId}?path=${encodeURIComponent(file.path)}`
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
        {files.length === 0 && !loading ? (
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
