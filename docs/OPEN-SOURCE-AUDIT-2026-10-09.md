# 拾影开源前审计（2026-10-09）

## 结论与范围

当前不建议直接将整个本地文件夹打包公开，也不建议继续原样分发现有 Mac 安装包。
已跟踪源码及本地可达 Git 历史中未发现真实访问令牌、密码或私钥，但存在发布组件不可再分发、项目自身缺少许可证、提交者个人邮箱和构建依赖漏洞等问题。
“未发现”是以下检查范围内的结果，不构成绝对无泄漏或无漏洞保证。

- 本地版本：1.1.0，分支 `codex/x-account-authorization`，提交 `b94fcd46d57d57f456515391d640d3a995b76c2a`。
- 检查 34 个跟踪文件、3 个本地可达提交、43 个去重 Git 文件对象；包括常见凭证格式、秘密字面量、高熵候选、个人路径和提交元数据。
- 检查本地 1.0.0、1.0.1 源码 ZIP；检查 1.0.0 Mac、1.0.1 Mac/Windows、1.1.0 Mac 的应用 ASAR 文件清单和自有源码。
- 检查私有目录的文件种类及脱敏凭证候选；没有读取真实浏览器会话或系统钥匙串。
- 检查打包配置、下载引擎、手机服务、X 身份授权、前端 DOM 使用和现有自动测试。
- 查询 npm 官方漏洞数据库，分别检查全量依赖和生产依赖。
- 只读查询 CNB 分支和标签。未修改远端、发布可见性、Git 历史或业务代码。
- 未完成 Windows 原生二进制运行、安装器完整解包、真实 X OAuth、完整桌面 GUI、安全渗透或所有供应商二进制内部扫描。

## 必须先处理的问题

### A01：Mac 包内 FFmpeg 明确不可再分发（发布阻断）

`scripts/vendors.cjs:18` 下载 ffmpeg-static b6.1.1 的 darwin-arm64 构建。实际执行本地二进制的 `-version` 和 `-L`，发现：

```text
ffmpeg version 6.0
--enable-gpl ... --enable-version3 ... --enable-nonfree
This version of ffmpeg has nonfree parts compiled in.
Therefore it is not legally redistributable.
```

二进制 SHA-256 为 `a90e3db6a3fd35f6074b013f948b1aa45b31c6375489d39e572bea3f18336584`。
本地 vendor、1.0.0 / 1.0.1 / 1.1.0 的 Mac 应用、1.0.1 Mac ZIP 内部组件均一致。
1.0.1 Mac ZIP 的 SHA-256 为 `06d9fb5a9d813c45e2f620d26b5f3e32445e7d178016c79ba01aed12c8941b9a`，与本地保存的 CNB 发布回执一致；没有重新下载线上附件确认其当前内容。

这与自身源码选择 MIT / Apache-2.0 无关：单纯给拾影加许可证或附上 FFmpeg 通用说明，不能消除该二进制的再分发问题。
应先停止分发受影响的 Mac 包，换用经核验可再分发的构建，补齐对应源码、构建配置、实际适用许可证和外部组件信息，再重新打包。
构建过程需要增加许可检查，而非只校验下载哈希。Windows 构建须独立核查，不能直接推断同样结论。

官方依据：[FFmpeg License 的 Incompatible libraries](https://ffmpeg.org/doxygen/trunk/md_LICENSE.html)、[FFmpeg Legal](https://ffmpeg.org/legal.html)。

### A02：自身源码缺少明确的开源许可（开源准备阻断）

仓库没有项目根 LICENSE / NOTICE，`package.json` 没有 `license`，作者仍为 `Personal tools`。
此前栖伴项目的许可证不会自动适用于拾影。需明确拾影自有代码的许可、版权署名及第三方边界，并让许可证随源码包和应用分发。
`private: true` 只防止误发到 npm，不妨碍公开 Git，也不等于有了开源许可。

供应商工具有许可证说明，运行时 npm 包也随 ASAR 保留许可证；但 `SOURCES.txt` 的 FFmpeg 源码链接只有通用下载目录，不能证明已提供与二进制相对应的完整源码与构建材料。yt-dlp 的源码与预编译文件许可也需分别核对：[上游 README](https://github.com/yt-dlp/yt-dlp/blob/master/README.md#license)。

### A03：Git 元数据包含个人身份；旧包有本机路径（隐私处理）

三个提交的作者均使用旧署名及个人邮箱。公开 Git 会公开这些信息；修改未来提交的 git config 不会改变既有历史。本报告不复制邮箱全文。
先确认是否保留原身份；若要使用公开署名，需在备份后处理作者和提交者元数据，或者以经过审核的快照创建新的公开历史。不要未经确认强推已有历史。

本地 1.0.0 源码 ZIP 的 `BUILD-AND-VERIFICATION.md:9` 包含真实本机用户路径；当前跟踪文件和 1.0.1 源码包对应内容未发现该真实路径。`download_video.py` 的 `/Users/me/` 是通用示例，不是本机信息。
测试脚本和说明包含真实公开测试视频 ID，它不是凭证，但建议改为可配置链接或中性测试素材。

### A04：构建依赖有已知漏洞（发布前修复）

npm 官方审计返回 9 个受影响依赖条目：1 high、8 moderate，来自两个根源公告及传递依赖链，不是 9 个独立漏洞。

- `http-cache-semantics@4.2.0`：high，[GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp)。
- `sprintf-js@1.1.3`：moderate，[GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)，传递影响 roarr / global-agent / Electron 构建工具链。
- 以上位于开发/构建依赖；`npm audit --omit=dev` 为 0，不应描述为已经证实终端用户存在 9 个可利用漏洞。
- npm 给出的部分自动修复方案涉及 electron-builder 版本倒退，不能直接运行 `npm audit fix --force`。应选兼容修复并重新验证打包。
- npm 审计不覆盖 Electron/Chromium 原生运行时及内置 FFmpeg / yt-dlp 的全部漏洞。Electron 放在 devDependencies 也不表示它不会随应用分发。

原始 JSON 仅存放在忽略目录 `private/open-source-npm-audit.json` 和 `private/open-source-npm-production-audit.json`。

## 安全及产品完善项

### A05：手机提交的 URL 没有完整内网访问限制

`src/engine.cjs:7` 只检查域名字符串。实测 `http://printer.local/video.mp4` 与 `http://service.internal/video.mp4` 能通过校验；代码没有检查 DNS 结果、重定向及提取器后续请求。
已配对用户可能让电脑请求其本来不希望开放的内网目标。这里确认的是校验缺口，未向真实内网目标发起请求或证明敏感数据已泄漏。
需在下载子进程实际出站路径落实限制；仅提前查一次 DNS 不能覆盖重绑定和重定向。至少明确这是可信用户的本机工具，不应直接作为公网多用户下载服务部署。

### A06：局域网会话和资源限制有待加强

- `src/server.cjs:13` 监听所有 IPv4 接口，使用 HTTP；README 已披露可信 Wi-Fi 限制。传输中的 Cookie 和视频不具备 TLS 机密性，公网使用需独立设计。
- `src/server.cjs:26` 将 Origin 与客户端提供的 Host 比较，未校验允许的 Host。当前仍有配对鉴权，不能据此声称匿名用户已能接管，但缺少 DNS rebinding 防御层。
- sessions/rates Map 没有总容量限制或完整过期清理；配对码有效期内可重复添加会话。任务持久化只保留 200 项，但运行时 jobs 数组不截断。
- 下载有 8 项排队限制及网络超时，但没有总下载时长/文件大小/磁盘配额限制；多次已授权请求可能长期占用资源。

### A07：隐私说明和清理功能不足

引擎会持久化历史链接、标题和目录；目前没有用户可操作的“清空下载历史”接口/按钮。
项目有授权技术说明，但没有集中说明数据种类、保存路径、保留期限、发送给哪些第三方以及删除方式的隐私文档。
本地 `private/`、`test-results/`、`dist*/` 等被 Git 忽略，但仍真实存在；其中测试结果包含本机路径和测试活动。不得将整个工作目录当作源码包上传。
`.gitignore` 对 Cookie、账号密文、SQLite、下载媒体等未来误放文件的防线仍较窄，宜增加敏感文件检查和发布白名单。

### A08：线上与本地版本不同

本次 `git ls-remote` 结果：

- 线上 main：`29e6f411e53959f1756de13511212495113239af`。
- 线上 v1.0.1 标签目标：`de31f994a8bc495347fbd0bfe4b6d8989bb6132b`。
- 本地新增 X 授权提交：`b94fcd46d57d57f456515391d640d3a995b76c2a`，未出现在查询到的远端分支中。

开源前应明确发布哪个版本。X 授权是独立身份查询功能，不能表述为“登录后即可下载受限 X 视频”；真实 X 授权仍未经过本轮验证。

## 已通过的检查

- 常见凭证格式与高熵候选扫描未发现真实源码凭证。命中测试 token 为 `test-*` 假值；测试账号密码 URL 为 example.com 输入校验夹具。
- 远端 URL 不嵌入账号密码。私有目录、依赖、构建产物和测试媒体均被 Git 忽略。
- 检查的源码 ZIP 与 ASAR 没有发现 accounts、x-identity.enc、history.json、settings.json、private 等敏感路径。
- X 令牌保存在主进程私有字段，默认临时、可选 safeStorage；快照不返回 token，系统加密不可用时拒绝持久化；PKCE/state 和取消竞争有测试。
- Electron 使用 sandbox/contextIsolation，禁用 nodeIntegration；权限请求拒绝，外部导航和窗口创建有限制。UI 使用 textContent 展示网站与账号文本。
- 下载通过 spawn 参数数组执行，并以 `--` 隔离 URL；没有将 URL 拼入 shell 命令。
- 手机接口要求配对，按 owner 隔离任务，文件下载检查 realpath 范围，关闭连接撤销手机会话。
- Node 24.21.0 下现有测试 18/18 通过。初次沙箱运行因禁止监听端口失败，允许本机临时端口后通过；不将环境限制误报为代码失败。

## 建议执行顺序

1. 先处理现有 Mac 包中的 nonfree FFmpeg，核验 Windows 组件的实际许可；修正构建来源及许可检查。
2. 明确拾影自身许可证与公开作者信息，补 LICENSE、第三方声明、隐私说明及对应源码材料。
3. 处理 Git 个人元数据与旧源码包的本机路径，使用白名单生成源码包。
4. 修复构建依赖漏洞；对手机端请求限制和会话容量做回归测试。
5. 将经过审计的 1.1.0 或后续版本推送、重新打包、独立验证附件，最后再调整仓库公开状态。

本次只增加审计报告。没有替换 FFmpeg、修改应用行为、重写历史、推送代码、撤下 Release 或改变仓库可见性。

## 源码公开准备补充

以上是修复前审计记录。随后补充了 Apache-2.0、NOTICE、第三方及隐私/安全说明；停止自动下载旧 FFmpeg，并在打包前拒绝已知 nonfree 组件。公开版本使用全新 Git 历史和指定公开身份，只包含源码白名单，排除隐藏签名读取脚本。构建依赖漏洞、手机服务安全完善及真实 X 验证仍未完成；没有发布新的二进制安装包，也未撤下旧 CNB 附件。

## 1.1.1 许可变更

后续自有内容改为源码可见的非商业使用许可，由 godlin 提供。README、LICENSE、NOTICE 和包元数据已同步。上文的 Apache-2.0 描述保留为历史事实，旧版既有授权不会因新许可或 Git 历史替换而被撤销。此变更不表示已修复所有安全问题。
