use crate::models::FileItem;
use crate::providers::CloudProvider;
use crate::utils::{is_video_file, join_human_path};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct OpenListConfig {
    #[serde(default)]
    pub base_url: String,
    #[serde(default)]
    pub token: String,
    #[serde(default)]
    pub username: String,
    #[serde(default)]
    pub password: String,
}

pub struct OpenListProvider {
    pub config: parking_lot::RwLock<OpenListConfig>,
    pub client: reqwest::Client,
}

impl OpenListProvider {
    pub fn new(config: OpenListConfig) -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("reqwest client");
        Self {
            config: parking_lot::RwLock::new(config),
            client,
        }
    }
}

#[async_trait]
impl CloudProvider for OpenListProvider {
    fn id(&self) -> &str {
        "openlist"
    }
    fn name(&self) -> &str {
        "OpenList"
    }
    fn provider_type(&self) -> &str {
        "openlist"
    }

    async fn test_connection(&self) -> Result<bool, String> {
        let cfg = self.config.read().clone();
        if cfg.base_url.is_empty() {
            return Err("base_url 未配置".into());
        }
        Ok(true)
    }

    async fn list_files(&self, path: &str) -> Result<Vec<FileItem>, String> {
        let cfg = self.config.read().clone();
        let url = format!("{}/api/fs/list", cfg.base_url.trim_end_matches('/'));
        let body = json!({
            "path": path,
            "password": "",
            "page": 1,
            "per_page": 0,
            "refresh": false,
        });
        let res = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", cfg.token))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("openlist list: {}", e))?;
        let v: Value = res.json().await.map_err(|e| e.to_string())?;
        let data = v.get("data").cloned().unwrap_or_default();
        let content = data
            .get("content")
            .and_then(|x| x.as_array())
            .cloned()
            .unwrap_or_default();
        let parent_path = if path == "/" {
            String::new()
        } else {
            path.to_string()
        };
        let mut out = Vec::with_capacity(content.len());
        for item in content {
            let name = item.get("name").and_then(|x| x.as_str()).unwrap_or("").to_string();
            let is_dir = item
                .get("is_dir")
                .and_then(|x| x.as_bool())
                .unwrap_or(false);
            let size = item.get("size").and_then(|x| x.as_u64()).unwrap_or(0);
            let modified = item.get("modified").and_then(|x| x.as_str()).map(|s| s.to_string());
            let thumb = item.get("thumb").and_then(|x| x.as_str()).map(|s| s.to_string());
            out.push(FileItem {
                id: name.clone(),
                name: name.clone(),
                path: join_human_path(&parent_path, &name),
                parent_id: Some(path.to_string()),
                is_directory: is_dir,
                size,
                modified_time: modified,
                thumbnail: thumb,
                mime: None,
                ext: std::path::Path::new(&name)
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|s| s.to_string()),
            });
        }
        Ok(out)
    }

    async fn get_file(&self, path: &str) -> Result<FileItem, String> {
        let parent = std::path::Path::new(path)
            .parent()
            .and_then(|p| p.to_str())
            .map(|s| s.replace('\\', "/"))
            .unwrap_or_else(|| "/".to_string());
        let name = std::path::Path::new(path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        let ext = std::path::Path::new(&name)
            .extension()
            .and_then(|e| e.to_str())
            .map(|s| s.to_string());
        Ok(FileItem {
            id: name.clone(),
            name: name.clone(),
            path: path.to_string(),
            parent_id: Some(parent),
            is_directory: !is_video_file(&name) && ext.is_none(),
            size: 0,
            modified_time: None,
            thumbnail: None,
            mime: None,
            ext,
        })
    }

    async fn get_sibling_files(&self, path: &str) -> Result<Vec<FileItem>, String> {
        let parent = std::path::Path::new(path)
            .parent()
            .and_then(|p| p.to_str())
            .map(|s| s.replace('\\', "/"))
            .unwrap_or_else(|| "/".to_string());
        self.list_files(&parent).await
    }

    async fn search_files(
        &self,
        _query: &str,
        _parent: Option<&str>,
    ) -> Result<Vec<FileItem>, String> {
        Ok(vec![])
    }

    async fn list_all_media_files(&self) -> Result<Vec<FileItem>, String> {
        Ok(vec![])
    }

    async fn list_folder_videos(&self, folder_id: &str) -> Result<Vec<FileItem>, String> {
        let files = self.list_files(folder_id).await?;
        Ok(files
            .into_iter()
            .filter(|f| !f.is_directory && is_video_file(&f.name))
            .collect())
    }

    async fn get_stream_url(&self, path: &str) -> Result<String, String> {
        let cfg = self.config.read().clone();
        let url = format!("{}/api/fs/get", cfg.base_url.trim_end_matches('/'));
        let body = json!({ "path": path, "password": "" });
        let res = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", cfg.token))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("openlist get: {}", e))?;
        let v: Value = res.json().await.map_err(|e| e.to_string())?;
        let raw = v
            .get("data")
            .and_then(|d| d.get("raw_url"))
            .and_then(|x| x.as_str())
            .ok_or_else(|| "raw_url 缺失".to_string())?;
        Ok(raw.to_string())
    }

    async fn get_play_url(&self, path: &str) -> Result<String, String> {
        self.get_stream_url(path).await
    }
}
