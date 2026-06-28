import { useEffect } from "react";
import { embedMpvAttach } from "@/lib/tauri";

// 独立窗口的 MPV 嵌入视图 (webview window)
// 这里只是占位 —— 真实渲染需要 libmpv + wgpu 纹理贴图
export function PlayerEmbedPage() {
  useEffect(() => {
    embedMpvAttach("embed").catch(() => {});
  }, []);
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black text-white/70">
      <div className="text-center">
        <div className="mb-2 text-2xl font-semibold">MPV 嵌入窗口</div>
        <div className="text-sm text-white/40">
          真实渲染需要 libmpv + GPU 纹理绑定，参见 player/mpv_embed.rs
        </div>
      </div>
    </div>
  );
}
