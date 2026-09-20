# dsh-mornye-theme

莫宁（Mornye）主题皮肤 —— DSH Desktop 的本地插件：**全屏动态壁纸 + 页内桌宠（双数据源）+ 银白冷色 UI**。

> **不想装 git？** 直接下打包好的 zip：[**Releases → v0.1.0**](https://github.com/eraerkni/dsh-mornye-theme/releases/latest)
> （解压出来就是 `dsh-mornye-theme/` 目录，照下面「安装」的第 2~4 步注册即可）

> 与「菲比」那套暖色皮肤是同一架构的两个半边（host + client），
> 两者可以共存：在同一份 DSH Desktop 里用「外观」栏的方块切换。

## 特性

- **全屏动态壁纸**：任意 mp4 铺满整个界面（默认 `cover`，可切「留边」）。壁纸层由 host 直接写进
  `index.html`，首屏就带着它加载，不闪默认外观。
- **页内桌宠**：可拖动、位置跨重启保持；点击弹一下。
  - **台词**：读一个纯文本文件（一行一句），默认每 30 秒换一句；序号 / 列表符号会自动剥掉。
  - **双数据源**：既能显示 **DeepSeek 官网余额**（金额），也能显示 **OpenCode Go 订阅额度**（剩余 %）。
    **右键桌宠**打开面板切换数据源，并在面板里用滑杆调挂件大小（70%~160%）；选择与尺寸都会记住。
  - **官网余额**（默认）：显示金额 + 币种，左键点击 = 刷新。
  - **订阅额度**：默认显示 5 小时窗口的剩余额度，**左键点击在三档之间循环**：
    5 小时 → 本周 → 本月 → 5 小时。悬停能看到重置时间（北京时间）。
  - **峰谷色点**：工作日 09:00–12:00 / 14:00–18:00（北京时间）显示橙色「峰」，其余显示蓝色「谷」。
- **助手头像**：每轮回复左侧注入一个圆形角色头像（`data-chat-flow-kind="assistant-step"::before`）。
- **银白冷色 UI**：深色底上的冷蓝灰 token；弹窗、技能中心、输入框统一成**亚克力**（半透明 + 背景模糊）。
- **外观栏方块**：在「外观」那一栏注入第 4 个方块（浅色 / 深色 / 跟随系统 / **莫宁**）。
- **开屏动画**（可选，属于应用安装目录，不是插件本体）：见「开屏画面」一节。

## 安装

### 先决条件

- 一份已安装并可正常启动的 **DSH Desktop**。
- **git（或直接下载 zip 也行）** —— 只有从源码装才需要。
- **不需要 Node.js / pnpm**：本插件的 `node_modules` 是**空依赖**，宿主自带 pnpm 只是为了重链接。
- 磁盘：插件本体约 **21MB**（其中壁纸视频 ~20MB）。

### 两种装法

**A. git clone（推荐，方便以后 `git pull` 更新）**

```powershell
$plugins = "$env:APPDATA\dsh-desktop\harness\profiles\web\local-plugins"
git clone https://github.com/eraerkni/dsh-mornye-theme.git "$plugins\dsh-mornye-theme"
```

**B. 下载 Release 的 zip（不用装 git）**

从 [Releases](https://github.com/eraerkni/dsh-mornye-theme/releases/latest) 下载 `dsh-mornye-theme-v0.1.0.zip`
（约 20MB），解压到：

```
%APPDATA%\dsh-desktop\harness\profiles\web\local-plugins\
```

> ✅ Release 的 zip 已经打包成 `dsh-mornye-theme/` 顶层目录，**解压后直接就是正确目录名，不需要重命名**。

**C. 下载源码 zip（仓库页 → Code ▾ → Download ZIP）**

> ⚠️ 源码 zip 解压出来的目录名会带 `-main` 后缀，**记得重命名成 `dsh-mornye-theme`**，
> 否则和下面的注册名对不上。它和 Release zip 内容基本一致，只是目录名需要自己改。

### 注册进 profile（关键一步，缺一不可）

插件目录放好后，要让 profile 认识它。**目录名 `dsh-mornye-theme` = 插件 id = 注册名**，三处必须一致：

```powershell
$web = "$env:APPDATA\dsh-desktop\harness\profiles\web"

# ① profile 依赖里加一条（指向你刚放的目录）
#    编辑 $web\package.json，在 "dependencies" 里加：
#      "dsh-mornye-theme": "file:local-plugins/dsh-mornye-theme"

# ② 让它真正出现在 bundles 里（编辑同一个文件）
#    "dsh": { "profile": { "bundles": [ ..., "dsh-mornye-theme" ] } }

# ③ 建 junction（不要直接复制文件进去，否则改了源码不生效）
New-Item -ItemType Junction `
  -Path   "$web\node_modules\dsh-mornye-theme" `
  -Target "$web\local-plugins\dsh-mornye-theme"
```

然后**重启 DSH Desktop**（host 半边只在启动时加载）。之后改 `client/client.js` 只需刷新页面（F5）。

自检：设置 → 通用设置 →「外观」那一栏出现 **莫宁** 方块；右上角挂件出现；壁纸铺满。

> **命名说明**：本插件的内部 id 是 `mornye-theme`（见 `cordis.patch.yml` 与 `lib/index.js` 的 `name`），
> 所以 HTTP 路由前缀是 `/plugins/mornye-theme/…`。仓库名叫 `dsh-mornye-theme`、你也用这个目录名注册，
> 两者并不冲突 —— **关键是目录名、依赖声明、bundles 条目三者一致**（示例里都用 `dsh-mornye-theme`）。
> 如果你更想用 `mornye-theme` 这个目录名，那就三处都写成 `mornye-theme`，同样能用。

### 卸载

删掉 junction、从 `package.json` 里移除依赖与 bundles 条目、再删插件目录，然后重启。

## 素材

仓库带一份**压好的壁纸视频**，clone 下来就能直接用：

| 素材 | 位置 | 说明 |
|---|---|---|
| `wallpaper.mp4` | 仓库已带（**约 20MB**） | 1080×1080 / 30fps / H.264 / 无音轨。原始素材是 2560×2560 60fps（106MB），为了让仓库能塞进 GitHub 做了转码（`-an -vf scale=1080:1080 -r 30 -crf 23 -movflags +faststart`） |
| `poster.jpg` | 仓库已带（~700KB） | 视频解码前的封面帧，避免首屏黑一下 |
| `pet.png` / `avatar.png` | 仓库已带 | 桌宠图与头像**源码**；实际使用的是内嵌在 `client.js` 里的 data URL（见「开发」） |
| 自己的视频 | `assets/wallpaper.mp4` **或** `%APPDATA%\dsh-desktop\mornye-theme\wallpaper.mp4` **或** 环境变量 `DSH_MORNYE_WALLPAPER` | 想换壁纸就把自己的 mp4 放这三个位置之一。**建议 16:9、H.264、1080p 以内**；4K60 会持续占用 GPU 解码 |
| `lines.txt` | `%APPDATA%\dsh-desktop\mornye-theme\lines.txt` **或** `DSH_MORNYE_LINES` | 桌宠台词，一行一句，UTF-8 或 GBK 都认（仓库里有 `lines.example.txt` 可照抄） |

> 桌宠 / 头像 / 壁纸这些**角色素材**的版权不属于本项目（见 LICENSE 末尾说明）；如果你想发布自己的分支，
> 建议换成你自己的素材，或把 `assets/` 里对应文件删掉（插件在缺图时会走兜底样式、壁纸会回 404 并提示怎么放视频）。

## 配置（全部走环境变量，仓库里没有密钥）

| 变量 | 默认 | 作用 |
|---|---|---|
| `DSH_MORNYE_CONFIG_DIR` | `%APPDATA%\dsh-desktop\mornye-theme` | 运行期状态目录（`theme-flag.json`、`quota-samples.json`） |
| `DSH_MORNYE_WALLPAPER` | `assets/wallpaper.mp4` | 壁纸视频路径（不设就去默认位置找，找不到时路由回 404 并附说明） |
| `DSH_MORNYE_POSTER` | `assets/poster.jpg` | 封面帧路径 |
| `DSH_MORNYE_LINES` | `<配置目录>\lines.txt` | 台词库路径 |
| `DSH_MORNYE_CREDENTIALS` | `%APPDATA%\dsh-desktop\harness\.credentials.yaml` | 取 `OPENCODE_GO_API_KEY` 的凭据文件 |
| `OPENCODE_GO_API_KEY` | — | 额度查询用的 key（**优先于凭据文件**；不设就退回读凭据文件） |
| `DSH_MORNYE_API_KEY` / `DEEPSEEK_API_KEY` | — | 只有 `/balance` 这条老路由要用（UI 已不用余额） |

## HTTP 路由（host 半边）

| 路由 | 作用 |
|---|---|
| `GET /plugins/mornye-theme/health` | 探针：host 是否活着 + 当前外观开关 |
| `GET /plugins/mornye-theme/quota` | **订阅额度**：透传 OpenCode Go 三个窗口 + 本地采样的「今日已用」 |
| `GET /plugins/mornye-theme/balance` | DeepSeek 余额（历史功能，UI 已不用） |
| `GET /plugins/mornye-theme/lines` | 台词库（每次请求现读文件，改完立刻生效） |
| `GET /plugins/mornye-theme/wallpaper.mp4` | 壁纸视频（支持 Range） |
| `GET /plugins/mornye-theme/poster.jpg` | 封面帧 |
| `GET/POST /plugins/mornye-theme/flag` | 外观开关 / 生效主题 / 铺满方式 / 桌宠位置 |

## 订阅额度是怎么来的

上游是 **OpenCode Go** 的官方额度接口：

```
GET https://opencode.ai/zen/go/v1/usage
Authorization: Bearer <OPENCODE_GO_API_KEY>      # 注意：用 x-api-key 会 401
→ {"usage":{"rolling":{"percent":3,"resetsAt":"…"},"weekly":{…},"monthly":{…}}}
```

- 官方**只给「已用百分比」**，没有余额、也没有「今日使用」。所以界面显示的「剩余 %」是 `100 - percent`。
- **「今日已用」是本插件本地采样算的**：每次请求把 `percent` 记进 `quota-samples.json`，按窗口分桶，
  取桶内 `max - min`（滚动窗口会随旧请求过期而回落，所以用涨跌幅而不是末值）。
  上游的 `resetsAt` 每次请求会**毫秒级漂移**，因此分桶前先量化到 30 分钟，否则每个请求都会开一个新桶。
- 官方额度上限（文档口径）：**$12 / 滚动 5 小时、$30 / 周、$60 / 月**。

如果你不用 OpenCode Go：`/quota` 会回 502，桌宠会显示 `--` 并把气泡标红；其余功能不受影响。

## 开屏画面（可选，改的是应用安装目录）

`assets/splash.mornye.html` 是一份可以直接用的开屏页（播壁纸视频 + 底部文案 + 进度条）。
它是**应用自带的静态文件**，所以只能投放到安装目录，不能靠插件加载：

```powershell
powershell -ExecutionPolicy Bypass -File .\apply-splash.ps1
# 或指定路径 / 视频
powershell -ExecutionPolicy Bypass -File .\apply-splash.ps1 -ResourcesDir "D:\ds\DSH Desktop\resources"
$env:DSH_MORNYE_WALLPAPER = 'D:\videos\mornye.mp4'; powershell -ExecutionPolicy Bypass -File .\apply-splash.ps1
```

脚本会：备份原生 `splash.html` 到 `splash.stock.html` → 需要时复制你的视频 → 写入开屏页。
**桌面端升级会覆盖 `resources\*`，升级后重跑本脚本即可恢复。**

## 开发

插件是**两个半边**，生效方式完全不同 —— 这是本地插件最费时间的地方：

| 半边 | 文件 | 改动生效 |
|---|---|---|
| client | `client/client.js` | **刷新页面即可**（harness 现读现发） |
| host | `lib/*.js` | **必须重启 DSH Desktop** |

- 改完客户端脚本先做语法自检：`node --check client/client.js`。
- 桌宠图与头像**内嵌成 data URL**（`PET_IMG` / `AVATAR_IMG`），这样不依赖 host 路由、也不会有缓存不刷新的问题。
  换图流程：替换 `assets/pet.png` / `assets/avatar.png` → 跑内嵌脚本：

  ```bash
  node tools/embed-pet.mjs      # [--size 256] [--quality 88] [--png …] [--client …]
  node tools/embed-avatar.mjs   # [--size 120] [--quality 88] [--png …] [--client …]
  ```

  两个脚本需要 `sharp`：优先用本仓库的 `node_modules`，其次用 DSH Desktop 自带的那份
  （用 `DSH_APP_ROOT` 指向你的 `…\DSH Desktop\resources\app`）。
- 样式钩子优先用**稳定属性**（`data-dsh-part`、`data-phase`、`data-chat-flow-kind`、`data-shell-overlay`）；
  哈希类名（`VphDDa_card`、`_8JRpoa_root`…）随版本会变，只在必要时用 `[class*='_card']` 这种部分匹配。
- 已知坑：`[class*='_hero']` 会连带命中 `_heroWorkspaceRow` 之类兄弟节点；`data-phase` 元素**就是**聊天区根节点本身。

## 目录结构

```
lib/index.js        host 半边：HTTP 路由、预热 CSS、壁纸层注入
lib/lines.js        台词解析（序号剥离 / UTF-8 与 GBK 自适应）
client/client.js    客户端半边：主题注册、壁纸接管、桌宠、额度、头像、亚克力样式（含内嵌图）
assets/             poster.jpg、pet.png、avatar.png、splash.mornye.html（wallpaper.mp4 需自备）
tools/              把图内嵌进 client.js 的两个小脚本
apply-splash.ps1    把开屏页投放进安装目录
cordis.patch.yml    把插件插进 profile 的 layer stack
```

## 许可

代码 MIT，见 [LICENSE](LICENSE)。

**素材不在 MIT 范围内**：`assets/poster.jpg`、`assets/pet.png`、`assets/avatar.png` 以及你自备的
`wallpaper.mp4` 都是角色 / 作品相关的第三方素材，请自行确认你有权使用与再分发。
如果你要公开发布本仓库，建议把这三张图换成你自己的素材（或直接删掉，插件在缺图时会走兜底样式）。
