import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PlayerControls } from "@/components/player/PlayerControls";
import {
  getPlayUrl,
  getPlayerInfo,
  embedMpvStart,
  embedMpvAttach,
} from "@/lib/tauri";

export function PlayerPage() {
  const { providerId } = useParams<{ providerId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const path = params.get("path") ?? "";
  const startAt = parseFloat(params.get("t") ?? "0");

  const [url, setUrl] = useState<string | null>(null);
  const [info, setInfo] = useState<{ title: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState({
    playing: false,
    paused: true,
    position: startAt,
    duration: 0,
    volume: 0.8,
    muted: false,
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!providerId || !path) return;
    (async () => {
      try {
        const i = await getPlayerInfo(providerId, path);
        setUrl(i.playUrl || i.url);
        setInfo({ title: null });
        // 同步尝试启动 mpv embed
        await embedMpvStart(i.playUrl || i.url, undefined, startAt || undefined);
      } catch (e) {
        // 退回到 stream url
        try {
          const u = await getPlayUrl(providerId, path);
          setUrl(u);
        } catch (e2) {
          setError(String(e2));
        }
      }
    })();
  }, [providerId, path, startAt]);

  // 视频元素事件
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setState((s) => ({ ...s, position: v.currentTime }));
    const onMeta = () => setState((s) => ({ ...s, duration: v.duration }));
    const onPlay = () => setState((s) => ({ ...s, playing: true, paused: false }));
    const onPause = () => setState((s) => ({ ...s, playing: false, paused: true }));
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [url]);

  return (
    <div className="flex h-screen w-screen flex-col bg-black">
      <div className="absolute left-4 top-4 z-20">
        <Button
          variant="ghost"
          className="text-white hover:bg-white/10"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> 返回
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center">
        {error ? (
          <div className="rounded-md bg-destructive/20 px-4 py-3 text-destructive">
            {error}
          </div>
        ) : url ? (
          <video
            ref={videoRef}
            src={url}
            controls={false}
            autoPlay
            className="max-h-full max-w-full"
            onClick={() =>
              state.paused ? videoRef.current?.play() : videoRef.current?.pause()
            }
          />
        ) : (
          <div className="text-white/60">加载中...</div>
        )}
      </div>

      <div className="p-4">
        <PlayerControls
          playing={state.playing}
          position={state.position}
          duration={state.duration}
          volume={state.volume}
          muted={state.muted}
          onTogglePlay={() =>
            state.paused ? videoRef.current?.play() : videoRef.current?.pause()
          }
          onSeek={(s) => {
            if (videoRef.current) videoRef.current.currentTime = s;
          }}
          onVolumeChange={(v) => {
            if (videoRef.current) videoRef.current.volume = v;
            setState((s) => ({ ...s, volume: v }));
          }}
          onMuteToggle={() => {
            if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
            setState((s) => ({ ...s, muted: !s.muted }));
          }}
          onFullscreen={() => {
            const el = videoRef.current?.parentElement;
            if (el?.requestFullscreen) el.requestFullscreen();
          }}
        />
        {info?.title && (
          <div className="mt-2 text-center text-xs text-white/60">{info.title}</div>
        )}
      </div>
    </div>
  );
}
