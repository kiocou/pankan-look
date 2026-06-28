import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

export interface PlayerControlsProps {
  playing: boolean;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  onTogglePlay?: () => void;
  onSeek?: (seconds: number) => void;
  onVolumeChange?: (v: number) => void;
  onMuteToggle?: () => void;
  onFullscreen?: () => void;
}

function formatTime(s: number) {
  if (!s || !isFinite(s)) return "00:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function PlayerControls({
  playing,
  position,
  duration,
  volume,
  muted,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onFullscreen,
}: PlayerControlsProps) {
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg bg-black/60 p-4 backdrop-blur-md">
      {/* 进度条 */}
      <div
        className="group relative h-1.5 w-full cursor-pointer rounded-full bg-white/20 transition-all hover:h-2"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          if (onSeek) onSeek(Math.max(0, ratio * duration));
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setHoverTime(((e.clientX - rect.left) / rect.width) * duration);
        }}
        onMouseLeave={() => setHoverTime(null)}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
          style={{ width: `${progress}%` }}
        />
        {hoverTime !== null && (
          <div className="absolute -top-7 hidden -translate-x-1/2 rounded bg-black/90 px-2 py-1 text-xs text-white group-hover:block">
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-white/80">
        <span>{formatTime(position)} / {formatTime(duration)}</span>
      </div>

      {/* 按钮组 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => onSeek?.(position - 10)}>
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onTogglePlay}>
            {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => onSeek?.(position + 10)}>
            <SkipForward className="h-5 w-5" />
          </Button>
          <div className="ml-2 flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onMuteToggle}>
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
              className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-white/20 accent-primary"
            />
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onFullscreen}>
          <Maximize className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
