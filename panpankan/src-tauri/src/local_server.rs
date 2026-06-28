// 简易本地 HTTP 服务 —— 用于代理云盘流到 webview/MediaSource
// Tauri 2 推荐用 asset protocol + convertFileSrc 替代 HTTP，但保留此模块作为兜底。

use std::net::SocketAddr;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

pub struct LocalServer {
    pub addr: SocketAddr,
    pub shutdown: Arc<parking_lot::Mutex<Option<tokio::sync::oneshot::Sender<()>>>>,
}

pub async fn start() -> Result<LocalServer, String> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| e.to_string())?;
    let addr = listener.local_addr().map_err(|e| e.to_string())?;
    let (tx, mut rx) = tokio::sync::oneshot::channel();
    let shutdown = Arc::new(parking_lot::Mutex::new(Some(tx)));
    let sd = shutdown.clone();
    tokio::spawn(async move {
        loop {
            tokio::select! {
                _ = &mut rx => break,
                accept = listener.accept() => {
                    if let Ok((mut sock, _)) = accept {
                        tokio::spawn(async move {
                            let mut buf = [0u8; 1024];
                            let _ = sock.read(&mut buf).await;
                            let body = b"pankan-look local server";
                            let resp = format!(
                                "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\n",
                                body.len()
                            );
                            let _ = sock.write_all(resp.as_bytes()).await;
                            let _ = sock.write_all(body).await;
                            let _ = sock.shutdown().await;
                        });
                    }
                }
            }
        }
        let _ = sd;
    });
    Ok(LocalServer { addr, shutdown })
}

impl LocalServer {
    pub fn shutdown(&self) {
        if let Some(tx) = self.shutdown.lock().take() {
            let _ = tx.send(());
        }
    }
}
