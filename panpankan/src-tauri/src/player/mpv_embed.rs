// 外部 MPV 播放器：通过 mpv 命令行打开 URL，由用户自己管 MPV 窗口。
//
// 找 mpv 二进制的优先级：
//   1. <CARGO_MANIFEST_DIR>/../mpv-lazy/mpv.exe        (开发期本地包)
//   2. <resource_dir>/mpv-lazy/mpv.exe                 (打包后随安装包)
//   3. 系统 PATH 上的 `mpv`
//
// 不再嵌入 webview 子窗口、不再 IPC、不再 HWND 绑定 —— 一切交给外部 mpv 自己。

use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::Manager;

fn find_mpv_path(app: &tauri::AppHandle) -> PathBuf {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let p = manifest_dir
        .parent()
        .unwrap_or(&manifest_dir)
        .join("mpv-lazy")
        .join(if cfg!(target_os = "windows") {
            "mpv.exe"
        } else {
            "mpv"
        });
    if p.exists() {
        return p;
    }
    if let Ok(dir) = app.path().resource_dir() {
        let p = dir.join("mpv-lazy").join(if cfg!(target_os = "windows") {
            "mpv.exe"
        } else {
            "mpv"
        });
        if p.exists() {
            return p;
        }
    }
    PathBuf::from("mpv")
}

/// 启动外部 mpv 打开 url。如果 mpv 不可用就回退到系统默认播放器。
pub fn open_with_external_mpv(app: &tauri::AppHandle, url: &str) -> Result<(), String> {
    let mpv_path = find_mpv_path(app);
    let title = url.rsplit(['/', '\\']).next().unwrap_or("pankan-look");

    let res = Command::new(&mpv_path)
        .args([
            "--force-window",
            "--keep-open=always",
            &format!("--title={}", title),
            url,
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn();

    match res {
        Ok(_) => Ok(()),
        Err(e) => {
            eprintln!(
                "[mpv] 无法启动 {:?} ({}), 回退到系统默认播放器",
                mpv_path, e
            );
            open_with_system_player(url)
        }
    }
}

pub fn open_with_system_player(url: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/c", "start", "", url])
            .spawn()
            .map_err(|e| format!("打开系统播放器失败: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(url)
            .spawn()
            .map_err(|e| format!("打开系统播放器失败: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(url)
            .spawn()
            .map_err(|e| format!("打开系统播放器失败: {}", e))?;
    }
    Ok(())
}
