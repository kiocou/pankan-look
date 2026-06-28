use crate::models::ScraperResult;
use serde_json::Value;
use std::time::Duration;

pub struct ScraperConfig {
    pub tmdb_api_key: Option<String>,
    pub fanart_api_key: Option<String>,
    pub douban_enabled: bool,
    pub bangumi_enabled: bool,
    pub javbus_enabled: bool,
}

impl Default for ScraperConfig {
    fn default() -> Self {
        Self {
            tmdb_api_key: None,
            fanart_api_key: None,
            douban_enabled: false,
            bangumi_enabled: false,
            javbus_enabled: false,
        }
    }
}

pub async fn search_tmdb(query: &str, api_key: &str) -> Result<Vec<ScraperResult>, String> {
    let url = format!(
        "https://api.themoviedb.org/3/search/multi?api_key={}&query={}&language=zh-CN",
        api_key,
        urlencoding(query)
    );
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;
    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("tmdb: {}", e))?;
    let v: Value = res.json().await.map_err(|e| e.to_string())?;
    let arr = v
        .get("results")
        .and_then(|x| x.as_array())
        .cloned()
        .unwrap_or_default();
    let mut out = Vec::new();
    for it in arr {
        let kind = it.get("media_type").and_then(|x| x.as_str()).unwrap_or("");
        if kind != "movie" && kind != "tv" {
            continue;
        }
        let title = it
            .get("title")
            .or_else(|| it.get("name"))
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string();
        let id = it.get("id").and_then(|x| x.as_i64()).unwrap_or(0);
        let poster = it.get("poster_path").and_then(|x| x.as_str()).map(|p| {
            format!("https://image.tmdb.org/t/p/w500{}", p)
        });
        let backdrop = it.get("backdrop_path").and_then(|x| x.as_str()).map(|p| {
            format!("https://image.tmdb.org/t/p/w1280{}", p)
        });
        let overview = it.get("overview").and_then(|x| x.as_str()).map(|s| s.to_string());
        let rating = it.get("vote_average").and_then(|x| x.as_f64()).map(|r| r as f32);
        let year = it
            .get("release_date")
            .or_else(|| it.get("first_air_date"))
            .and_then(|x| x.as_str())
            .and_then(|s| s.get(..4))
            .and_then(|s| s.parse::<i32>().ok());
        out.push(ScraperResult {
            source: "tmdb".into(),
            source_id: id.to_string(),
            title,
            year,
            poster,
            backdrop,
            overview,
            rating,
            genres: None,
        });
    }
    Ok(out)
}

pub async fn search_douban(query: &str) -> Result<Vec<ScraperResult>, String> {
    // 豆瓣需要 cookie/反爬，演示版返回空 + 日志
    eprintln!("[scraper] douban 搜索: {}", query);
    Ok(vec![])
}

pub async fn search_bangumi(query: &str) -> Result<Vec<ScraperResult>, String> {
    let url = format!(
        "https://api.bgm.tv/v0/search/subjects?limit=10",
    );
    let _ = url;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .user_agent("panpankan/0.1")
        .build()
        .map_err(|e| e.to_string())?;
    let body = serde_json::json!({ "keyword": query, "subjectType": [1, 2, 6] });
    let res = client
        .post("https://api.bgm.tv/v0/search/subjects")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("bangumi: {}", e))?;
    let v: Value = res.json().await.map_err(|e| e.to_string())?;
    let arr = v.get("data").and_then(|x| x.as_array()).cloned().unwrap_or_default();
    let mut out = Vec::new();
    for it in arr {
        let title = it
            .get("name")
            .and_then(|x| x.as_str())
            .or_else(|| it.get("name_cn").and_then(|x| x.as_str()))
            .unwrap_or("")
            .to_string();
        let id = it.get("id").and_then(|x| x.as_i64()).unwrap_or(0);
        let img = it.get("images").and_then(|x| x.get("common")).and_then(|x| x.as_str()).map(|s| s.to_string());
        let summary = it.get("summary").and_then(|x| x.as_str()).map(|s| s.to_string());
        let rating = it.get("rating").and_then(|x| x.get("score")).and_then(|x| x.as_f64()).map(|r| r as f32);
        out.push(ScraperResult {
            source: "bangumi".into(),
            source_id: id.to_string(),
            title,
            year: None,
            poster: img.clone(),
            backdrop: img,
            overview: summary,
            rating,
            genres: None,
        });
    }
    Ok(out)
}

pub fn urlencoding(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
            _ => format!("%{:02X}", c as u32),
        })
        .collect()
}

#[allow(dead_code)]
fn _suppress(_v: &Value) {}
