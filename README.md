# dsh-mornye-theme

给 DSH Desktop 换上一整套「莫宁」外观：**全屏动态壁纸 + 屏幕上的小桌宠 + 冷色调界面**。装完随时能在「外观」里切回原样，不影响别的东西。

![效果预览](docs/preview.jpg)

## 装它（第一步：下 zip；第二步：跑一条命令）

**1. 下载**最新的 zip（[Releases](https://github.com/eraerkni/dsh-mornye-theme/releases/latest)，约 21MB），解压。

**2. 在解压出来的 `dsh-mornye-theme` 目录里跑**：

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

脚本会自动：把文件放到正确位置 → 校验壁纸视频是否完整 → **备份并安全改写** profile 的 `package.json` → 建好目录链接。
**然后重启 DSH Desktop**，打开 设置 → 通用设置 →「外观」，就会多出一个 **莫宁** 方块，点它即可。

> 脚本改的是 `%APPDATA%\dsh-desktop\harness\profiles\web\package.json`，改前会备份成 `package.json.bak-mornye`。
> 卸载：删掉 `node_modules\dsh-mornye-theme` 这个链接、把 `package.json` 里 `dsh-mornye-theme` 两处去掉、再删插件目录，最后重启。

### 或者：让 AI 助手帮你装

把**这一行**丢给你的 AI 编程助手（Claude Code / Codex / Cursor / DSH 里的 agent 都行），它就自己装完：

```text
请帮我安装 DSH Desktop 插件 dsh-mornye-theme：先下载 https://github.com/eraerkni/dsh-mornye-theme/releases/latest/download/dsh-mornye-theme-v0.1.1.zip 解压，
再执行 powershell -ExecutionPolicy Bypass -File .\install.ps1（在该目录内），
最后告诉我是否需要重启 DSH Desktop，以及重启后怎么确认成功（设置→通用设置→「外观」出现「莫宁」即成功）。
注意：不要手动编辑 profile 的 package.json，install.ps1 会安全地改并备份。
```

> 提醒：**不要用「逐个文件」的方式取代码**（比如 GitHub contents API 或网页逐个点下载）。
> 本仓库有个 **20MB 的壁纸视频**，很容易被漏掉，装完就是"有皮肤、没壁纸"。
> 一切用 zip、或 clone 整仓库。装完想核对：视频应是 **20,629,262 字节**
> （SHA-256 `588E78B64119C8791000A50CEEE894C71FBADB478934A1C5CB2E7BC285901930`）。

<details>
<summary>手动安装（不用脚本，或脚本失败时）</summary>

1. **拿文件**：`git clone https://github.com/eraerkni/dsh-mornye-theme.git`，
   或把 zip 解压到 `%APPDATA%\dsh-desktop\harness\profiles\web\local-plugins\dsh-mornye-theme\`
   （Release zip 解压出来就是正确的目录名；源码 zip 需要把 `-main` 后缀去掉）。
2. **改 profile**：编辑 `%APPDATA%\dsh-desktop\harness\profiles\web\package.json`，两处都要加：

   ```jsonc
   "dependencies": {
     "dsh-mornye-theme": "file:local-plugins/dsh-mornye-theme"   // ← 加这条
   },
   "dsh": { "profile": { "bundles": [ /* … */ "dsh-mornye-theme" ] } }   // ← 这里也加
   ```
3. **建目录链接**（不要直接复制文件进 `node_modules`）：

   ```powershell
   $web = "$env:APPDATA\dsh-desktop\harness\profiles\web"
   New-Item -ItemType Junction -Path "$web\node_modules\dsh-mornye-theme" -Target "$web\local-plugins\dsh-mornye-theme"
   ```
4. **重启 DSH Desktop**。

> 先决条件：一份能正常启动的 DSH Desktop。**不需要 git、也不需要 Node/pnpm**（脚本只用系统自带的能力）。
> 插件本体约 21MB（其中壁纸视频 20MB）。

</details>

## 能做什么

- **整屏动态壁纸**：一段 mp4 当整个界面的背景一直播。默认铺满，也能切成「留边」。
- **屏幕上的小桌宠**：拖来拖去换位置，位置记得住；点一下会弹一下。右键它弹出小面板，选显示内容、调大小。
- **余额 / 额度**：能显示 DeepSeek 官网余额（多少钱）或 OpenCode Go 订阅额度（还能用多少）。
- **回复旁边的角色头像**：AI 每回复一段，左边有个莫宁的圆形小头像。
- **冷色调界面**：深色配冷蓝，输入框弹窗都是半透明磨砂，能透出后面的壁纸。
- **AI 也用莫宁的口吻干活**（可选）：插件自带「莫宁人格」，新建会话时选上，AI 就按她的方式说话和汇报。
- **开屏画面**（可选）：打开软件先播一段莫宁开屏，见下面「开屏画面」。

## 桌宠：右键面板、余额与额度

**在桌宠上点右键**弹出小面板：上面选显示哪种数字，下面用滑杆调它的大小（70%~160%），选择都会记住。

- **官网余额**（默认）：DeepSeek 账户还剩多少钱。左键点一下＝刷新。**需要你自己配一个 DeepSeek 的 API Key**，没配就显示 `--`。
- **订阅额度**：如果你用 **OpenCode Go** 订阅，这里显示**还能用多少**。左键点一下在「5 小时 / 本周 / 本月」之间轮换，
  鼠标悬停能看到什么时候重置（北京时间）。
- **峰谷小方块**：工作日 9:00–12:00、14:00–18:00（北京时间）显示橙色「峰」，其余时间蓝色「谷」。
- **说话**：每隔 30 秒说一句，话从一个纯文本文件里读（一行一句，你自己写，见下面「素材」）。

Key 放哪：环境变量 `DEEPSEEK_API_KEY` / `OPENCODE_GO_API_KEY`，或 DSH 自己的凭据文件
（`%APPDATA%\dsh-desktop\harness\.credentials.yaml`）。**插件不会把 Key 发到别处，也不写日志。**

<details>
<summary>技术细节：额度数据怎么来的</summary>

上游是 OpenCode Go 官方接口：

```
GET https://opencode.ai/zen/go/v1/usage
Authorization: Bearer <OPENCODE_GO_API_KEY>        # 用 x-api-key 会 401
→ {"usage":{"rolling":{"percent":3,"resetsAt":"…"},"weekly":{…},"monthly":{…}}}
```

- 官方**只给「已用百分比」**，没有余额、也没有「今日使用」→ 界面上的「剩余 %」= `100 - percent`。
- **「今日已用」是本插件自己采样算的**：每次取数把百分比记进 `quota-samples.json`，按窗口分桶取 `max - min`
  （额度会随旧请求过期而回落，所以用涨跌幅而不是末值）。上游的 `resetsAt` 每次请求会毫秒级漂移，
  分桶前先量化到 30 分钟，否则每次请求都会开一个新桶。
- 官方额度上限（文档口径）：**$12 / 滚动 5 小时、$30 / 周、$60 / 月**。
- 不用 OpenCode Go 的话：额度接口返回 502，桌宠显示 `--` 并把气泡标红，**其余功能不受影响**。

</details>

## 素材

| 素材 | 位置 | 说明 |
|---|---|---|
| `wallpaper.mp4` | 仓库已带（约 20MB） | 1080×1080 / 30fps / H.264 / 无音轨。原始素材 2560×2560 60fps（106MB），为塞进 GitHub 做了转码。**精确 20,629,262 字节**，SHA-256 `588E78B6…5901930` |
| `poster.jpg` | 仓库已带 | 视频解码前的封面帧，避免首屏黑一下 |
| `pet.png` / `avatar.png` | 仓库已带 | 桌宠图与头像的**源文件**；插件实际用内嵌副本（见「开发」） |
| 换自己的视频 | `assets\wallpaper.mp4`、`%APPDATA%\dsh-desktop\mornye-theme\wallpaper.mp4`、或环境变量 `DSH_MORNYE_WALLPAPER` | 建议 16:9、H.264、1080p 以内；4K60 会一直占 GPU 解码 |
| `lines.txt`（台词） | `%APPDATA%\dsh-desktop\mornye-theme\lines.txt` 或环境变量 `DSH_MORNYE_LINES` | 一行一句，UTF-8 / GBK 都认；仓库里有 `lines.example.txt` 可照抄 |

## 莫宁人格（可选，让 AI 用她的口吻干活）

插件自带一份「莫宁人格」；装好后**新建会话时选上它**，AI 就会用她的方式说话与汇报（状态挂件也会变成她的用词：
空闲＝「基准模式」、生成中＝「推演中」、收工＝「推演完成」、出错＝「检测到危险」）。

- 只影响**新建的会话**；已经开着的会话不变（人格在会话创建时固定，中途换不了）。
- 它是一份 **agent preset，不是外观**。只想要人格不要皮肤：把 `preset/` 里两个文件复制到
  `$DSH_HOME\.agent-presets\mornye\` 即可。
- 会多用一点 token：人格正文约 1160 字（≈650 token/请求），随会话固定注入、可被缓存复用；子代理会继承。
- 不想让它自动装：设 `DSH_MORNYE_SKIP_PRESET=1`；已装过又改过怕被覆盖：目录存在时**一律跳过**，
  真要强制覆盖才用 `DSH_MORNYE_REDEPLOY_PRESET=1`。
- 排错：`GET /plugins/mornye-theme/preset` 会告诉你人格装没装、铺到了哪里。

## 开屏画面（可选，改的是软件安装目录）

装好后打开 DSH Desktop 可以先过一段「莫宁开屏」。它在 `assets\splash.mornye.html`，但**它是软件自带的文件**，
不能像插件那样加载，得投放一次：

```powershell
powershell -ExecutionPolicy Bypass -File .\apply-splash.ps1
```

脚本会**先备份**原来的 `splash.html`（存成 `splash.stock.html`）再写入。
⚠️ **DSH Desktop 升级会覆盖安装目录，升级后重跑一次即可恢复。**

## 技术细节

### 可配置项（可选，一般用不到）

| 变量 | 默认 | 作用 |
|---|---|---|
| `DSH_MORNYE_CONFIG_DIR` | `%APPDATA%\dsh-desktop\mornye-theme` | 运行期状态目录（外观开关、额度采样） |
| `DSH_MORNYE_WALLPAPER` | `assets/wallpaper.mp4` | 壁纸视频路径 |
| `DSH_MORNYE_POSTER` | `assets/poster.jpg` | 封面帧路径 |
| `DSH_MORNYE_LINES` | `<配置目录>\lines.txt` | 台词库路径 |
| `DSH_MORNYE_CREDENTIALS` | `%APPDATA%\dsh-desktop\harness\.credentials.yaml` | 取 `OPENCODE_GO_API_KEY` 的凭据文件 |
| `OPENCODE_GO_API_KEY` | — | 额度查询用的 key（优先于凭据文件） |
| `DSH_MORNYE_API_KEY` / `DEEPSEEK_API_KEY` | — | 查 DeepSeek 余额时用 |

### 插件提供的接口（排错时看）

| 路由 | 作用 |
|---|---|
| `GET /plugins/mornye-theme/health` | 探针：插件是否加载 + 当前外观开关 |
| `GET /plugins/mornye-theme/quota` | 订阅额度：三个时间窗 + 本地采样的「今日已用」 |
| `GET /plugins/mornye-theme/balance` | DeepSeek 余额 |
| `GET /plugins/mornye-theme/lines` | 台词库（每次现读文件，改完立刻生效） |
| `GET /plugins/mornye-theme/wallpaper.mp4` | 壁纸视频（支持 Range，能拖进度） |
| `GET /plugins/mornye-theme/poster.jpg` | 封面帧 |
| `GET/POST /plugins/mornye-theme/flag` | 外观开关 / 生效主题 / 铺满方式 / 桌宠位置与大小 |

### 开发（改代码的人看）

插件是**两个半边**，生效方式完全不同 —— 这是本地插件最费时间的地方：

| 半边 | 文件 | 改动生效 |
|---|---|---|
| client | `client/client.js` | **刷新页面即可** |
| host | `lib/*.js` | **必须重启 DSH Desktop** |

- 改完客户端脚本先 `node --check client/client.js`。
- 桌宠图与头像**内嵌成 data URL**（`PET_IMG` / `AVATAR_IMG`），不依赖 host 路由、没有缓存问题。
  换图：替换 `assets/pet.png` / `assets/avatar.png` → 跑 `node tools/embed-pet.mjs` / `embed-avatar.mjs`
  （需要 `sharp`：优先用本仓库 `node_modules`，其次用 DSH 自带那份，用 `DSH_APP_ROOT` 指定）。
- 样式钩子优先用**稳定属性**（`data-dsh-part`、`data-phase`、`data-chat-flow-kind`、`data-shell-overlay`）；
  哈希类名（`VphDDa_card`、`_8JRpoa_root`…）随版本会变，只在必要时用 `[class*='_card']` 这种部分匹配。
- 已知坑：`[class*='_hero']` 会连带命中 `_heroWorkspaceRow` 之类兄弟节点；`data-phase` 元素**就是**聊天区根节点本身。

## 目录结构

```
install.ps1         一键安装（放文件 / 改 package.json / 建链接）
lib/index.js        后端半边：接口、首屏样式预热、把壁纸塞进页面
lib/lines.js        台词文件解析（自动去掉行首序号，UTF-8 / GBK 都能读）
client/client.js    前端半边：主题注册、壁纸接管、桌宠、余额与额度、头像、磨砂样式（含内嵌图）
assets/             封面帧、桌宠图、头像图、开屏页模板、壁纸视频
tools/              换桌宠图 / 头像时，把图重新内嵌进 client.js 的两个小脚本
apply-splash.ps1    把开屏页投放进软件安装目录（会自动备份原文件）
cordis.patch.yml    告诉 DSH 把这个插件加载进来
```

## 许可

代码是 MIT，见 [LICENSE](LICENSE)。

⚠️ **素材不在 MIT 范围内**：`assets/` 里的壁纸、桌宠图、头像都是**角色 / 作品相关的第三方素材**，版权不属于本项目 ——
请自行确认你有权使用与再分发。想以本仓库为基础发布自己的分支，建议换成你自己的素材或直接删掉
（插件缺图时会走兜底样式，壁纸缺失会提示怎么放视频，不会崩）。
