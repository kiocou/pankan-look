# 盘盘看 SPEC · 设计规范

## 一、视觉风格

### 1. 配色 (HSL 变量)

```css
--background:        240 10% 3.9%   /* 深灰近黑 */
--foreground:        0 0% 98%       /* 接近白 */
--card:              240 10% 5.9%   /* 卡片底 */
--primary:           0 0% 98%       /* 主按钮 */
--muted:             240 3.7% 15.9% /* 次级 */
--border:            240 3.7% 15.9%
```

### 2. 强调色
- 海报墙 / 媒体卡: `from-purple-500 to-pink-500`
- 进度条: 同上
- 危险 (NSFW): `red-400`
- 成功 (已配置): `green-500`

### 3. 字体
- 默认: `Inter, system-ui, -apple-system, sans-serif`
- 中文: 跟随系统 (`PingFang SC` / `Microsoft YaHei`)

### 4. 圆角
- 卡片: `rounded-lg` (8px)
- 按钮: `rounded-md` (6px)
- 海报: `rounded-lg`

## 二、布局

### 1. AppShell
- 左侧 sidebar (60px 折叠 / 240px 展开)
- 右侧 main (flex-1, overflow-auto)
- Sidebar 顶部: Logo + 折叠按钮
- 中部: 导航 (首页 / 文件浏览器 / 媒体库 / NSFW / 设置)
- 底部: Provider 切换

### 2. 网格
- 海报墙: `grid-cols-2 sm:3 md:4 lg:5 xl:6 2xl:8`
- 文件浏览: 同上
- aspect: 海报 `2/3`，继续观看 `16/9`

## 三、页面

| 路径 | 组件 | 功能 |
|------|------|------|
| `/` | HomePage | 继续观看 + 最近观看 + 媒体库入口 |
| `/browser` | BrowserPage | 文件浏览器 (Grid/List) + 面包屑 |
| `/library` | LibraryPage | 海报墙 + 扫描 |
| `/media/:id` | MediaDetailPage | 海报 + 简介 + 播放按钮 |
| `/player/:providerId` | PlayerPage | 全屏播放器 + 控制条 |
| `/player-embed` | PlayerEmbedPage | MPV 嵌入窗口 (占位) |
| `/nsfw` | NsfwPage | NSFW 检测 + 自动隐藏开关 |
| `/settings` | SettingsPage | 云盘管理 + API 密钥 |

## 四、关键交互

### 1. 文件浏览器 (光鸭)
- 点击文件夹 → `navigateInto({fileId, name})` 入栈
- 点击视频 → 跳转到 `/player/:providerId?path=...`
- 面包屑 → `navigateToDepth(i+1)` 截栈
- useEffect 依赖: `[providerId, pathStack.length, lastSegment.fileId]`

### 2. 媒体库扫描
- `libraryScan` 异步扫描所有 provider
- 扫描进度通过 `libraryScanProgress` 查询
- 单个文件夹含 >1 视频 → kind=series

### 3. 播放历史
- 视频每 5 秒保存一次进度
- 进度 < 95% 视为未看完，归入"继续观看"

## 五、性能

- 海报卡片: `loading="lazy"`
- 路由: HashRouter (Tauri 友好)
- 状态: Zustand 单 store
- API 列表渲染: 固定 key (`file.id`)

## 六、扩展性

### 1. 新增云盘驱动
1. `providers/X.rs` 实现 `CloudProvider` trait
2. `lib.rs::add_provider` 加 match arm
3. `AppState::reload_providers_from_db` 加 reload 分支
4. 前端 `AddProviderModal` 加步骤
5. `tauri.ts` 不需要改（驱动透明）

### 2. 新增刮削源
1. `scraper/mod.rs` 加 `search_X(query) -> Vec<ScraperResult>`
2. `search_metadata` 加 match 分支

### 3. MPV 嵌入完整化
1. `Cargo.toml` 加 `libmpv-sys` 或 `mpv-client`
2. `player/mpv_embed.rs` 实现 render context
3. 用 wgpu 纹理绑定到 webview canvas
