# 盘盘看 (PanPanKan)

> 桌面云媒体中心 · 海报墙 · 最强画质 MPV 播放

盘盘看是一个基于 **Tauri 2 + React 18 + TypeScript** 的桌面应用，聚合多个云盘（OpenList / GuangYa / WebDAV / 本地磁盘），提供统一的文件浏览、海报墙、媒体库、MPV 嵌入播放。

## ✨ 特性

- 🎬 **多云盘统一接入** —— 光鸭云盘、OpenList、WebDAV、本地磁盘一个应用搞定
- 🖼 **海报墙媒体库** —— 自动识别电影/剧集、匹配 TMDB/Bangumi 元数据
- 🎯 **MPV 嵌入播放** —— 桌面端最强画质，支持外挂字幕、多音轨
- 📁 **path → fileId 智能栈** —— 光鸭云盘 API 只认 fileId，前端用 `{fileId, name}[]` 栈管理
- 🔒 **NSFW 检测** —— 文件名关键词 + 自动打码
- 📊 **观看历史** —— SQLite 持久化，进度同步、继续观看
- 🎨 **现代 UI** —— TailwindCSS + shadcn 风格组件 + Framer Motion 动画

## 🛠 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 + TypeScript + Vite + TailwindCSS + Zustand + Framer Motion |
| 后端 | Rust (Tauri 2) + Tokio + Reqwest + SQLite |
| 协议 | Tauri 2 commands（默认 camelCase）+ HTTP (reqwest) |
| 播放器 | MPV 外部进程 + 未来 libmpv 嵌入 |

## 📁 项目结构

```
panpankan/
├── package.json              # 前端依赖
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── src-tauri/                # Rust 后端
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/default.json
│   └── src/
│       ├── lib.rs            # Tauri commands 总入口
│       ├── main.rs
│       ├── models.rs         # 数据结构
│       ├── utils.rs
│       ├── local_server.rs
│       ├── providers/        # ★ 云盘驱动
│       │   ├── mod.rs
│       │   ├── guangya.rs    # 光鸭云盘 (核心)
│       │   ├── openlist.rs
│       │   ├── webdav.rs
│       │   └── local.rs
│       ├── db/mod.rs         # SQLite
│       ├── media/probe.rs    # ffprobe
│       ├── player/           # MPV
│       │   ├── mod.rs
│       │   └── mpv_embed.rs
│       ├── scanner/mod.rs    # 媒体库扫描
│       ├── scraper/mod.rs    # TMDB/Bangumi 刮削
│       └── safety/mod.rs     # NSFW 检测
└── frontend/                 # React 前端
    ├── index.html
    └── src/
        ├── App.tsx, main.tsx, index.css
        ├── lib/
        │   ├── tauri.ts      # ★ 前端 ↔ Rust 桥
        │   └── utils.ts
        ├── stores/index.ts   # ★ Zustand + pathStack
        ├── pages/
        │   ├── HomePage.tsx
        │   ├── BrowserPage.tsx
        │   ├── LibraryPage.tsx
        │   ├── MediaDetailPage.tsx
        │   ├── PlayerPage.tsx
        │   ├── PlayerEmbedPage.tsx
        │   ├── NsfwPage.tsx
        │   └── SettingsPage.tsx
        └── components/
            ├── layout/AppShell.tsx
            ├── browser/      # FileBrowser / Grid / List / Item / Breadcrumb
            ├── media/        # MediaCard / MediaGrid
            ├── player/       # PlayerControls / PlaylistSidebar
            ├── providers/    # ProviderSelector / AddProviderModal
            ├── safety/       # NsfwBadge
            └── ui/           # Button / Input / Card / EmptyState
```

## 🚀 开发

### 前置依赖
- Node.js 18+
- Rust 1.77+
- 系统依赖:
  - Windows: WebView2 Runtime + MSVC build tools
  - macOS: Xcode Command Line Tools
  - Linux: webkit2gtk, libsoup, etc.

### 安装

```bash
cd panpankan
npm install
```

### 开发模式

```bash
npm run tauri:dev
```

### 构建

```bash
npm run tauri:build
```

## 📌 核心设计要点

### 1. 光鸭云盘 API

光鸭 API 强制使用 `fileId`，不认字符串路径。客户端必须维护 `路径 → fileId` 缓存：

```rust
// 后端: LazyLock<RwLock<HashMap<path, fileId>>>
static PATH_TO_ID_CACHE: Lazy<RwLock<HashMap<String, String>>> = ...;
```

```typescript
// 前端: 用 {fileId, name}[] 栈管理
interface PathSegment {
  fileId: string;   // 真正传给后端
  name: string;     // 仅用于面包屑/卡片显示
}
pathStack: PathSegment[]
```

### 2. 三个固定域
- `account.guangyapan.com` —— 认证
- `api.guangyapan.com` —— 业务
- `nd.bizuserres.s` —— 缩略图 CDN

### 3. 12 个 X-* 请求头
所有光鸭请求必须携带完整请求头集（详见 [guangya.rs](panpankan/src-tauri/src/providers/guangya.rs)）。

### 4. Tauri 2 命令命名约定
- 前端 invoke 用 camelCase（`providerId`），后端 Rust 用 snake_case（`provider_id`）
- 下划线前缀参数（如 `_captcha_code`）前端**仍需传**对应 key

### 5. 目录/文件判断优先级
1. `ext` 字段非空 → 一定是文件
2. 文件名匹配已知媒体扩展名 → 一定是文件
3. `isFolder == true` → 文件夹
4. `dirType==1` 且无扩展名 → 文件夹

## 🐛 已知限制

1. **path → fileId 缓存仅内存**：应用重启后清空，需要重新遍历目录重建
2. **MPV 嵌入为占位实现**：当前通过外部 mpv 进程 + 视频元素播放。真实嵌入需要 libmpv + wgpu/d3d11 纹理
3. **光鸭 thumbnail 未本地缓存**：直接走 CDN
4. **NSFW 仅文件名启发式**：无 ML 视觉检测
5. **OpenList-Bridge provider 缺失**：枚举里有但驱动文件未实现（编译需要补齐）

## 📜 许可

MIT License

## 🔗 相关链接

- GitHub: <https://github.com/kiocou/pankan-look>
- Tauri: <https://tauri.app>
- 光鸭云盘: <https://guangyapan.com>
