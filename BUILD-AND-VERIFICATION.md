# VideoDock 1.0.0 交付与验证记录

构建日期：2026-09-21。构建机器：macOS Apple Silicon。

## 交付文件

- `dist/VideoDock-1.0.0-Windows-x64-Setup.exe`：Windows x64 NSIS 安装器，约 144 MiB。
- `dist/VideoDock-1.0.0-macOS-AppleSilicon.zip`：Apple Silicon Mac 应用，约 176 MiB；解压后可放入应用程序目录。
- 本机已安装至 `~/Applications/VideoDock.app`。
- `dist/VideoDock-1.0.0-Source.zip`：桌面与手机 Web 界面、下载服务、测试和构建脚本。不是手机安装包。
- `README.md`：使用、手机连接、开发与构建说明。

## 已完成验证

1. `npm test`：10 项测试全部通过，覆盖网址校验、未配对拒绝访问、桌面令牌不能用于手机监听器、跨来源请求、手机任务隔离、手机不能选系统目录、重复任务、文件归属/真实路径校验以及关闭共享后会话失效。
2. 内置独立 yt-dlp + FFmpeg 完整下载成功，不依赖外部 Python。公开测试视频 BV15Ct66VEK4：1080 × 1920、H.264 + AAC、83.638 秒、31,064,412 字节。使用 ffprobe 核对音视频流。
3. 打包 Mac 应用已启动并检查界面；发现并修复 preload 导出的 desktop 与顶层声明发生冲突导致界面无法初始化的问题。修复后正常显示保存目录。
4. 在 390 × 844 浏览器视口验证手机界面：配对、解析、实际下载、完成状态、保存文件链接。页面宽度和视口宽度均为 390，无横向溢出；浏览器控制台无错误。
5. Windows 安装器构建成功，PE 文件识别正常，实际应用为 x86-64。
6. 两个平台 app.asar 中的主要源码与最终源文件逐字节一致；下载工具、许可证和来源说明已包含。
7. yt-dlp 文件核对官方 SHA256；FFmpeg 压缩包核对官方 GitHub 发行资产 digest。使用下载镜像时仍进行校验。

## 验证边界

- 尚未在 Windows 实机执行安装器或运行应用。
- 手机端验证来自浏览器手机视口，尚未在实体 Android / iPhone 上测试系统保存菜单。
- 手机版为连接电脑服务的 Web 应用，未制作 APK / 已签名 IPA。电脑应用需要保持开启。
- 当前 Mac 包仅支持 Apple Silicon，未构建 Intel Mac 包。
- 未使用商业发布证书或 Apple 公证，不保证其他设备免系统验证提示。
- 局域网连接默认关闭；用户在应用中主动开启后才提供手机配对。普通 HTTP 局域网不承诺完整离线 PWA 安装能力。

详细操作步骤见 README.md。源代码压缩包不包含 node_modules、下载工具二进制、私人任务历史或测试视频；桌面安装包包含运行所需组件。
