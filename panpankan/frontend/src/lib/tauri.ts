// 前端 ↔ Rust 命令桥接 (Tauri 2)
// 注意: Tauri 2 入参默认 camelCase；下划线前缀参数(_captcha_code)前端仍需传对应 key。

import { invoke } from "@tauri-apps/api/core";

// ===== 类型 =====
export interface FileItem {
  id: string;
  name: string;
  path: string;
  parent_id: string | null;
  isDirectory: boolean;
  size: number;
  modifiedTime: string | null;
  thumbnail: string | null;
  mime: string | null;
  ext: string | null;
}

export interface SubtitleInfo {
  id: string;
  name: string;
  language: string | null;
  url: string | null;
  format: string | null;
}

export interface PlayerInfo {
  url: string;
  playUrl: string | null;
  downloadUrl: string | null;
  headers: Record<string, string> | null;
  subtitles: SubtitleInfo[];
  videoDuration: number | null;
  format: string | null;
}

export interface WatchHistory {
  id: number;
  provider_id: string;
  path: string;
  name: string;
  position: number;
  duration: number;
  updated_at: string;
  thumbnail: string | null;
}

export interface MediaMeta {
  id: number;
  provider_id: string;
  path: string;
  title: string;
  year: number | null;
  season: number | null;
  episode: number | null;
  poster: string | null;
  backdrop: string | null;
  overview: string | null;
  rating: number | null;
  genres: string | null;
  source: string | null;
  source_id: string | null;
}

export interface ProviderInfo {
  id: string;
  name: string;
  config: Record<string, unknown>;
  active: boolean;
}

export interface ScraperResult {
  source: string;
  source_id: string;
  title: string;
  year: number | null;
  poster: string | null;
  backdrop: string | null;
  overview: string | null;
  rating: number | null;
  genres: string[] | null;
}

export interface NsfwCheckResult {
  is_nsfw: boolean;
  matched_keywords: string[];
  confidence: number;
}

export interface PlayerState {
  playing: boolean;
  paused: boolean;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  speed: number;
  title: string | null;
}

export interface LibraryItem {
  id: number;
  provider_id: string;
  path: string;
  name: string;
  kind: string;
  poster: string | null;
  backdrop: string | null;
  year: number | null;
  rating: number | null;
  overview: string | null;
  episode_count: number;
}

export interface GuangyaCaptcha {
  captcha_key: string;
  device_id: string;
}

export interface GuangyaSendCodeResult {
  verification_id: string;
  device_id: string;
}

export interface GuangyaVerifyResult {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  device_id: string;
  provider_id: string;
}

// ===== 文件 =====
export const listFiles = (providerId: string, path: string) =>
  invoke<FileItem[]>("list_files", { providerId, path });

export const getFile = (providerId: string, path: string) =>
  invoke<FileItem>("get_file", { providerId, path });

export const getSiblingFiles = (providerId: string, path: string) =>
  invoke<FileItem[]>("get_sibling_files", { providerId, path });

export const searchFiles = (providerId: string, query: string, parent?: string) =>
  invoke<FileItem[]>("search_files", { providerId, query, parent });

export const listAllMediaFiles = (providerId: string) =>
  invoke<FileItem[]>("list_all_media_files", { providerId });

export const listFolderVideos = (providerId: string, folderId: string) =>
  invoke<FileItem[]>("list_folder_videos", { providerId, folderId });

// ===== 流媒体 =====
export const getStreamUrl = (providerId: string, path: string) =>
  invoke<string>("get_stream_url", { providerId, path });

export const getPlayUrl = (providerId: string, path: string) =>
  invoke<string>("get_play_url", { providerId, path });

export const getPlayerInfo = (providerId: string, path: string) =>
  invoke<PlayerInfo>("get_player_info", { providerId, path });

export const getSubtitles = (providerId: string, path: string) =>
  invoke<SubtitleInfo[]>("get_subtitles", { providerId, path });

// ===== 光鸭登录 =====
export const guangyaInitCaptcha = (phone: string) =>
  invoke<GuangyaCaptcha>("guangya_init_captcha", { phone });

export const guangyaSendCode = (
  captchaKey: string,
  phone: string,
  captchaCode: string,
  deviceId: string
) => invoke<GuangyaSendCodeResult>("guangya_send_code", {
  captchaKey,
  phone,
  captchaCode,
  deviceId,
});

export const guangyaVerifyCode = (
  verificationId: string,
  phone: string,
  code: string,
  providerId: string,
  deviceId: string
) => invoke<GuangyaVerifyResult>("guangya_verify_code", {
  verificationId,
  phone,
  code,
  providerId,
  deviceId,
});

// ===== 嵌入 MPV =====
export const embedMpvStart = (
  url: string,
  title?: string,
  startPosition?: number
) => invoke("embed_mpv_start", { url, title, startPosition });

export const embedMpvAttach = (label: string) =>
  invoke("embed_mpv_attach", { label });

export const embedMpvStop = () => invoke("embed_mpv_stop");

export const embedMpvResize = (w: number, h: number) =>
  invoke("embed_mpv_resize", { w, h });

export const embedMpvTogglePause = () =>
  invoke<PlayerState>("embed_mpv_toggle_pause");

export const embedMpvSeek = (seconds: number) =>
  invoke<PlayerState>("embed_mpv_seek", { seconds });

export const embedMpvSetVolume = (volume: number) =>
  invoke<PlayerState>("embed_mpv_set_volume", { volume });

export const embedMpvSetMute = (mute: boolean) =>
  invoke<PlayerState>("embed_mpv_set_mute", { mute });

export const embedMpvSetSpeed = (speed: number) =>
  invoke<PlayerState>("embed_mpv_set_speed", { speed });

export const embedMpvGetState = () =>
  invoke<PlayerState>("embed_mpv_get_state");

// ===== Provider 管理 =====
export const addProvider = (providerId: string, config: Record<string, unknown>) =>
  invoke("add_provider", { providerId, config });

export const removeProvider = (providerId: string) =>
  invoke("remove_provider", { providerId });

export const testProvider = (providerId: string) =>
  invoke<boolean>("test_provider", { providerId });

export const listProviders = () =>
  invoke<ProviderInfo[]>("list_providers");

export const setActiveProvider = (providerId: string) =>
  invoke("set_active_provider", { providerId });

export const getActiveProvider = () =>
  invoke<string | null>("get_active_provider");

// ===== DB =====
export const dbSaveWatchHistory = (history: WatchHistory) =>
  invoke("db_save_watch_history", { history });

export const dbGetWatchHistory = (providerId: string, path: string) =>
  invoke<WatchHistory | null>("db_get_watch_history", { providerId, path });

export const dbGetRecentHistory = (limit?: number) =>
  invoke<WatchHistory[]>("db_get_recent_history", { limit });

export const dbGetContinueWatching = (limit?: number) =>
  invoke<WatchHistory[]>("db_get_continue_watching", { limit });

export const dbSaveMediaMeta = (meta: MediaMeta) =>
  invoke("db_save_media_meta", { meta });

export const dbGetMediaMeta = (providerId: string, path: string) =>
  invoke<MediaMeta | null>("db_get_media_meta", { providerId, path });

export const dbSearchMedia = (query: string, limit?: number) =>
  invoke<MediaMeta[]>("db_search_media", { query, limit });

export const dbGetSetting = (key: string) =>
  invoke<string | null>("db_get_setting", { key });

export const dbSaveSetting = (key: string, value: string) =>
  invoke("db_save_setting", { key, value });

// ===== 刮削 =====
export const searchMetadata = (query: string, source?: string) =>
  invoke<ScraperResult[]>("search_metadata", { query, source });

export const getMediaDetails = (source: string, sourceId: string) =>
  invoke<Record<string, unknown>>("get_media_details", { source, sourceId });

export const setTmdbApiKey = (key: string) =>
  invoke("set_tmdb_api_key", { key });

export const getTmdbConfigured = () =>
  invoke<boolean>("get_tmdb_configured");

export const setFanartApiKey = (key: string) =>
  invoke("set_fanart_api_key", { key });

export const getFanartConfigured = () =>
  invoke<boolean>("get_fanart_configured");

// ===== 剧集识别 =====
export const parseEpisodeFilename = (name: string) =>
  invoke<{ season: number | null; episode: number | null }>(
    "parse_episode_filename",
    { name }
  );

export const extractMediaTitle = (name: string) =>
  invoke<string>("extract_media_title", { name });

// ===== 探测 =====
export const probeVideoDuration = (path: string) =>
  invoke<number>("probe_video_duration", { path });

export const checkFfprobe = () =>
  invoke<boolean>("check_ffprobe");

// ===== 安全 / NSFW =====
export const safetyCheckFilename = (name: string) =>
  invoke<NsfwCheckResult>("safety_check_filename", { name });

export const safetyBlurSource = (name: string) =>
  invoke<string>("safety_blur_source", { name });

export const safetySetAutoHideNsfw = (enable: boolean) =>
  invoke("safety_set_auto_hide_nsfw", { enable });

export const safetyGetAutoHideNsfw = () =>
  invoke<boolean>("safety_get_auto_hide_nsfw");

// ===== 媒体库 =====
export const libraryListItems = (providerId?: string) =>
  invoke<LibraryItem[]>("library_list_items", { providerId });

export const libraryGetSeriesEpisodes = (providerId: string, folderId: string) =>
  invoke<FileItem[]>("library_get_series_episodes", { providerId, folderId });

export const libraryScan = (providerId?: string) =>
  invoke<{ count: number }>("library_scan", { providerId });

export const libraryScanProgress = () =>
  invoke<Record<string, unknown>>("library_scan_progress");

// ===== 工具函数（前端用） =====
export function isVideoFile(name: string): boolean {
  const exts = ["mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "m4v", "ts", "m2ts", "mpg", "mpeg"];
  const ext = name.split(".").pop()?.toLowerCase();
  return !!ext && exts.includes(ext);
}

export function isSubtitleFile(name: string): boolean {
  const exts = ["srt", "ass", "ssa", "vtt", "sub"];
  const ext = name.split(".").pop()?.toLowerCase();
  return !!ext && exts.includes(ext);
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exp = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  return `${(bytes / Math.pow(1024, exp)).toFixed(2)} ${units[exp]}`;
}
