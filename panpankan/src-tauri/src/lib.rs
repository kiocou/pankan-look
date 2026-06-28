mod db;
mod local_server;
mod media;
mod models;
mod player;
mod providers;
mod safety;
mod scanner;
mod scraper;
mod utils;

use crate::db::Db;
use crate::models::*;
use crate::player::{mpv_embed, EmbedConfig, PlayerState};
use crate::providers::guangya::{self, GuangyaConfig};
use crate::providers::local::LocalProvider;
use crate::providers::openlist::OpenListProvider;
use crate::providers::webdav::WebDavProvider;
use crate::providers::CloudProvider;
use parking_lot::RwLock;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};

pub struct AppState {
    pub db: Arc<Db>,
    pub providers: Arc<RwLock<HashMap<String, Box<dyn CloudProvider>>>>,
    pub active_provider: Arc<RwLock<Option<String>>>,
    pub scanner_running: Arc<RwLock<bool>>,
}

impl AppState {
    pub fn new(db_path: &PathBuf) -> Result<Self, String> {
        let db = Arc::new(Db::open(db_path)?);
        let providers = Arc::new(RwLock::new(HashMap::new()));
        Self::reload_providers_from_db(&db, &providers)?;
        Ok(Self {
            db,
            providers,
            active_provider: Arc::new(RwLock::new(None)),
            scanner_running: Arc::new(RwLock::new(false)),
        })
    }

    pub fn reload_providers_from_db(
        db: &Db,
        providers: &Arc<RwLock<HashMap<String, Box<dyn CloudProvider>>>>,
    ) -> Result<(), String> {
        let mut map = providers.write();
        map.clear();
        for (pid, raw) in db.list_provider_configs()? {
            let v: Value = serde_json::from_str(&raw).unwrap_or(Value::Null);
            match pid.as_str() {
                "guangya" => {
                    if let Ok(cfg) = serde_json::from_value::<GuangyaConfig>(v.clone()) {
                        if cfg.device_id.is_empty() {
                            if let Some(stored) = db.get_device_fingerprint("guangya")? {
                                let mut c = cfg.clone();
                                c.device_id = stored;
                                map.insert(pid, Box::new(providers::guangya::GuangyaProvider::new(c)));
                                continue;
                            } else {
                                let did = crate::utils::generate_device_id();
                                let _ = db.save_device_fingerprint("guangya", &did);
                                let mut c = cfg.clone();
                                c.device_id = did;
                                map.insert(pid, Box::new(providers::guangya::GuangyaProvider::new(c)));
                                continue;
                            }
                        }
                        map.insert(pid, Box::new(providers::guangya::GuangyaProvider::new(cfg)));
                    }
                }
                "openlist" => {
                    if let Ok(cfg) = serde_json::from_value::<providers::openlist::OpenListConfig>(v) {
                        map.insert(pid, Box::new(OpenListProvider::new(cfg)));
                    }
                }
                "webdav" => {
                    if let Ok(cfg) = serde_json::from_value::<providers::webdav::WebDavConfig>(v) {
                        map.insert(pid, Box::new(WebDavProvider::new(cfg)));
                    }
                }
                "local" => {
                    if let Ok(cfg) = serde_json::from_value::<providers::local::LocalConfig>(v) {
                        map.insert(pid, Box::new(LocalProvider::new(cfg)));
                    }
                }
                _ => {}
            }
        }
        Ok(())
    }
}

fn get_provider<'a>(
    state: &'a State<'_, AppState>,
    provider_id: &str,
) -> Result<&'a Box<dyn CloudProvider>, String> {
    let map = state.providers.read();
    map.get(provider_id)
        .ok_or_else(|| format!("provider {} 不存在", provider_id))
}

// ===== File commands =====
#[tauri::command]
async fn list_files(
    state: State<'_, AppState>,
    provider_id: String,
    path: String,
) -> Result<Vec<FileItem>, String> {
    let p = get_provider(&state, &provider_id)?;
    p.list_files(&path).await
}

#[tauri::command]
async fn get_file(
    state: State<'_, AppState>,
    provider_id: String,
    path: String,
) -> Result<FileItem, String> {
    let p = get_provider(&state, &provider_id)?;
    p.get_file(&path).await
}

#[tauri::command]
async fn get_sibling_files(
    state: State<'_, AppState>,
    provider_id: String,
    path: String,
) -> Result<Vec<FileItem>, String> {
    let p = get_provider(&state, &provider_id)?;
    p.get_sibling_files(&path).await
}

#[tauri::command]
async fn search_files(
    state: State<'_, AppState>,
    provider_id: String,
    query: String,
    parent: Option<String>,
) -> Result<Vec<FileItem>, String> {
    let p = get_provider(&state, &provider_id)?;
    p.search_files(&query, parent.as_deref()).await
}

#[tauri::command]
async fn list_all_media_files(
    state: State<'_, AppState>,
    provider_id: String,
) -> Result<Vec<FileItem>, String> {
    let p = get_provider(&state, &provider_id)?;
    p.list_all_media_files().await
}

#[tauri::command]
async fn list_folder_videos(
    state: State<'_, AppState>,
    provider_id: String,
    folder_id: String,
) -> Result<Vec<FileItem>, String> {
    let p = get_provider(&state, &provider_id)?;
    p.list_folder_videos(&folder_id).await
}

// ===== Stream / Play commands =====
#[tauri::command]
async fn get_stream_url(
    state: State<'_, AppState>,
    provider_id: String,
    path: String,
) -> Result<String, String> {
    let p = get_provider(&state, &provider_id)?;
    p.get_stream_url(&path).await
}

#[tauri::command]
async fn get_play_url(
    state: State<'_, AppState>,
    provider_id: String,
    path: String,
) -> Result<String, String> {
    let p = get_provider(&state, &provider_id)?;
    p.get_play_url(&path).await
}

#[tauri::command]
async fn get_player_info(
    state: State<'_, AppState>,
    provider_id: String,
    path: String,
) -> Result<PlayerInfo, String> {
    let p = get_provider(&state, &provider_id)?;
    p.get_player_info(&path).await
}

#[tauri::command]
async fn get_subtitles(
    state: State<'_, AppState>,
    provider_id: String,
    path: String,
) -> Result<Vec<SubtitleInfo>, String> {
    let p = get_provider(&state, &provider_id)?;
    p.get_subtitles(&path).await
}

// ===== Guangya login =====
#[tauri::command]
async fn guangya_init_captcha(phone: String) -> Result<guangya::GuangyaCaptcha, String> {
    let device_id = crate::utils::generate_device_id();
    guangya::init_captcha(&phone, &device_id).await
}

#[tauri::command]
async fn guangya_send_code(
    captcha_key: String,
    phone: String,
    captcha_code: String,
    device_id: String,
) -> Result<guangya::SendCodeResult, String> {
    guangya::send_code(&captcha_key, &phone, &captcha_code, &device_id).await
}

#[tauri::command]
async fn guangya_verify_code(
    verification_id: String,
    phone: String,
    code: String,
    provider_id: String,
    device_id: String,
) -> Result<Value, String> {
    let r = guangya::verify_code(&verification_id, &phone, &code, &device_id).await?;
    Ok(json!({
        "access_token": r.access_token,
        "refresh_token": r.refresh_token,
        "expires_in": r.expires_in,
        "device_id": device_id,
        "provider_id": provider_id,
    }))
}

// ===== Embed MPV =====
#[tauri::command]
fn embed_mpv_start(url: String, title: Option<String>, start_position: Option<f64>) -> Result<(), String> {
    mpv_embed::set_pending_embed(EmbedConfig {
        url,
        title,
        start_position,
        auto_play: true,
    });
    Ok(())
}

#[tauri::command]
async fn embed_mpv_attach(app: AppHandle, label: String) -> Result<(), String> {
    mpv_embed::attach_mpv_window(&app, &label).await
}

#[tauri::command]
fn embed_mpv_stop() -> Result<(), String> {
    mpv_embed::stop_external_mpv()
}

#[tauri::command]
fn embed_mpv_resize(_w: f64, _h: f64) -> Result<(), String> { Ok(()) }

#[tauri::command]
fn embed_mpv_toggle_pause() -> Result<PlayerState, String> { Ok(mpv_embed::toggle_pause()) }

#[tauri::command]
fn embed_mpv_seek(seconds: f64) -> Result<PlayerState, String> { Ok(mpv_embed::seek(seconds)) }

#[tauri::command]
fn embed_mpv_set_volume(volume: f32) -> Result<PlayerState, String> { Ok(mpv_embed::set_volume(volume)) }

#[tauri::command]
fn embed_mpv_set_mute(mute: bool) -> Result<PlayerState, String> { Ok(mpv_embed::set_mute(mute)) }

#[tauri::command]
fn embed_mpv_set_speed(speed: f32) -> Result<PlayerState, String> { Ok(mpv_embed::set_speed(speed)) }

#[tauri::command]
fn embed_mpv_get_state() -> Result<PlayerState, String> { Ok(mpv_embed::get_state()) }

// ===== Provider management =====
#[tauri::command]
async fn add_provider(
    state: State<'_, AppState>,
    provider_id: String,
    config: Value,
) -> Result<(), String> {
    let db = state.db.clone();
    db.save_provider_config(&provider_id, &serde_json::to_string(&config).unwrap_or_default())?;

    if provider_id == "guangya" {
        let mut cfg: GuangyaConfig =
            serde_json::from_value(config.clone()).map_err(|e: serde_json::Error| e.to_string())?;
        if cfg.device_id.is_empty() {
            if let Some(stored) = db.get_device_fingerprint("guangya")? {
                cfg.device_id = stored;
            } else {
                let did = crate::utils::generate_device_id();
                db.save_device_fingerprint("guangya", &did)?;
                cfg.device_id = did;
            }
        } else {
            let _ = db.save_device_fingerprint("guangya", &cfg.device_id);
        }
        state.providers.write().insert(
            provider_id.clone(),
            Box::new(providers::guangya::GuangyaProvider::new(cfg)),
        );
    } else if provider_id == "openlist" {
        let cfg: providers::openlist::OpenListConfig =
            serde_json::from_value(config).map_err(|e| e.to_string())?;
        state.providers.write().insert(provider_id, Box::new(OpenListProvider::new(cfg)));
    } else if provider_id == "webdav" {
        let cfg: providers::webdav::WebDavConfig =
            serde_json::from_value(config).map_err(|e| e.to_string())?;
        state.providers.write().insert(provider_id, Box::new(WebDavProvider::new(cfg)));
    } else if provider_id == "local" {
        let cfg: providers::local::LocalConfig =
            serde_json::from_value(config).map_err(|e| e.to_string())?;
        state.providers.write().insert(provider_id, Box::new(LocalProvider::new(cfg)));
    } else {
        return Err(format!("未知 provider 类型: {}", provider_id));
    }
    Ok(())
}

#[tauri::command]
async fn remove_provider(state: State<'_, AppState>, provider_id: String) -> Result<(), String> {
    state.providers.write().remove(&provider_id);
    state.db.remove_provider_config(&provider_id)?;
    Ok(())
}

#[tauri::command]
async fn test_provider(state: State<'_, AppState>, provider_id: String) -> Result<bool, String> {
    let p = get_provider(&state, &provider_id)?;
    p.test_connection().await
}

#[tauri::command]
async fn list_providers(state: State<'_, AppState>) -> Result<Vec<Value>, String> {
    let db = state.db.clone();
    let cfg_map: HashMap<String, String> = db
        .list_provider_configs()?
        .into_iter()
        .collect();
    let map = state.providers.read();
    let active = state.active_provider.read().clone();
    let mut out: Vec<Value> = Vec::new();
    for (pid, _) in map.iter() {
        let raw = cfg_map.get(pid).cloned().unwrap_or_default();
        let cfg: Value = serde_json::from_str(&raw).unwrap_or(Value::Null);
        out.push(json!({
            "id": pid,
            "name": match pid.as_str() {
                "guangya" => "光鸭云盘",
                "openlist" => "OpenList",
                "webdav" => "WebDAV",
                "local" => "本地磁盘",
                _ => pid.as_str(),
            },
            "config": cfg,
            "active": active.as_deref() == Some(pid.as_str()),
        }));
    }
    Ok(out)
}

#[tauri::command]
async fn set_active_provider(state: State<'_, AppState>, provider_id: String) -> Result<(), String> {
    *state.active_provider.write() = Some(provider_id);
    Ok(())
}

#[tauri::command]
async fn get_active_provider(state: State<'_, AppState>) -> Result<Option<String>, String> {
    Ok(state.active_provider.read().clone())
}

// ===== DB commands =====
#[tauri::command]
async fn db_save_watch_history(
    state: State<'_, AppState>,
    history: WatchHistory,
) -> Result<(), String> {
    state.db.save_watch_history(&history)
}

#[tauri::command]
async fn db_get_watch_history(
    state: State<'_, AppState>,
    provider_id: String,
    path: String,
) -> Result<Option<WatchHistory>, String> {
    state.db.get_watch_history(&provider_id, &path)
}

#[tauri::command]
async fn db_get_recent_history(
    state: State<'_, AppState>,
    limit: Option<u32>,
) -> Result<Vec<WatchHistory>, String> {
    state.db.recent_history(limit.unwrap_or(30))
}

#[tauri::command]
async fn db_get_continue_watching(
    state: State<'_, AppState>,
    limit: Option<u32>,
) -> Result<Vec<WatchHistory>, String> {
    state.db.continue_watching(limit.unwrap_or(12))
}

#[tauri::command]
async fn db_save_media_meta(state: State<'_, AppState>, meta: MediaMeta) -> Result<(), String> {
    state.db.save_media_meta(&meta)
}

#[tauri::command]
async fn db_get_media_meta(
    state: State<'_, AppState>,
    provider_id: String,
    path: String,
) -> Result<Option<MediaMeta>, String> {
    state.db.get_media_meta(&provider_id, &path)
}

#[tauri::command]
async fn db_search_media(
    state: State<'_, AppState>,
    query: String,
    limit: Option<u32>,
) -> Result<Vec<MediaMeta>, String> {
    state.db.search_media(&query, limit.unwrap_or(50))
}

#[tauri::command]
async fn db_get_setting(state: State<'_, AppState>, key: String) -> Result<Option<String>, String> {
    state.db.get_setting(&key)
}

#[tauri::command]
async fn db_save_setting(state: State<'_, AppState>, key: String, value: String) -> Result<(), String> {
    state.db.save_setting(&key, &value)
}

// ===== Scraper =====
#[tauri::command]
async fn search_metadata(query: String, source: Option<String>) -> Result<Vec<ScraperResult>, String> {
    let src = source.unwrap_or_else(|| "tmdb".into());
    match src.as_str() {
        "tmdb" => {
            let key = std::env::var("TMDB_API_KEY").unwrap_or_default();
            if key.is_empty() {
                scraper::search_bangumi(&query).await
            } else {
                scraper::search_tmdb(&query, &key).await
            }
        }
        "douban" => scraper::search_douban(&query).await,
        "bangumi" => scraper::search_bangumi(&query).await,
        _ => Ok(vec![]),
    }
}

#[tauri::command]
async fn get_media_details(source: String, source_id: String) -> Result<Value, String> {
    Ok(json!({
        "source": source,
        "source_id": source_id,
        "detail": null,
    }))
}

#[tauri::command]
fn douban_search(_query: String) -> Result<Value, String> {
    Ok(json!({ "items": [] }))
}

#[tauri::command]
fn bangumi_search(_query: String) -> Result<Value, String> {
    Ok(json!({ "items": [] }))
}

#[tauri::command]
fn fanart_search(_query: String) -> Result<Value, String> {
    Ok(json!({ "items": [] }))
}

#[tauri::command]
fn set_tmdb_api_key(state: State<'_, AppState>, key: String) -> Result<(), String> {
    state.db.save_setting("tmdb_api_key", &key)
}

#[tauri::command]
fn get_tmdb_configured(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(state.db.get_setting("tmdb_api_key")?.map(|s| !s.is_empty()).unwrap_or(false))
}

#[tauri::command]
fn set_fanart_api_key(state: State<'_, AppState>, key: String) -> Result<(), String> {
    state.db.save_setting("fanart_api_key", &key)
}

#[tauri::command]
fn get_fanart_configured(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(state.db.get_setting("fanart_api_key")?.map(|s| !s.is_empty()).unwrap_or(false))
}

// ===== Episode parsing =====
#[tauri::command]
fn parse_episode_filename(name: String) -> Result<Value, String> {
    let re_sxe = regex::Regex::new(r"[Ss](\d{1,2})[Ee](\d{1,3})").ok();
    let re_ep_only = regex::Regex::new(r"(?:^|[^0-9])[Ee][Pp]?(\d{1,3})(?:[^0-9]|$)").ok();
    let re_chs = regex::Regex::new(r"第\s*(\d{1,3})\s*[话集]").ok();
    if let Some(re) = re_sxe {
        if let Some(c) = re.captures(&name) {
            return Ok(json!({
                "season": c.get(1).and_then(|m| m.as_str()).and_then(|s| s.parse::<i32>().ok()),
                "episode": c.get(2).and_then(|m| m.as_str()).and_then(|s| s.parse::<i32>().ok()),
            }));
        }
    }
    if let Some(re) = re_chs {
        if let Some(c) = re.captures(&name) {
            return Ok(json!({
                "season": 1,
                "episode": c.get(1).and_then(|m| m.as_str()).and_then(|s| s.parse::<i32>().ok()),
            }));
        }
    }
    if let Some(re) = re_ep_only {
        if let Some(c) = re.captures(&name) {
            return Ok(json!({
                "season": 1,
                "episode": c.get(1).and_then(|m| m.as_str()).and_then(|s| s.parse::<i32>().ok()),
            }));
        }
    }
    Ok(json!({ "season": null, "episode": null }))
}

#[tauri::command]
fn extract_media_title(name: String) -> Result<String, String> {
    // 去除扩展名
    let no_ext = std::path::Path::new(&name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(&name)
        .to_string();
    // 去除常见标签
    let tags = [
        "1080p", "720p", "2160p", "4K", "HDR", "HEVC", "x264", "x265", "AVC", "WEB-DL",
        "BluRay", "BDRip", "HDTV", "REMUX", "DDP", "Atmos", "AAC", "AC3", "DTS",
    ];
    let mut s = no_ext;
    for t in tags {
        s = s.replace(t, "");
        s = s.replace(&t.to_uppercase(), "");
        s = s.replace(&t.to_lowercase(), "");
    }
    // 去除 [xxx] / (xxx) 内容
    let re_brackets = regex::Regex::new(r"[\[【(][^\]】)]*[\]】)]").ok();
    if let Some(re) = re_brackets {
        s = re.replace_all(&s, "").to_string();
    }
    s = s.trim().trim_matches('.').trim().to_string();
    Ok(s)
}

// ===== Probe =====
#[tauri::command]
fn probe_video_duration(path: String) -> Result<f64, String> {
    let p = PathBuf::from(&path);
    media::probe::probe_video_duration(&p)
}

#[tauri::command]
fn check_ffprobe() -> Result<bool, String> {
    media::probe::check_ffprobe()
}

// ===== Safety / NSFW =====
#[tauri::command]
fn safety_check_filename(name: String) -> Result<NsfwCheckResult, String> {
    Ok(safety::check_filename(&name))
}

#[tauri::command]
fn safety_blur_source(name: String) -> Result<String, String> {
    Ok(safety::blur_source(&name))
}

#[tauri::command]
fn safety_set_auto_hide_nsfw(enable: bool) -> Result<(), String> {
    safety::set_auto_hide(enable);
    Ok(())
}

#[tauri::command]
fn safety_get_auto_hide_nsfw() -> Result<bool, String> {
    Ok(safety::get_auto_hide())
}

#[tauri::command]
fn nsfw_source_check(name: String) -> Result<NsfwCheckResult, String> {
    Ok(safety::check_filename(&name))
}

#[tauri::command]
fn nsfw_source_blur(name: String) -> Result<String, String> {
    Ok(safety::blur_source(&name))
}

// ===== Library =====
#[tauri::command]
async fn library_list_items(
    state: State<'_, AppState>,
    provider_id: Option<String>,
) -> Result<Vec<LibraryItem>, String> {
    let map = state.providers.read();
    let mut out: Vec<LibraryItem> = Vec::new();
    let pid_filter = provider_id;
    for (pid, p) in map.iter() {
        if let Some(filter) = &pid_filter {
            if filter != pid {
                continue;
            }
        }
        match scanner::scan_provider(p.as_ref(), pid).await {
            Ok(items) => out.extend(items),
            Err(_) => {}
        }
    }
    Ok(out)
}

#[tauri::command]
async fn library_get_series_episodes(
    state: State<'_, AppState>,
    provider_id: String,
    folder_id: String,
) -> Result<Vec<FileItem>, String> {
    let p = get_provider(&state, &provider_id)?;
    p.list_folder_videos(&folder_id).await
}

#[tauri::command]
async fn library_scan(state: State<'_, AppState>, provider_id: Option<String>) -> Result<Value, String> {
    {
        let mut running = state.scanner_running.write();
        if *running {
            return Err("扫描已在进行中".into());
        }
        *running = true;
    }
    let map = state.providers.read();
    let mut all = Vec::new();
    for (pid, p) in map.iter() {
        if let Some(ref filter) = provider_id {
            if filter != pid {
                continue;
            }
        }
        if let Ok(items) = scanner::scan_provider(p.as_ref(), pid).await {
            all.extend(items);
        }
    }
    *state.scanner_running.write() = false;
    Ok(json!({ "count": all.len() }))
}

#[tauri::command]
fn library_scan_progress() -> Result<Value, String> {
    Ok(scanner::progress_json())
}

// ===== App =====
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            let data_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
            let _ = std::fs::create_dir_all(&data_dir);
            let db_path = data_dir.join("pankan_look.db");
            let state = AppState::new(&db_path)
                .map_err(|e| format!("初始化 AppState 失败: {}", e))?;
            app.manage(state);

            // 启动本地 HTTP 服务器（占位）
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Ok(srv) = local_server::start().await {
                    eprintln!("[local_server] listening on {}", srv.addr);
                    // 保存端口供前端使用
                    let _ = app_handle;
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Files
            list_files,
            get_file,
            get_sibling_files,
            search_files,
            list_all_media_files,
            list_folder_videos,
            // Stream
            get_stream_url,
            get_play_url,
            get_player_info,
            get_subtitles,
            // Guangya login
            guangya_init_captcha,
            guangya_send_code,
            guangya_verify_code,
            // Embed MPV
            embed_mpv_start,
            embed_mpv_attach,
            embed_mpv_stop,
            embed_mpv_resize,
            embed_mpv_toggle_pause,
            embed_mpv_seek,
            embed_mpv_set_volume,
            embed_mpv_set_mute,
            embed_mpv_set_speed,
            embed_mpv_get_state,
            // Provider
            add_provider,
            remove_provider,
            test_provider,
            list_providers,
            set_active_provider,
            get_active_provider,
            // DB
            db_save_watch_history,
            db_get_watch_history,
            db_get_recent_history,
            db_get_continue_watching,
            db_save_media_meta,
            db_get_media_meta,
            db_search_media,
            db_get_setting,
            db_save_setting,
            // Scraper
            search_metadata,
            get_media_details,
            douban_search,
            bangumi_search,
            fanart_search,
            set_tmdb_api_key,
            get_tmdb_configured,
            set_fanart_api_key,
            get_fanart_configured,
            // Episode
            parse_episode_filename,
            extract_media_title,
            // Probe
            probe_video_duration,
            check_ffprobe,
            // Safety
            safety_check_filename,
            safety_blur_source,
            safety_set_auto_hide_nsfw,
            safety_get_auto_hide_nsfw,
            nsfw_source_check,
            nsfw_source_blur,
            // Library
            library_list_items,
            library_get_series_episodes,
            library_scan,
            library_scan_progress,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
