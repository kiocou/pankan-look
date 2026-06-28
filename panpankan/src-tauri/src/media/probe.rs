use std::path::PathBuf;
use std::process::Command;

pub fn check_ffprobe() -> Result<bool, String> {
    let which = if cfg!(target_os = "windows") { "where" } else { "which" };
    let output = Command::new(which).arg("ffprobe").output();
    match output {
        Ok(o) => Ok(o.status.success()),
        Err(_) => Ok(false),
    }
}

pub fn probe_video_duration(path: &PathBuf) -> Result<f64, String> {
    let output = Command::new("ffprobe")
        .args([
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
        ])
        .arg(path)
        .output();
    match output {
        Ok(o) if o.status.success() => {
            let s = String::from_utf8_lossy(&o.stdout).trim().to_string();
            s.parse::<f64>().map_err(|e| e.to_string())
        }
        Ok(o) => Err(String::from_utf8_lossy(&o.stderr).to_string()),
        Err(e) => Err(e.to_string()),
    }
}

pub fn probe_url(url: &str) -> Result<f64, String> {
    let output = Command::new("ffprobe")
        .args([
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            url,
        ])
        .output();
    match output {
        Ok(o) if o.status.success() => {
            let s = String::from_utf8_lossy(&o.stdout).trim().to_string();
            s.parse::<f64>().map_err(|e| e.to_string())
        }
        Ok(_) => Ok(0.0),
        Err(e) => Err(e.to_string()),
    }
}
