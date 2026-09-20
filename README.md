# dsh-mornye-theme

莫宁（Mornye）主题皮肤 —— DSH Desktop 的本地插件：**全屏动态壁纸 + 页内桌宠（带订阅额度）+ 银白冷色 UI**。

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

需要 Node.js / pnpm 与一份 DSH Desktop 安装。插件目录放这里（升级不覆盖）：

```
%APPDATA%\dsh-desktop\harness\profiles\web\local-plugins\dsh-mornye-theme\
```

1. 把本仓库内容复制到上面那个目录（目录名建议 `dsh-mornye-theme`，**要和 `package.json` 的 `name` 一致**）。
2. 让 profile 认识它：在 `profiles\web\package.json` 的依赖里加一条，并在 `dsh.profile.bundles` 里加插件名；
   然后在 `profiles\web\node_modules\` 下建一个指向插件目录的 **junction**（不要直接复制文件，否则改了不生效）：

   ```powershell
   # 以管理员身份，或确认当前用户有权限
   New-Item -ItemType Junction `
     -Path  "$env:APPDATA\dsh-desktop\harness\profiles\web\node_modules\dsh-mornye-theme" `
     -Target "$env:APPDATA\dsh-desktop\harness\profiles\web\local-plugins\dsh-mornye-theme"
   ```

3. **重启 DSH Desktop**（host 半边只在启动时加载）。之后改 `client/client.js` 只需刷新页面（F5）。

> 插件 id 用的是 `mornye-theme`（见 `cordis.patch.yml` 与 `lib/index.js` 的 `name`），
> 路由前缀因此是 `/plugins/mornye-theme/…`。仓库名与插件 id 不同是正常的。

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
