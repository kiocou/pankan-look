use crate::models::{FileItem, PlayerInfo, SubtitleInfo};
use crate::providers::CloudProvider;
use crate::utils::{generate_device_id, is_video_file, join_human_path, ts_to_iso};
use async_trait::async_trait;
use once_cell::sync::Lazy;
use parking_lot::RwLock;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

const ACCOUNT_BASE: &str = "https://account.guangyapan.com";
const API_BASE: &str = "https://api.guangyapan.com";
const THUMB_BASE: &str = "https://nd.bizuserres.s";
const COMMON_CLIENT_ID: &str = "aMe-8VSlkrbQXpUR";

static PATH_TO_ID_CACHE: Lazy<RwLock<HashMap<String, String>>> =
    Lazy::new(|| RwLock::new(HashMap::new()));

fn build_headers(token: Option<&str>, device_id: &str) -> HeaderMap {
    let mut h = HeaderMap::new();
    let device_sign = format!("wdi10.{}{}", device_id, "x".repeat(32));
    h.insert("X-Device-Model", HeaderValue::from_static("chrome%2F147.0.0.0"));
    h.insert("X-Device-Name", HeaderValue::from_static("PC-Chrome"));
    h.insert("X-Device-Sign", HeaderValue::from_str(&device_sign).unwrap());
    h.insert("X-Net-Work-Type", HeaderValue::from_static("NONE"));
    h.insert("X-OS-Version", HeaderValue::from_static("MacIntel"));
    h.insert("X-Platform-Version", HeaderValue::from_static("1"));
    h.insert("X-Protocol-Version", HeaderValue::from_static("301"));
    h.insert("X-Provider-Name", HeaderValue::from_static("NONE"));
    h.insert("X-SDK-Version", HeaderValue::from_static("9.0.2"));
    h.insert("X-Client-Id", HeaderValue::from_static(COMMON_CLIENT_ID));
    h.insert("X-Client-Version", HeaderValue::from_static("0.0.1"));
    h.insert("X-Device-Id", HeaderValue::from_str(device_id).unwrap());
    if let Some(t) = token {
        h.insert(
            HeaderName::from_bytes(b"Authorization").unwrap(),
            HeaderValue::from_str(&format!("Bearer {}", t)).unwrap(),
        );
    }
    h.insert("Content-Type", HeaderValue::from_static("application/json"));
    h.insert("Accept", HeaderValue::from_static("application/json"));
    h
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GuangyaConfig {
    #[serde(default)]
    pub phone: String,
    #[serde(default)]
    pub device_id: String,
    #[serde(default)]
    pub access_token: String,
    #[serde(default)]
    pub refresh_token: String,
    #[serde(default)]
    pub expires_at: i64,
}

impl GuangyaConfig {
    pub fn effective_device_id(&self) -> String {
        if !self.device_id.is_empty() {
            self.device_id.clone()
        } else {
            self.device_id = generate_device_id();
            self.device_id.clone()
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuangyaCaptcha {
    pub captcha_key: String,
    pub device_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendCodeResult {
    pub verification_id: String,
    pub device_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResult {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefreshResult {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
}

pub async fn init_captcha(phone: &str, device_id: &str) -> Result<GuangyaCaptcha, String> {
    let url = format!("{}/v1/shield/captcha/init", ACCOUNT_BASE);
    let body = json!({
        "client_id": COMMON_CLIENT_ID,
        "action": "verify",
        "device_id": device_id,
        "meta": {
            "phone_number": phone,
            "VERIFICATION_PHONE": true
        }
    });
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;
    let res = client
        .post(&url)
        .headers(build_headers(None, device_id))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("init_captcha 网络错误: {}", e))?;
    let v: Value = res.json().await.map_err(|e| e.to_string())?;
    let key = v
        .get("data")
        .and_then(|d| d.get("captcha_key"))
        .and_then(|x| x.as_str())
        .or_else(|| v.get("captcha_key").and_then(|x| x.as_str()))
        .unwrap_or("")
        .to_string();
    let did = v
        .get("data")
        .and_then(|d| d.get("captcha_url"))
        .and_then(|x| x.as_str())
        .or_else(|| v.get("captcha_url").and_then(|x| x.as_str()))
        .unwrap_or(device_id)
        .to_string();
    Ok(GuangyaCaptcha {
        captcha_key: key,
        device_id: did,
    })
}

pub async fn send_code(
    captcha_key: &str,
    phone: &str,
    captcha_code: &str,
    device_id: &str,
) -> Result<SendCodeResult, String> {
    let url = format!("{}/v1/auth/verification", ACCOUNT_BASE);
    let body = json!({
        "phone_number": phone,
        "target": "ANY",
        "client_id": COMMON_CLIENT_ID,
        "captcha_key": captcha_key,
        "captcha_code": captcha_code,
    });
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;
    let res = client
        .post(&url)
        .headers(build_headers(None, device_id))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("send_code 网络错误: {}", e))?;
    let v: Value = res.json().await.map_err(|e| e.to_string())?;
    let verification_id = v
        .get("data")
        .and_then(|d| d.get("verification_id"))
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string();
    Ok(SendCodeResult {
        verification_id,
        device_id: device_id.to_string(),
    })
}

pub async fn verify_code(
    verification_id: &str,
    phone: &str,
    code: &str,
    device_id: &str,
) -> Result<LoginResult, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())?;

    let verify_url = format!("{}/v1/auth/verification/verify", ACCOUNT_BASE);
    let verify_body = json!({
        "verification_id": verification_id,
        "verification_code": code,
        "client_id": COMMON_CLIENT_ID,
    });
    let verify_res = client
        .post(&verify_url)
        .headers(build_headers(None, device_id))
        .json(&verify_body)
        .send()
        .await
        .map_err(|e| format!("verify 网络错误: {}", e))?;
    let verify_v: Value = verify_res
        .json()
        .await
        .map_err(|e| format!("verify 解析错误: {}", e))?;
    let verification_token = verify_v
        .get("data")
        .and_then(|d| d.get("verification_token"))
        .and_then(|x| x.as_str())
        .or_else(|| verify_v.get("verification_token").and_then(|x| x.as_str()))
        .ok_or_else(|| format!("verify 失败: {:?}", verify_v))?
        .to_string();

    let signin_url = format!("{}/v1/auth/signin", ACCOUNT_BASE);
    let username = if phone.starts_with("+86") {
        phone.to_string()
    } else {
        format!("+86{}", phone)
    };
    let signin_body = json!({
        "verification_code": code,
        "verification_token": verification_token,
        "username": username,
        "client_id": COMMON_CLIENT_ID,
    });
    let signin_res = client
        .post(&signin_url)
        .headers(build_headers(None, device_id))
        .json(&signin_body)
        .send()
        .await
        .map_err(|e| format!("signin 网络错误: {}", e))?;
    let signin_v: Value = signin_res
        .json()
        .await
        .map_err(|e| format!("signin 解析错误: {}", e))?;
    if signin_v
        .get("msg")
        .and_then(|x| x.as_str())
        .map(|s| s != "success")
        .unwrap_or(false)
    {
        return Err(format!("signin 失败: {:?}", signin_v));
    }
    let data = signin_v.get("data").cloned().unwrap_or_default();
    Ok(LoginResult {
        access_token: pick_str(&data, &["access_token", "accessToken"]).unwrap_or_default(),
        refresh_token: pick_str(&data, &["refresh_token", "refreshToken"]).unwrap_or_default(),
        expires_in: data
            .get("expires_in")
            .and_then(|x| x.as_i64())
            .unwrap_or(7200),
    })
}

pub async fn refresh_access_token(
    refresh_token: &str,
    device_id: &str,
) -> Result<RefreshResult, String> {
    let url = format!("{}/v1/auth/token", ACCOUNT_BASE);
    let body = json!({
        "refresh_token": refresh_token,
        "client_id": COMMON_CLIENT_ID,
        "grant_type": "refresh_token",
    });
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;
    let res = client
        .post(&url)
        .headers(build_headers(None, device_id))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("refresh 网络错误: {}", e))?;
    let v: Value = res.json().await.map_err(|e| e.to_string())?;
    let data = v.get("data").cloned().unwrap_or_default();
    Ok(RefreshResult {
        access_token: pick_str(&data, &["access_token", "accessToken"]).unwrap_or_default(),
        refresh_token: pick_str(&data, &["refresh_token", "refreshToken"]).unwrap_or_default(),
        expires_in: data
            .get("expires_in")
            .and_then(|x| x.as_i64())
            .unwrap_or(7200),
    })
}

fn pick_str(v: &Value, keys: &[&str]) -> Option<String> {
    for k in keys {
        if let Some(s) = v.get(*k).and_then(|x| x.as_str()) {
            return Some(s.to_string());
        }
        if let Some(s) = v.get(*k).and_then(|x| x.as_i64()) {
            return Some(s.to_string());
        }
    }
    None
}

fn pick_u64(v: &Value, keys: &[&str]) -> u64 {
    for k in keys {
        if let Some(n) = v.get(*k).and_then(|x| x.as_u64()) {
            return n;
        }
        if let Some(n) = v.get(*k).and_then(|x| x.as_i64()) {
            if n > 0 {
                return n as u64;
            }
        }
    }
    0
}

fn pick_bool(v: &Value, keys: &[&str]) -> Option<bool> {
    for k in keys {
        if let Some(b) = v.get(*k).and_then(|x| x.as_bool()) {
            return Some(b);
        }
    }
    None
}

fn parse_file_item(v: &Value, parent_path: &str) -> FileItem {
    let id = pick_str(v, &["fileId", "file_id", "id", "sign"]).unwrap_or_default();
    let name = pick_str(v, &["fileName", "name"]).unwrap_or_default();
    let size = pick_u64(v, &["fileSize", "size", "file_size"]);
    let ext = pick_str(v, &["ext"]);
    let mime = pick_str(v, &["mime", "mimeType"]);
    let thumb = pick_str(v, &["thumb", "thumbnail", "cover", "icon", "imgUrl", "picUrl"]);

    let modified_ts = pick_u64(v, &["utime", "updateTime", "updatedAt", "updated_at", "mtime"]);
    let modified_time = if modified_ts > 0 {
        Some(ts_to_iso(modified_ts as i64))
    } else {
        None
    };

    // 关键：判断是不是目录
    // 优先级: ext非空 > 已知扩展名 > isFolder布尔 > dirType==1 且无扩展名
    let is_directory = if ext.is_some() {
        false
    } else if is_video_file(&name) {
        false
    } else if let Some(b) = pick_bool(v, &["isFolder", "is_folder", "isDir"]) {
        b
    } else {
        let dir_type = v.get("dirType").and_then(|x| x.as_i64()).unwrap_or(0);
        dir_type == 1
    };

    let final_path = join_human_path(parent_path, &name);

    FileItem {
        id,
        name,
        path: final_path,
        parent_id: pick_str(v, &["parentId", "parent_id"]),
        is_directory,
        size,
        modified_time,
        thumbnail: thumb,
        mime,
        ext,
    }
}

pub struct GuangyaProvider {
    pub config: Arc<RwLock<GuangyaConfig>>,
    pub client: reqwest::Client,
}

impl GuangyaProvider {
    pub fn new(config: GuangyaConfig) -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("reqwest client");
        Self {
            config: Arc::new(RwLock::new(config)),
            client,
        }
    }

    fn snapshot(&self) -> GuangyaConfig {
        self.config.read().clone()
    }

    async fn do_list(&self, parent_id: &str, page: u32) -> Result<Value, String> {
        let cfg = self.snapshot();
        let token = cfg.access_token.clone();
        let device_id = cfg.effective_device_id();
        let url = format!("{}/userres/v1/file/get_file_list", API_BASE);
        let body = json!({
            "pageSize": 100,
            "orderBy": 3,
            "sortType": 1,
            "parentId": parent_id,
            "page": page,
        });
        let res = self
            .client
            .post(&url)
            .headers(build_headers(Some(&token), &device_id))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("list_files 网络错误: {}", e))?;
        res.json::<Value>()
            .await
            .map_err(|e| format!("list_files 解析错误: {}", e))
    }

    fn resolve_parent_id(&self, path: &str) -> Result<String, String> {
        if path == "/" || path == "." || path.is_empty() {
            return Ok(String::new());
        }
        if path
            .chars()
            .next()
            .map(|c| c.is_ascii_digit())
            .unwrap_or(false)
        {
            return Ok(path.to_string());
        }
        let cache = PATH_TO_ID_CACHE.read();
        cache
            .get(path)
            .cloned()
            .ok_or_else(|| format!("[Guangya] 路径 '{}' 不在缓存中", path))
    }
}

#[async_trait]
impl CloudProvider for GuangyaProvider {
    fn id(&self) -> &str {
        "guangya"
    }
    fn name(&self) -> &str {
        "光鸭云盘"
    }
    fn provider_type(&self) -> &str {
        "guangya"
    }

    async fn test_connection(&self) -> Result<bool, String> {
        let cfg = self.snapshot();
        if cfg.access_token.is_empty() {
            return Err("未登录".into());
        }
        self.list_files("/").await.map(|_| Ok(true)).unwrap_or(Ok(false))
    }

    async fn list_files(&self, path: &str) -> Result<Vec<FileItem>, String> {
        let parent_id = match self.resolve_parent_id(path) {
            Ok(id) => id,
            Err(e) => {
                eprintln!("{}", e);
                return Ok(vec![]);
            }
        };

        let v = self.do_list(&parent_id, 0).await?;
        let msg_ok = v
            .get("msg")
            .and_then(|x| x.as_str())
            .map(|s| s == "success")
            .unwrap_or(true);
        if !msg_ok {
            return Err(format!("list_files 业务失败: {:?}", v));
        }
        let data = v.get("data").cloned().unwrap_or_default();
        let list = data
            .get("list")
            .or_else(|| data.get("items"))
            .or_else(|| data.get("files"))
            .and_then(|x| x.as_array())
            .cloned()
            .unwrap_or_default();

        let parent_path = if path == "/" || path.is_empty() {
            String::new()
        } else {
            path.to_string()
        };

        let mut out = Vec::with_capacity(list.len());
        for item in list {
            let fi = parse_file_item(&item, &parent_path);
            if fi.is_directory && !fi.id.is_empty() {
                PATH_TO_ID_CACHE
                    .write()
                    .insert(fi.path.clone(), fi.id.clone());
            }
            out.push(fi);
        }
        Ok(out)
    }

    async fn get_file(&self, path: &str) -> Result<FileItem, String> {
        let cfg = self.snapshot();
        let token = cfg.access_token.clone();
        let device_id = cfg.effective_device_id();
        let file_id = match self.resolve_parent_id(path) {
            Ok(id) => id,
            Err(_) => path.to_string(),
        };
        let url = format!("{}/userres/v1/file/get_file_info", API_BASE);
        let body = json!({ "fileId": file_id });
        let res = self
            .client
            .post(&url)
            .headers(build_headers(Some(&token), &device_id))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("get_file 网络错误: {}", e))?;
        let v: Value = res.json().await.map_err(|e| e.to_string())?;
        let data = v.get("data").cloned().unwrap_or_default();
        let parent_path = std::path::Path::new(path)
            .parent()
            .and_then(|p| p.to_str())
            .map(|s| s.replace('\\', "/"))
            .unwrap_or_default();
        Ok(parse_file_item(&data, &parent_path))
    }

    async fn get_sibling_files(&self, _path: &str) -> Result<Vec<FileItem>, String> {
        Ok(vec![])
    }

    async fn search_files(
        &self,
        query: &str,
        parent: Option<&str>,
    ) -> Result<Vec<FileItem>, String> {
        let cfg = self.snapshot();
        let token = cfg.access_token.clone();
        let device_id = cfg.effective_device_id();
        let url = format!("{}/userres/v1/file/search_files", API_BASE);
        let mut body = json!({
            "name": query,
            "page": 0,
            "pageSize": 100,
        });
        if let Some(p) = parent {
            body["parentId"] = json!(p);
        }
        let res = self
            .client
            .post(&url)
            .headers(build_headers(Some(&token), &device_id))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("search 网络错误: {}", e))?;
        let v: Value = res.json().await.map_err(|e| e.to_string())?;
        let data = v.get("data").cloned().unwrap_or_default();
        let list = data
            .get("list")
            .and_then(|x| x.as_array())
            .cloned()
            .unwrap_or_default();
        let mut out = Vec::with_capacity(list.len());
        for item in list {
            out.push(parse_file_item(&item, ""));
        }
        Ok(out)
    }

    async fn list_all_media_files(&self) -> Result<Vec<FileItem>, String> {
        self.list_files("/").await
    }

    async fn list_folder_videos(&self, folder_id: &str) -> Result<Vec<FileItem>, String> {
        let parent_id = if folder_id.is_empty() {
            String::new()
        } else {
            folder_id.to_string()
        };
        let v = self.do_list(&parent_id, 0).await?;
        let data = v.get("data").cloned().unwrap_or_default();
        let list = data
            .get("list")
            .and_then(|x| x.as_array())
            .cloned()
            .unwrap_or_default();
        let parent_path = String::new();
        let mut out = Vec::with_capacity(list.len());
        for item in list {
            let fi = parse_file_item(&item, &parent_path);
            if !fi.is_directory && is_video_file(&fi.name) {
                out.push(fi);
            }
        }
        Ok(out)
    }

    async fn get_stream_url(&self, path: &str) -> Result<String, String> {
        let info = self.get_player_info(path).await?;
        Ok(info.play_url.unwrap_or(info.url))
    }

    async fn get_play_url(&self, path: &str) -> Result<String, String> {
        self.get_stream_url(path).await
    }

    async fn get_player_info(&self, path: &str) -> Result<PlayerInfo, String> {
        let cfg = self.snapshot();
        let token = cfg.access_token.clone();
        let device_id = cfg.effective_device_id();
        let file_id = match self.resolve_parent_id(path) {
            Ok(id) => id,
            Err(_) => path.to_string(),
        };
        let url = format!("{}/userres/v1/file/get_vod_download_url", API_BASE);
        let body = json!({ "fileId": file_id });
        let res = self
            .client
            .post(&url)
            .headers(build_headers(Some(&token), &device_id))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("get_vod_download_url 网络错误: {}", e))?;
        let v: Value = res.json().await.map_err(|e| e.to_string())?;
        let data = v.get("data").cloned().unwrap_or_default();
        let direct = pick_str(&data, &["download_url", "signedURL", "url", "playUrl"])
            .or_else(|| pick_str(&v, &["download_url", "signedURL", "url", "playUrl"]));

        let final_url = if direct.is_some() {
            direct.unwrap()
        } else {
            // 回退到 get_res_download_url
            let url2 = format!("{}/userres/v1/get_res_download_url", API_BASE);
            let res2 = self
                .client
                .post(&url2)
                .headers(build_headers(Some(&token), &device_id))
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("get_res_download_url 网络错误: {}", e))?;
            let v2: Value = res2.json().await.map_err(|e| e.to_string())?;
            let data2 = v2.get("data").cloned().unwrap_or_default();
            pick_str(&data2, &["download_url", "signedURL", "url", "playUrl"])
                .or_else(|| pick_str(&v2, &["download_url", "signedURL", "url", "playUrl"]))
                .ok_or_else(|| "无法获取播放地址".to_string())?
        };

        let subtitles = self.get_subtitles(path).await.unwrap_or_default();
        Ok(PlayerInfo {
            url: final_url.clone(),
            play_url: Some(final_url),
            download_url: None,
            headers: None,
            subtitles,
            video_duration: None,
            format: None,
        })
    }

    async fn get_subtitles(&self, path: &str) -> Result<Vec<SubtitleInfo>, String> {
        let cfg = self.snapshot();
        let token = cfg.access_token.clone();
        let device_id = cfg.effective_device_id();
        let file_id = match self.resolve_parent_id(path) {
            Ok(id) => id,
            Err(_) => path.to_string(),
        };
        let url = format!("{}/misc/v1/get_subtitles", API_BASE);
        let body = json!({ "fileId": file_id });
        let res = self
            .client
            .post(&url)
            .headers(build_headers(Some(&token), &device_id))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("get_subtitles 网络错误: {}", e))?;
        let v: Value = res.json().await.map_err(|e| e.to_string())?;
        let list = v
            .get("data")
            .and_then(|d| d.get("list"))
            .and_then(|x| x.as_array())
            .cloned()
            .unwrap_or_default();
        let mut out = Vec::with_capacity(list.len());
        for s in list {
            out.push(SubtitleInfo {
                id: pick_str(&s, &["id", "subId"]).unwrap_or_default(),
                name: pick_str(&s, &["name", "fileName"]).unwrap_or_default(),
                language: pick_str(&s, &["language", "lang"]),
                url: pick_str(&s, &["url", "downloadUrl"]),
                format: pick_str(&s, &["format", "ext"]),
            });
        }
        Ok(out)
    }

    fn update_config(&mut self, config: &Value) {
        if let Ok(c) = serde_json::from_value::<GuangyaConfig>(config.clone()) {
            *self.config.write() = c;
        }
    }
}

trait _Unused {}
