use crate::models::{LibraryItem, ScanProgress};
use crate::providers::CloudProvider;
use crate::utils::is_video_file;
use parking_lot::Mutex;
use serde_json::json;
use std::sync::Arc;

static LAST_PROGRESS: Mutex<Option<ScanProgress>> = Mutex::new(None);

pub fn set_progress(p: ScanProgress) {
    *LAST_PROGRESS.lock() = Some(p);
}

pub fn get_progress() -> Option<ScanProgress> {
    LAST_PROGRESS.lock().clone()
}

pub async fn scan_provider(
    provider: &dyn CloudProvider,
    _provider_id: &str,
) -> Result<Vec<LibraryItem>, String> {
    set_progress(ScanProgress {
        phase: "list_root".into(),
        current: 0,
        total: 0,
        message: Some("扫描根目录".into()),
    });
    let roots = provider.list_files("/").await?;
    let mut items: Vec<LibraryItem> = Vec::new();
    let total = roots.len() as u64;
    for (i, r) in roots.iter().enumerate() {
        set_progress(ScanProgress {
            phase: "scan_dir".into(),
            current: i as u64,
            total,
            message: Some(r.name.clone()),
        });
        if !r.is_directory {
            if is_video_file(&r.name) {
                items.push(LibraryItem {
                    provider_id: provider.id().to_string(),
                    path: r.path.clone(),
                    name: r.name.clone(),
                    kind: "movie".into(),
                    poster: r.thumbnail.clone(),
                    backdrop: None,
                    year: None,
                    rating: None,
                    overview: None,
                    episode_count: 0,
                });
            }
            continue;
        }
        let children = provider.list_files(&r.id).await.unwrap_or_default();
        let videos: Vec<_> = children
            .into_iter()
            .filter(|c| !c.is_directory && is_video_file(&c.name))
            .collect();
        if videos.len() > 1 {
            items.push(LibraryItem {
                provider_id: provider.id().to_string(),
                path: r.path.clone(),
                name: r.name.clone(),
                kind: "series".into(),
                poster: r.thumbnail.clone(),
                backdrop: None,
                year: None,
                rating: None,
                overview: None,
                episode_count: videos.len() as i32,
            });
        } else if videos.len() == 1 {
            items.push(LibraryItem {
                provider_id: provider.id().to_string(),
                path: videos[0].path.clone(),
                name: videos[0].name.clone(),
                kind: "movie".into(),
                poster: videos[0].thumbnail.clone().or(r.thumbnail.clone()),
                backdrop: None,
                year: None,
                rating: None,
                overview: None,
                episode_count: 0,
            });
        }
    }
    set_progress(ScanProgress {
        phase: "done".into(),
        current: total,
        total,
        message: Some(format!("扫描完成, 共 {} 项", items.len())),
    });
    Ok(items)
}

pub fn progress_json() -> serde_json::Value {
    json!({
        "progress": get_progress()
    })
}

#[allow(dead_code)]
fn _suppress(_a: &Arc<()>) {}
