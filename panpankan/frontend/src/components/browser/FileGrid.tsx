import type { FileItem } from "@/lib/tauri";
import { FileItemCard } from "./FileItem";

export interface FileGridProps {
  files: FileItem[];
  onFileClick: (file: FileItem) => void;
}

export function FileGrid({ files, onFileClick }: FileGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
      {files.map((f) => (
        <FileItemCard key={f.id} file={f} onClick={() => onFileClick(f)} />
      ))}
    </div>
  );
}
