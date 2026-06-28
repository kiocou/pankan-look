import { Folder, Film, FileText, ChevronUp } from "lucide-react";
import type { FileItem } from "@/lib/tauri";
import { isVideoFile, isSubtitleFile, formatFileSize } from "@/lib/tauri";
import { cn } from "@/lib/utils";

export interface FileListProps {
  files: FileItem[];
  onFileClick: (file: FileItem) => void;
}

export function FileList({ files, onFileClick }: FileListProps) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card/50">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-left">名称</th>
            <th className="hidden px-4 py-2 text-right md:table-cell">大小</th>
            <th className="hidden px-4 py-2 text-right md:table-cell">修改时间</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => (
            <tr
              key={f.id}
              onClick={() => onFileClick(f)}
              className="cursor-pointer border-b last:border-b-0 hover:bg-accent/50"
            >
              <td className="flex items-center gap-2 px-4 py-2">
                {f.isDirectory ? (
                  <Folder className="h-4 w-4 text-blue-400" />
                ) : isVideoFile(f.name) ? (
                  <Film className="h-4 w-4 text-purple-400" />
                ) : isSubtitleFile(f.name) ? (
                  <FileText className="h-4 w-4 text-green-400" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={cn("truncate", f.isDirectory && "font-medium")}>
                  {f.name}
                </span>
              </td>
              <td className="hidden px-4 py-2 text-right text-muted-foreground md:table-cell">
                {f.isDirectory ? "—" : formatFileSize(f.size)}
              </td>
              <td className="hidden px-4 py-2 text-right text-muted-foreground md:table-cell">
                {f.modifiedTime
                  ? new Date(f.modifiedTime).toLocaleString("zh-CN")
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
