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
  /** 归一化标题, 用于跨目录去重 key */
  title?: string | null;
  /** 剧集贡献目录 */
  source_folders?: SourceFolder[];
}

export interface SourceFolder {
  provider_id: string;
  /** 光鸭=fileId, webdav=path */
  folder_id: string;
  name: string;
}

export interface ScanFolder {
  provider_id: string;
  folder_id: string;
  name: string;
}

export interface NsfwItem {
  id: number;
  provider_id: string;
  file_id: string;
  name: string;
  path: string;
  thumbnail: string | null;
  size: number;
  matched_keywords: string[];
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
  phone: string,
  deviceId: string
) => invoke<GuangyaSendCodeResult>("guangya_send_code", {
  phone,
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

// ===== 外部 MPV =====
// 给到 (provider_id, path) → Rust 端取真实播放 URL → 拉起外部 mpv。
// mpv 不可用时回退到系统默认播放器。
export const openWithMpv = (providerId: string, path: string) =>
  invoke<void>("open_with_mpv", { providerId, path });

// 已经拿到 URL 的情况下直接拉起（备用）
export const openUrlWithMpv = (url: string) =>
  invoke<void>("open_url_with_mpv", { url });

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

// ===== 扫描目录配置 =====
export const getScanFolders = (scope: string) =>
  invoke<ScanFolder[]>("get_scan_folders", { scope });

export const setScanFolders = (scope: string, folders: ScanFolder[]) =>
  invoke("set_scan_folders", { scope, folders });

// ===== NSFW =====
export const nsfwScan = () => invoke<{ count: number }>("nsfw_scan");

export const nsfwListItems = () => invoke<NsfwItem[]>("nsfw_list_items");

// ===== 工具函数（前端用） =====

// ===== 图片代理（绕过 WebView2 系统代理） =====
// 光鸭 CDN 域名在 WebView2 下经常因系统代理失败 (ERR_TUNNEL_CONNECTION_FAILED)
// 改走后端 reqwest 拿图片数据, 转成 base64 data URL 喂给 <img>
const _imgProxyCache = new Map<string, string>();
export async function proxyThumbnail(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  if (_imgProxyCache.has(url)) return _imgProxyCache.get(url)!;
  try {
    const bytes = await invoke<number[]>("proxy_image", { url });
    const u8 = new Uint8Array(bytes);
    // 简单猜 MIME (光鸭 CDN 都是 jpeg/png/webp)
    const sniff = u8.length >= 4
      ? (u8[0] === 0xff && u8[1] === 0xd8 ? "image/jpeg"
       : u8[0] === 0x89 && u8[1] === 0x50 ? "image/png"
       : u8[0] === 0x52 && u8[1] === 0x49 ? "image/webp"
       : "image/jpeg")
      : "image/jpeg";
    // 用 btoa 拼 base64
    let bin = "";
    for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
    const dataUrl = `data:${sniff};base64,${btoa(bin)}`;
    _imgProxyCache.set(url, dataUrl);
    return dataUrl;
  } catch (e) {
    console.warn("proxyThumbnail failed for", url, e);
    return null;
  }
}
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
