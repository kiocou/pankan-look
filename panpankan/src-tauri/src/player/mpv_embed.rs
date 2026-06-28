// MPV 嵌入层 —— 桌面端最强画质播放
// 真实实现需要 libmpv + wgpu/d3d11 渲染，简化为状态机和命令接口。

use crate::player::{EmbedConfig, PlayerState};
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

static PENDING_EMBED: Mutex<Option<EmbedConfig>> = Mutex::new(None);

pub fn set_pending_embed(cfg: EmbedConfig) {
    *PENDING_EMBED.lock() = Some(cfg);
}

pub fn take_pending_embed() -> Option<EmbedConfig> {
    PENDING_EMBED.lock().take()
}

pub async fn attach_mpv_window(app: &AppHandle, _label: &str) -> Result<(), String> {
    let cfg = take_pending_embed().ok_or("无待播放内容")?;
    let url = cfg.url.clone();
    let title = cfg.title.clone().unwrap_or_default();
    // 真实实现: 创建 mpv_render_context + wgpu 纹理，将视频帧绘制到 webview 容器。
    // 此处保留为占位实现，调用外部 mpv 进程并把窗口句柄嵌入 webview。
    let _ = std::process::Command::new("mpv")
        .args([
            "--force-window",
            "--no-border",
            &format!("--title={}", title),
            &url,
        ])
        .spawn()
        .map_err(|e| format!("启动 mpv 失败: {}", e))?;
    let _ = app.get_webview_window("embed");
    Ok(())
}

pub fn stop_external_mpv() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/IM", "mpv.exe"])
            .output();
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = std::process::Command::new("pkill").arg("mpv").output();
    }
    Ok(())
}

pub fn toggle_pause() -> PlayerState {
    PlayerState::default()
}

pub fn seek(_seconds: f64) -> PlayerState {
    PlayerState::default()
}

pub fn set_volume(_vol: f32) -> PlayerState {
    PlayerState::default()
}

pub fn set_mute(_mute: bool) -> PlayerState {
    PlayerState::default()
}

pub fn set_speed(_speed: f32) -> PlayerState {
    PlayerState::default()
}

pub fn get_state() -> PlayerState {
    PlayerState::default()
}

pub fn make_arc() -> Arc<Mutex<PlayerState>> {
    Arc::new(Mutex::new(PlayerState::default()))
}
