use crate::models::NsfwCheckResult;
use once_cell::sync::Lazy;
use parking_lot::RwLock;
use regex::Regex;

static NSFW_KEYWORDS: &[&str] = &[
    "jav", "JAV", "一本道", "HEYZO", "caribbean", "tokyo", "1pondo", "pacopacomama",
    "fc2", "FC2PPV", "miaa", "rki", "SOD", "kawaii", "musume", "未亡人", "无码",
    "有码", "中出", "近亲", " incest", "hentai", "anime 全部免费", "草榴", "1024",
];

static AUTO_HIDE: Lazy<RwLock<bool>> = Lazy::new(|| RwLock::new(true));

pub fn set_auto_hide(v: bool) {
    *AUTO_HIDE.write() = v;
}

pub fn get_auto_hide() -> bool {
    *AUTO_HIDE.read()
}

pub fn check_filename(name: &str) -> NsfwCheckResult {
    let lower = name.to_lowercase();
    let mut matched = Vec::new();
    for kw in NSFW_KEYWORDS {
        if lower.contains(&kw.to_lowercase()) {
            matched.push(kw.to_string());
        }
    }
    // 启发式正则: HEYZO-1234 / FC2PPV-123456 / 1pondo-...
    let _ = Regex::new(r"(?i)(he[y]?zo|fc2|ppv|1pondo|tokyo[\-_]?hot|carib|10mu)[-_]?\d{3,6}").ok();
    NsfwCheckResult {
        is_nsfw: !matched.is_empty(),
        matched_keywords: matched,
        confidence: 0.85,
    }
}

pub fn blur_source(name: &str) -> String {
    let mut s = String::from(name);
    for kw in NSFW_KEYWORDS {
        if s.to_lowercase().contains(&kw.to_lowercase()) {
            s = s.replace(kw, &"*".repeat(kw.chars().count()));
        }
    }
    s
}
