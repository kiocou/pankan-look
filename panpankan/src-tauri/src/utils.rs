use serde::{Deserialize, Serialize};
use std::path::Path;

pub fn ts_to_iso(ts: i64) -> String {
    use chrono::{DateTime, Utc};
    DateTime::<Utc>::from_timestamp(ts, 0)
        .map(|d| d.to_rfc3339())
        .unwrap_or_default()
}

pub fn ms_to_iso(ms: i64) -> String {
    use chrono::{DateTime, Utc};
    DateTime::<Utc>::from_timestamp_millis(ms)
        .map(|d| d.to_rfc3339())
        .unwrap_or_default()
}

pub fn generate_device_id() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let bytes: [u8; 16] = rng.gen();
    hex::encode(bytes)
}

pub fn md5_hex(s: &str) -> String {
    format!("{:x}", md5::compute(s.as_bytes()))
}

pub fn sha256_hex(s: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(s.as_bytes());
    hex::encode(hasher.finalize())
}

pub fn join_human_path(parent: &str, name: &str) -> String {
    if parent.is_empty() || parent == "/" {
        format!("/{}", name)
    } else {
        format!("{}/{}", parent.trim_end_matches('/'), name)
    }
}

pub fn is_video_file(name: &str) -> bool {
    let exts = [
        "mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "m4v", "ts", "m2ts", "mpg", "mpeg",
        "rmvb", "rm", "asf",
    ];
    Path::new(name)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| exts.contains(&e.to_lowercase().as_str()))
        .unwrap_or(false)
}

pub fn is_subtitle_file(name: &str) -> bool {
    let exts = ["srt", "ass", "ssa", "vtt", "sub"];
    Path::new(name)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| exts.contains(&e.to_lowercase().as_str()))
        .unwrap_or(false)
}

pub fn format_size(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    if bytes == 0 {
        return "0 B".into();
    }
    let exp = (bytes as f64).log(1024.0).floor() as usize;
    let exp = exp.min(UNITS.len() - 1);
    let val = bytes as f64 / 1024_f64.powi(exp as i32);
    format!("{:.2} {}", val, UNITS[exp])
}
