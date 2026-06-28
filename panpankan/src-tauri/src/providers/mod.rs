use crate::models::{FileItem, PlayerInfo, SubtitleInfo};
use async_trait::async_trait;
use serde_json::Value;
use std::collections::HashMap;

#[async_trait]
pub trait CloudProvider: Send + Sync {
    fn id(&self) -> &str;
    fn name(&self) -> &str;
    fn provider_type(&self) -> &str;
    async fn test_connection(&self) -> Result<bool, String>;
    async fn list_files(&self, path: &str) -> Result<Vec<FileItem>, String>;
    async fn get_file(&self, path: &str) -> Result<FileItem, String>;
    async fn get_sibling_files(&self, path: &str) -> Result<Vec<FileItem>, String>;
    async fn search_files(&self, query: &str, parent: Option<&str>) -> Result<Vec<FileItem>, String>;
    async fn list_all_media_files(&self) -> Result<Vec<FileItem>, String>;
    async fn list_folder_videos(&self, folder_id: &str) -> Result<Vec<FileItem>, String>;
    async fn get_stream_url(&self, path: &str) -> Result<String, String>;
    async fn get_play_url(&self, path: &str) -> Result<String, String>;
    async fn get_player_info(&self, path: &str) -> Result<PlayerInfo, String> {
        let url = self.get_stream_url(path).await?;
        Ok(PlayerInfo {
            url,
            play_url: None,
            download_url: None,
            headers: None,
            subtitles: Vec::<SubtitleInfo>::new(),
            video_duration: None,
            format: None,
        })
    }
    async fn get_subtitles(&self, _path: &str) -> Result<Vec<SubtitleInfo>, String> {
        Ok(vec![])
    }
    fn update_config(&mut self, _config: &Value) {}
}

pub type ProviderMap = HashMap<String, Box<dyn CloudProvider>>;
