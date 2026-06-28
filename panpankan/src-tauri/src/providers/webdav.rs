use crate::models::FileItem;
use crate::providers::CloudProvider;
use crate::utils::{is_video_file, join_human_path};
use async_trait::async_trait;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WebDavConfig {
    #[serde(default)]
    pub base_url: String,
    #[serde(default)]
    pub username: String,
    #[serde(default)]
    pub password: String,
}

pub struct WebDavProvider {
    pub config: parking_lot::RwLock<WebDavConfig>,
    pub client: reqwest::Client,
}

impl WebDavProvider {
    pub fn new(config: WebDavConfig) -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .danger_accept_invalid_certs(true)
            .build()
            .expect("reqwest client");
        Self {
            config: parking_lot::RwLock::new(config),
            client,
        }
    }

    fn auth_header(&self) -> String {
        use base64::Engine;
        let cfg = self.config.read().clone();
        let token = base64::engine::general_purpose::STANDARD
            .encode(format!("{}:{}", cfg.username, cfg.password));
        format!("Basic {}", token)
    }
}

#[async_trait]
impl CloudProvider for WebDavProvider {
    fn id(&self) -> &str {
        "webdav"
    }
    fn name(&self) -> &str {
        "WebDAV"
    }
    fn provider_type(&self) -> &str {
        "webdav"
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
        let url = format!("{}{}", cfg.base_url.trim_end_matches('/'), path);
        let res = self
            .client
            .request(reqwest::Method::from_bytes(b"PROPFIND").unwrap(), &url)
            .header(AUTHORIZATION, self.auth_header())
            .header("Depth", "1")
            .send()
            .await
            .map_err(|e| format!("webdav list: {}", e))?;
        let text = res.text().await.map_err(|e| e.to_string())?;
        // 简化解析：XML 解析较繁，演示阶段从响应中抽出 href
        let mut out = Vec::new();
        let parent_path = if path == "/" {
            String::new()
        } else {
            path.to_string()
        };
        for line in text.lines() {
            if let Some(href_start) = line.find("<href>") {
                if let Some(href_end) = line.find("</href>") {
                    let href = &line[href_start + 6..href_end];
                    let name = href
                        .trim_end_matches('/')
                        .rsplit('/')
                        .next()
                        .unwrap_or("")
                        .to_string();
                    if name.is_empty() {
                        continue;
                    }
                    let is_dir = line.contains("<resourcetype><collection");
                    out.push(FileItem {
                        id: name.clone(),
                        name: name.clone(),
                        path: join_human_path(&parent_path, &name),
                        parent_id: Some(path.to_string()),
                        is_directory: is_dir,
                        size: 0,
                        modified_time: None,
                        thumbnail: None,
                        mime: None,
                        ext: std::path::Path::new(&name)
                            .extension()
                            .and_then(|e| e.to_str())
                            .map(|s| s.to_string()),
                    });
                }
            }
        }
        Ok(out)
    }

    async fn get_file(&self, path: &str) -> Result<FileItem, String> {
        let name = std::path::Path::new(path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        let parent = std::path::Path::new(path)
            .parent()
            .and_then(|p| p.to_str())
            .unwrap_or("/")
            .to_string();
        let ext = std::path::Path::new(&name)
            .extension()
            .and_then(|e| e.to_str())
            .map(|s| s.to_string());
        Ok(FileItem {
            id: name.clone(),
            name,
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
        Ok(format!("{}{}", cfg.base_url.trim_end_matches('/'), path))
    }

    async fn get_play_url(&self, path: &str) -> Result<String, String> {
        self.get_stream_url(path).await
    }
}

#[allow(dead_code)]
fn _suppress_warnings(_h: &HeaderMap, _v: &HeaderValue, _j: &Value) {}
