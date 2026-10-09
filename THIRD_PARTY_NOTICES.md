# 第三方组件

拾影 1.1.1 的自有代码采用根目录 LICENSE 中的非商业使用许可；历史 Apache-2.0 版本不受追溯影响。第三方组件适用各自许可，项目许可证不覆盖它们。

- Electron：MIT，Chromium 及其他组件适用其附带声明。打包时保留 Electron 的 LICENSE / Chromium notices。
- qrcode 及生产依赖：保留各包的许可证；确切版本见 package-lock.json。
- yt-dlp：源码与预编译包的许可不应混为一谈；参阅 [上游许可说明](https://github.com/yt-dlp/yt-dlp#license)。准备脚本保留 THIRD_PARTY_LICENSES 和源码版本链接。
- FFmpeg：本公开源码仓库不携带二进制，也不再自动下载 ffmpeg-static b6.1.1。已知旧 Mac 构建启用 `--enable-nonfree`，不得继续作为安装包组件分发。

## 准备 FFmpeg

本机开发可自行安装 FFmpeg，并将适合目标平台的程序放入 `vendor/mac-arm64/ffmpeg` 或 `vendor/win-x64/ffmpeg.exe`。私人运行与对外再分发的要求不同。

如需分发安装包，必须先确认实际构建配置与所有外部库允许再分发。保留完整适用许可证为 `FFmpeg-LICENSE.txt`，在 `FFmpeg-SOURCE.txt` 写清确切版本、构建选项、对应完整源码与修改的取得方式，并按实际许可证履行分发义务。不能只提供 FFmpeg 通用首页或把校验成功当成许可合格。

构建前检查会拒绝已知 nonfree 构建和缺失的说明文件，但不会自动证明全部组件合规。Windows 构建必须单独核对。

官方依据：[FFmpeg License](https://ffmpeg.org/doxygen/trunk/md_LICENSE.html)、[FFmpeg Legal](https://ffmpeg.org/legal.html)。
