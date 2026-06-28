use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FileItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub parent_id: Option<String>,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
    pub size: u64,
    #[serde(rename = "modifiedTime")]
    pub modified_time: Option<String>,
    pub thumbnail: Option<String>,
    pub mime: Option<String>,
    pub ext: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SubtitleInfo {
    pub id: String,
    pub name: String,
    pub language: Option<String>,
    pub url: Option<String>,
    pub format: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerInfo {
    pub url: String,
    #[serde(rename = "playUrl")]
    pub play_url: Option<String>,
    #[serde(rename = "downloadUrl")]
    pub download_url: Option<String>,
    pub headers: Option<serde_json::Value>,
    pub subtitles: Vec<SubtitleInfo>,
    #[serde(rename = "videoDuration")]
    pub video_duration: Option<f64>,
    pub format: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WatchHistory {
    pub id: i64,
    pub provider_id: String,
    pub path: String,
    pub name: String,
    pub position: f64,
    pub duration: f64,
    pub updated_at: String,
    pub thumbnail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MediaMeta {
    pub id: i64,
    pub provider_id: String,
    pub path: String,
    pub title: String,
    pub year: Option<i32>,
    pub season: Option<i32>,
    pub episode: Option<i32>,
    pub poster: Option<String>,
    pub backdrop: Option<String>,
    pub overview: Option<String>,
    pub rating: Option<f32>,
    pub genres: Option<String>,
    pub source: Option<String>,
    pub source_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProviderInfo {
    pub id: String,
    #[serde(rename = "type")]
    pub provider_type: String,
    pub name: String,
    pub enabled: bool,
    pub config: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProviderSession {
    pub provider_id: String,
    pub access_token: Option<String>,
    pub refresh_token: Option<String>,
    pub expires_at: Option<i64>,
    pub phone: Option<String>,
    pub device_id: Option<String>,
    pub extra: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ScraperResult {
    pub source: String,
    pub source_id: String,
    pub title: String,
    pub year: Option<i32>,
    pub poster: Option<String>,
    pub backdrop: Option<String>,
    pub overview: Option<String>,
    pub rating: Option<f32>,
    pub genres: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct NsfwCheckResult {
    pub is_nsfw: bool,
    pub matched_keywords: Vec<String>,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LibraryItem {
    pub id: i64,
    pub provider_id: String,
    pub path: String,
    pub name: String,
    pub kind: String,
    pub poster: Option<String>,
    pub backdrop: Option<String>,
    pub year: Option<i32>,
    pub rating: Option<f32>,
    pub overview: Option<String>,
    pub episode_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ScanProgress {
    pub phase: String,
    pub current: u64,
    pub total: u64,
    pub message: Option<String>,
}
