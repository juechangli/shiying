# VideoDock 拾影

> 本版本提供应用下载，内置下载工具及重新编译的 LGPL FFmpeg。旧版 Mac 包中的 nonfree FFmpeg 已替换。第三方组件保留各自许可，见 [第三方说明](THIRD_PARTY_NOTICES.md)。

## 直接下载

- [Windows x64 安装器](https://github.com/juechangli/shiying/releases/download/v1.1.1/VideoDock-1.1.1-Windows-x64-Setup.exe)
- [Mac Apple Silicon 应用](https://github.com/juechangli/shiying/releases/download/v1.1.1/VideoDock-1.1.1-macOS-AppleSilicon.zip)
- [全部附件、校验和与第三方源码](https://github.com/juechangli/shiying/releases/tag/v1.1.1)

Windows 下载后运行安装器；Mac 解压后将 VideoDock.app 拖入“应用程序”。未使用商业代码签名或 Apple 公证，系统可能提示发布者未验证。Mac 需要 Apple Silicon 和 macOS 13 或更新版本。Windows 为交叉构建，尚未做 Windows 真机验收。Android/iPhone 使用应用内手机 Web 配对功能，并非原生 APK/IPA。

## 提供方与使用限制

**本项目由 godlin 提供。**

**本版本采用非商业使用许可：禁止未经书面授权的商业使用。**

- 允许个人学习、研究及其他非商业用途的使用、修改和分享。
- 未经权利人事先书面授权，不得出售本项目或其修改版本，不得将其用于收费服务、商业产品、商业运营或其他以营利为目的的用途。
- 非商业分享或再分发时，须保留“本项目由 godlin 提供”、原有版权声明及适用的许可文件，不得冒充原作者。
- 如需商业使用，请联系 **ironmanl@qq.com** 申请单独书面授权。
- 第三方依赖、组件及素材仍适用各自原有许可证，上述限制仅适用于权利人有权重新许可的自有内容。

Copyright 2026 **linjuechang (ironmanl@qq.com)**。

> **适用版本：1.1.1 及之后明确采用本许可的版本。** 本项目为源码可见的非商业版本，完整条款见 [LICENSE](LICENSE) 和 [NOTICE](NOTICE)。此前按 Apache-2.0 发布的版本仍保留其原许可；本次变更不撤销既有授权。

当前源码版本：1.1.1（非商业使用版）。包含桌面应用、手机 Web 界面、独立 Python 下载脚本，以及独立的 X 账号身份授权。已发布的一代版本仍为 v1.0.1。X 身份授权不用于下载器，登录后下载尚未实现。

X 开发者应用注册及配置见 [X 身份授权指南](docs/X-IDENTITY-SETUP.md)。

Python 视频下载脚本的图形应用版本。桌面应用在准备好本机 yt-dlp 与 FFmpeg 后，可粘贴网址、选择保存目录、选择画质、查看进度、取消、重试、打开文件及连接手机。

## 使用

1. 打开 VideoDock。
2. 粘贴完整的视频网址，可先点“解析链接”确认标题。
3. 选择画质，点击“更改”选择保存目录。
4. 点击“开始下载”。完成后点击“查看文件”。

默认保存到用户 `Downloads/VideoDock`。队列串行下载，最多排队 8 项。同名完成文件不覆盖；历史记录保存在当前系统用户的应用数据目录。关闭应用会断开手机连接；有下载进行时会询问是否停止并退出。

默认选择兼容性较好的 H.264 MP4 + AAC 音频并合并。没有对应格式时保留网站提供的其他可用格式。画质受来源与当前公开权限限制。不会读取浏览器 Cookie、绕过会员或 DRM，也不会使用任意终端命令执行用户输入。

## Android 与 iPhone

手机端为响应式 Web 应用，不是 APK 或 IPA。下载由 Windows / Mac 应用内置的服务处理；手机无需安装 Python。

1. 手机和电脑连接同一个可信 Wi-Fi。
2. 电脑打开“连接手机”，点击“开启手机连接”。此功能默认关闭。
3. 手机扫码或在浏览器输入页面显示的地址，再输入五分钟内有效的配对码。
4. 手机粘贴视频链接并提交任务。完成后点击“保存到手机”。

iPhone：Safari 分享菜单 → “添加到主屏幕”，可以创建入口；保存视频通常进入“文件”App 的下载目录，再按系统提供的分享菜单保存到其他位置。Android：浏览器菜单添加快捷方式；视频保存到浏览器的下载目录。网页不能任意指定手机系统文件夹。

局域网默认使用 HTTP，只适合可信网络；二维码不携带登录令牌。手机使用 HttpOnly 会话 Cookie，配对失败有限速；每个手机会话只能看到自己提交的任务。电脑端可查看全部任务。关闭手机连接后会撤销所有手机会话。

HTTPS 环境下可注册服务工作线程并安装 PWA；普通 HTTP 局域网下不承诺离线或完整 PWA 安装能力，浏览器快捷方式仍可作为入口。电脑关机、应用关闭或地址改变后，手机无法继续访问。远程公网部署需要正确配置 HTTPS 和访问控制，本版本不会自动开放公网端口。

## 安装包与验证范围

- Mac：Apple Silicon `.app`，本机实际运行与下载测试。
- Windows：x64 NSIS `.exe` 安装器，内置 Windows 下载组件；本 Mac 可构建，但不能替代 Windows 实机运行验证。
- 手机：与桌面应用一起提供，直接通过二维码访问；另附 Web 源码包便于部署。

本构建未使用商业代码签名证书或 Apple 公证；系统可能显示发布者验证提示。iPhone 原生 IPA 需要 Apple 开发环境、签名和设备分发流程，不能把 Web 包称为已签名的 iPhone 安装包。

## 开发和打包

Node 24.21.0，Electron 44.4.5，electron-builder 26.15.3。

```sh
npm ci
npm run vendors
# 按 THIRD_PARTY_NOTICES.md 准备经核验可再分发的 FFmpeg 和许可材料
npm test
npm start
npm run build:mac
npm run build:win
```

`scripts/vendors.cjs` 仅下载 yt-dlp 2026.08.19 并验证 SHA256，不再自动下载旧 FFmpeg。FFmpeg 需自行准备可再分发的构建及对应许可证、源码和构建材料。打包前会拒绝已知 nonfree 构建和缺失许可材料的情况；此检查不等于完整许可认证。下载较慢时可指定 `VIDEODOCK_DOWNLOAD_MIRROR`，校验仍必须通过。供应商许可证和来源随工具一起打包在 `resources/tools`。

可使用 `node scripts/verify-download.cjs` 对公开测试视频验证元信息和完整下载。安全接口测试使用隔离的临时目录，不会改动用户下载文件。

仓库根目录提供 `download_video.py`，可以用 `python3 download_video.py` 独立运行。

## 仓库范围

- `src/`：Electron 主进程、下载引擎和手机访问服务。
- `ui/`：桌面和手机共用的界面。
- `test/`：接口与进度回归测试。
- `scripts/`：下载组件准备和实际下载验证。
- `download_video.py`：独立 Python 命令行下载器。

源码仓库不提交依赖目录、工具二进制、安装包、个人任务记录或测试视频。准备组件脚本当前使用 macOS 的 `/usr/bin/curl`，上述打包流程以 Apple Silicon Mac 为构建环境；Windows 安装包通过交叉构建生成，尚未完成 Windows 实机验证。

1.0.1 的修复和验证边界见 [修复记录](FIXES-1.0.1.md)。

## 发布与后续设计

第一代发布基线为 **v1.0.1**，详见 [发布说明](docs/releases/v1.0.1.md)。

后续账号功能见 [通用账号与会话设计](docs/ACCOUNT-SESSION-DESIGN.md)：默认临时会话、用户可选的加密长期保存、过期提示、退出清理和验收要求。**设计尚未实现，不属于 v1.0.1 的功能。**

## 隐私与安全

见 [隐私说明](PRIVACY.md)、[安全范围](SECURITY.md) 和 [开源前审计](docs/OPEN-SOURCE-AUDIT-2026-10-09.md)。公开源码不表示已解决报告中的所有风险；手机端仅供可信局域网和可信用户使用。
