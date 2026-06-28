import { Folder, Film, Music, FileText, Image as ImageIcon } from "lucide-react";
import { isVideoFile, isSubtitleFile, formatFileSize } from "@/lib/tauri";
import type { FileItem } from "@/lib/tauri";
import { cn } from "@/lib/utils";

export interface FileItemCardProps {
  file: FileItem;
  onClick?: () => void;
  selected?: boolean;
}

export function FileItemCard({ file, onClick, selected }: FileItemCardProps) {
  const Icon = file.isDirectory
    ? Folder
    : isVideoFile(file.name)
    ? Film
    : isSubtitleFile(file.name)
    ? FileText
    : file.name.match(/\.(mp3|flac|wav|aac)$/i)
    ? Music
    : file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    ? ImageIcon
    : FileText;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex flex-col items-center gap-2 rounded-lg border bg-card/50 p-3 text-left transition-all hover:border-primary/50 hover:bg-card",
        selected && "border-primary bg-primary/10"
      )}
    >
      <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-md bg-muted">
        {file.thumbnail ? (
          <img
            src={file.thumbnail}
            alt={file.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <Icon className="h-10 w-10 text-muted-foreground group-hover:text-primary" />
        )}
      </div>
      <div className="w-full truncate">
        <div className="truncate text-sm font-medium" title={file.name}>
          {file.name}
        </div>
        <div className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>{file.isDirectory ? "文件夹" : formatFileSize(file.size)}</span>
        </div>
      </div>
    </button>
  );
}
