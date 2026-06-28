use crate::models::FileItem;
use crate::providers::CloudProvider;
use crate::utils::{is_video_file, join_human_path};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LocalConfig {
    #[serde(default)]
    pub root: String,
}

pub struct LocalProvider {
    pub config: parking_lot::RwLock<LocalConfig>,
}

impl LocalProvider {
    pub fn new(config: LocalConfig) -> Self {
        Self {
            config: parking_lot::RwLock::new(config),
        }
    }
}

#[async_trait]
impl CloudProvider for LocalProvider {
    fn id(&self) -> &str {
        "local"
    }
    fn name(&self) -> &str {
        "本地磁盘"
    }
    fn provider_type(&self) -> &str {
        "local"
    }

    async fn test_connection(&self) -> Result<bool, String> {
        let cfg = self.config.read().clone();
        let p = PathBuf::from(&cfg.root);
        if p.exists() {
            Ok(true)
        } else {
            Err(format!("路径不存在: {}", cfg.root))
        }
    }

    async fn list_files(&self, path: &str) -> Result<Vec<FileItem>, String> {
        let cfg = self.config.read().clone();
        let base = PathBuf::from(&cfg.root);
        let target = if path == "/" || path.is_empty() {
            base.clone()
        } else {
            base.join(path.trim_start_matches('/'))
        };
        let entries = std::fs::read_dir(&target)
            .map_err(|e| format!("读取目录失败: {}", e))?;
        let parent_path = if path == "/" {
            String::new()
        } else {
            path.to_string()
        };
        let mut out = Vec::new();
        for entry in entries.flatten() {
            let ft = entry.file_type().ok();
            let is_dir = ft.as_ref().map(|t| t.is_dir()).unwrap_or(false);
            let name = entry.file_name().to_string_lossy().to_string();
            let meta = entry.metadata().ok();
            let modified = meta
                .as_ref()
                .and_then(|m| m.modified().ok())
                .map(|t| chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339());
            out.push(FileItem {
                id: name.clone(),
                name: name.clone(),
                path: join_human_path(&parent_path, &name),
                parent_id: Some(path.to_string()),
                is_directory: is_dir,
                size: meta.as_ref().map(|m| m.len()).unwrap_or(0),
                modified_time: modified,
                thumbnail: None,
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
        let cfg = self.config.read().clone();
        let base = PathBuf::from(&cfg.root);
        let target = base.join(path.trim_start_matches('/'));
        let meta = std::fs::metadata(&target).map_err(|e| e.to_string())?;
        let name = target
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        let parent = target
            .parent()
            .and_then(|p| p.to_str())
            .map(|s| s.replace('\\', "/"))
            .unwrap_or_else(|| "/".to_string());
        let ext = std::path::Path::new(&name)
            .extension()
            .and_then(|e| e.to_str())
            .map(|s| s.to_string());
        Ok(FileItem {
            id: name.clone(),
            name,
            path: path.to_string(),
            parent_id: Some(parent),
            is_directory: meta.is_dir(),
            size: meta.len(),
            modified_time: meta
                .modified()
                .ok()
                .map(|t| chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339()),
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
        let base = PathBuf::from(&cfg.root);
        let target = base.join(path.trim_start_matches('/'));
        let url = format!("file://{}", target.display());
        Ok(url)
    }

    async fn get_play_url(&self, path: &str) -> Result<String, String> {
        self.get_stream_url(path).await
    }
}

#[allow(dead_code)]
fn _suppress(_v: &serde_json::Value) {
    let _ = json!({});
}
