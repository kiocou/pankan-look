use crate::models::{MediaMeta, WatchHistory};
use rusqlite::{params, Connection, OptionalExtension};
use std::path::PathBuf;
use std::sync::Arc;

pub struct Db {
    conn: Arc<parking_lot::Mutex<Connection>>,
}

impl Db {
    pub fn open(path: &PathBuf) -> Result<Self, String> {
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let conn = Connection::open(path).map_err(|e| e.to_string())?;
        Self::migrate(&conn)?;
        Ok(Self {
            conn: Arc::new(parking_lot::Mutex::new(conn)),
        })
    }

    fn migrate(conn: &Connection) -> Result<(), String> {
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS watch_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider_id TEXT NOT NULL,
                path TEXT NOT NULL,
                name TEXT NOT NULL,
                position REAL NOT NULL DEFAULT 0,
                duration REAL NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL,
                thumbnail TEXT,
                UNIQUE(provider_id, path)
            );
            CREATE TABLE IF NOT EXISTS media_meta (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider_id TEXT NOT NULL,
                path TEXT NOT NULL,
                title TEXT NOT NULL,
                year INTEGER,
                season INTEGER,
                episode INTEGER,
                poster TEXT,
                backdrop TEXT,
                overview TEXT,
                rating REAL,
                genres TEXT,
                source TEXT,
                source_id TEXT,
                UNIQUE(provider_id, path)
            );
            CREATE TABLE IF NOT EXISTS library_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider_id TEXT NOT NULL,
                path TEXT NOT NULL,
                name TEXT NOT NULL,
                kind TEXT NOT NULL,
                poster TEXT,
                backdrop TEXT,
                year INTEGER,
                rating REAL,
                overview TEXT,
                episode_count INTEGER DEFAULT 0,
                UNIQUE(provider_id, path)
            );
            CREATE TABLE IF NOT EXISTS provider_configs (
                provider_id TEXT PRIMARY KEY,
                config TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS device_fingerprints (
                provider_id TEXT PRIMARY KEY,
                device_id TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            "#,
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn save_watch_history(&self, h: &WatchHistory) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute(
            r#"INSERT INTO watch_history
               (provider_id, path, name, position, duration, updated_at, thumbnail)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
               ON CONFLICT(provider_id, path) DO UPDATE SET
                 name=excluded.name, position=excluded.position, duration=excluded.duration,
                 updated_at=excluded.updated_at, thumbnail=excluded.thumbnail"#,
            params![
                h.provider_id, h.path, h.name, h.position, h.duration,
                h.updated_at, h.thumbnail
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_watch_history(&self, provider_id: &str, path: &str) -> Result<Option<WatchHistory>, String> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            "SELECT id, provider_id, path, name, position, duration, updated_at, thumbnail FROM watch_history WHERE provider_id=?1 AND path=?2"
        ).map_err(|e| e.to_string())?;
        let res = stmt
            .query_row(params![provider_id, path], |r| {
                Ok(WatchHistory {
                    id: r.get(0)?,
                    provider_id: r.get(1)?,
                    path: r.get(2)?,
                    name: r.get(3)?,
                    position: r.get(4)?,
                    duration: r.get(5)?,
                    updated_at: r.get(6)?,
                    thumbnail: r.get(7)?,
                })
            })
            .optional()
            .map_err(|e| e.to_string())?;
        Ok(res)
    }

    pub fn recent_history(&self, limit: u32) -> Result<Vec<WatchHistory>, String> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            "SELECT id, provider_id, path, name, position, duration, updated_at, thumbnail FROM watch_history ORDER BY updated_at DESC LIMIT ?1"
        ).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![limit], |r| {
                Ok(WatchHistory {
                    id: r.get(0)?,
                    provider_id: r.get(1)?,
                    path: r.get(2)?,
                    name: r.get(3)?,
                    position: r.get(4)?,
                    duration: r.get(5)?,
                    updated_at: r.get(6)?,
                    thumbnail: r.get(7)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        for r in rows.flatten() {
            out.push(r);
        }
        Ok(out)
    }

    pub fn continue_watching(&self, limit: u32) -> Result<Vec<WatchHistory>, String> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            "SELECT id, provider_id, path, name, position, duration, updated_at, thumbnail
             FROM watch_history WHERE duration > 0 AND position > 0 AND position / duration < 0.95
             ORDER BY updated_at DESC LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![limit], |r| {
                Ok(WatchHistory {
                    id: r.get(0)?,
                    provider_id: r.get(1)?,
                    path: r.get(2)?,
                    name: r.get(3)?,
                    position: r.get(4)?,
                    duration: r.get(5)?,
                    updated_at: r.get(6)?,
                    thumbnail: r.get(7)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        for r in rows.flatten() {
            out.push(r);
        }
        Ok(out)
    }

    pub fn save_media_meta(&self, m: &MediaMeta) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute(
            r#"INSERT INTO media_meta
               (provider_id, path, title, year, season, episode, poster, backdrop, overview, rating, genres, source, source_id)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
               ON CONFLICT(provider_id, path) DO UPDATE SET
                 title=excluded.title, year=excluded.year, season=excluded.season,
                 episode=excluded.episode, poster=excluded.poster, backdrop=excluded.backdrop,
                 overview=excluded.overview, rating=excluded.rating, genres=excluded.genres,
                 source=excluded.source, source_id=excluded.source_id"#,
            params![
                m.provider_id, m.path, m.title, m.year, m.season, m.episode,
                m.poster, m.backdrop, m.overview, m.rating, m.genres, m.source, m.source_id
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_media_meta(&self, provider_id: &str, path: &str) -> Result<Option<MediaMeta>, String> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            "SELECT id, provider_id, path, title, year, season, episode, poster, backdrop, overview, rating, genres, source, source_id
             FROM media_meta WHERE provider_id=?1 AND path=?2"
        ).map_err(|e| e.to_string())?;
        let res = stmt
            .query_row(params![provider_id, path], |r| {
                Ok(MediaMeta {
                    id: r.get(0)?,
                    provider_id: r.get(1)?,
                    path: r.get(2)?,
                    title: r.get(3)?,
                    year: r.get(4)?,
                    season: r.get(5)?,
                    episode: r.get(6)?,
                    poster: r.get(7)?,
                    backdrop: r.get(8)?,
                    overview: r.get(9)?,
                    rating: r.get(10)?,
                    genres: r.get(11)?,
                    source: r.get(12)?,
                    source_id: r.get(13)?,
                })
            })
            .optional()
            .map_err(|e| e.to_string())?;
        Ok(res)
    }

    pub fn search_media(&self, query: &str, limit: u32) -> Result<Vec<MediaMeta>, String> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            "SELECT id, provider_id, path, title, year, season, episode, poster, backdrop, overview, rating, genres, source, source_id
             FROM media_meta WHERE title LIKE ?1 LIMIT ?2"
        ).map_err(|e| e.to_string())?;
        let pattern = format!("%{}%", query);
        let rows = stmt
            .query_map(params![pattern, limit], |r| {
                Ok(MediaMeta {
                    id: r.get(0)?,
                    provider_id: r.get(1)?,
                    path: r.get(2)?,
                    title: r.get(3)?,
                    year: r.get(4)?,
                    season: r.get(5)?,
                    episode: r.get(6)?,
                    poster: r.get(7)?,
                    backdrop: r.get(8)?,
                    overview: r.get(9)?,
                    rating: r.get(10)?,
                    genres: r.get(11)?,
                    source: r.get(12)?,
                    source_id: r.get(13)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        for r in rows.flatten() {
            out.push(r);
        }
        Ok(out)
    }

    pub fn save_provider_config(&self, provider_id: &str, config: &str) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute(
            "INSERT INTO provider_configs(provider_id, config) VALUES(?1, ?2)
             ON CONFLICT(provider_id) DO UPDATE SET config=excluded.config",
            params![provider_id, config],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn load_provider_config(&self, provider_id: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare("SELECT config FROM provider_configs WHERE provider_id=?1")
            .map_err(|e| e.to_string())?;
        let res = stmt
            .query_row(params![provider_id], |r| r.get::<_, String>(0))
            .optional()
            .map_err(|e| e.to_string())?;
        Ok(res)
    }

    pub fn list_provider_configs(&self) -> Result<Vec<(String, String)>, String> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare("SELECT provider_id, config FROM provider_configs")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        for r in rows.flatten() {
            out.push(r);
        }
        Ok(out)
    }

    pub fn remove_provider_config(&self, provider_id: &str) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute(
            "DELETE FROM provider_configs WHERE provider_id=?1",
            params![provider_id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn save_device_fingerprint(&self, provider_id: &str, device_id: &str) -> Result<(), String> {
        let conn = self.conn.lock();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO device_fingerprints(provider_id, device_id, updated_at) VALUES(?1, ?2, ?3)
             ON CONFLICT(provider_id) DO UPDATE SET device_id=excluded.device_id, updated_at=excluded.updated_at",
            params![provider_id, device_id, now],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_device_fingerprint(&self, provider_id: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare("SELECT device_id FROM device_fingerprints WHERE provider_id=?1")
            .map_err(|e| e.to_string())?;
        let res = stmt
            .query_row(params![provider_id], |r| r.get::<_, String>(0))
            .optional()
            .map_err(|e| e.to_string())?;
        Ok(res)
    }

    pub fn save_setting(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute(
            "INSERT INTO settings(key, value) VALUES(?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            params![key, value],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare("SELECT value FROM settings WHERE key=?1")
            .map_err(|e| e.to_string())?;
        let res = stmt
            .query_row(params![key], |r| r.get::<_, String>(0))
            .optional()
            .map_err(|e| e.to_string())?;
        Ok(res)
    }
}
