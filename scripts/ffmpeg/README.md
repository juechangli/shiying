# FFmpeg 9.0.2 构建

构建脚本作为 FFmpeg 对应源码的构建材料，按 LGPL-2.1-or-later 提供，不受拾影非商业条款限制。

从 Release 下载 ffmpeg-9.0.2.tar.xz（位于 ThirdPartySources 归档内），验证附带官方签名，然后将源码解压到本目录，得到 ffmpeg-9.0.2/。

macOS Apple Silicon：安装 Xcode Command Line Tools 后，运行 sh build-mac.sh，输出在 mac/。本次 Apple clang 17，链接系统框架，无 Homebrew 运行库依赖。FFmpeg 自身部署目标为 macOS 12，应用 Electron 的实际最低系统版本为 macOS 13。

Windows：将本目录挂载为 Debian bookworm arm64 容器的 /work，运行 sh /work/build-win.sh。该脚本安装宿主 GCC 和 MinGW-w64 12.2 交叉编译器，输出在 windows/。需访问 Debian 包源，容器内以 root 执行。此流程构建 Windows x64，不等于 Windows 真机验收。

源码未修改。所有构建都关闭自动依赖探测、GPL、nonfree；保留下载文件合并所需容器和音频能力，不提供通用视频转码编码器全集。
