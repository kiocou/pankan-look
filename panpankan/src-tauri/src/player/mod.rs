use serde::{Deserialize, Serialize};

pub mod mpv_embed;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PlayerState {
    pub playing: bool,
    pub paused: bool,
    pub position: f64,
    pub duration: f64,
    pub volume: f32,
    pub muted: bool,
    pub speed: f32,
    pub title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EmbedConfig {
    pub url: String,
    pub title: Option<String>,
    pub start_position: Option<f64>,
    pub auto_play: bool,
}

pub fn build_mpv_cmd(cfg: &EmbedConfig) -> Vec<String> {
    let mut args = vec![
        "--force-window".to_string(),
        "--idle=no".to_string(),
        "--keep-open".to_string(),
        "--no-border".to_string(),
        format!("--title={}", cfg.title.clone().unwrap_or_default()),
        cfg.url.clone(),
    ];
    if let Some(p) = cfg.start_position {
        if p > 0.0 {
            args.insert(args.len() - 1, format!("--start={}", p));
        }
    }
    args
}
