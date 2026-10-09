#!/usr/bin/env python3
# VD-ATTR-v1:​‌‌​‌‌​​​‌‌​‌​​‌​‌‌​‌‌‌​​‌‌​‌​‌​​‌‌‌​‌​‌​‌‌​​‌​‌​‌‌​​​‌‌​‌‌​‌​​​​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​​‌‌‌​​‌​‌‌‌‌​‌‌​‌​​‌​‌‌‌​​‌​​‌‌​‌‌‌‌​‌‌​‌‌‌​​‌‌​‌‌​‌​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​‌‌​​​‌​​​​​​​‌‌‌​​​‌​‌‌‌​​​‌​​‌​‌‌‌​​‌‌​​​‌‌​‌‌​‌‌‌‌​‌‌​‌‌​‌:END
"""交互式视频下载器：python3 download_video.py。

Python 3.10+。首次使用自动将 yt-dlp 安装到个人缓存目录，不修改项目依赖。
高清视频合并需要已安装的 FFmpeg。默认只下载指定视频，不下载整个合集。
"""

from __future__ import annotations

import argparse
import importlib
import importlib.util
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import tempfile
from urllib.parse import urlsplit


DEFAULT_DIRECTORY = Path.home() / "Downloads"


def cache_directory() -> Path:
    if sys.platform == "darwin":
        base = Path.home() / "Library" / "Caches"
    elif os.name == "nt":
        base = Path(os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData/Local")))
    else:
        base = Path(os.environ.get("XDG_CACHE_HOME", str(Path.home() / ".cache")))
    return base / "interactive-video-downloader" / f"python{sys.version_info.major}.{sys.version_info.minor}" / "packages"


def find_ffmpeg() -> str | None:
    found = shutil.which("ffmpeg")
    if found:
        return found
    for candidate in ("/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"):
        if Path(candidate).is_file() and os.access(candidate, os.X_OK):
            return candidate
    return None


def load_downloader(*, install: bool = True, upgrade: bool = False):
    target = cache_directory()
    if target.is_dir():
        sys.path.insert(0, str(target))
    available = importlib.util.find_spec("yt_dlp") is not None
    if upgrade or (not available and install):
        print(f"正在安装{'或更新' if upgrade else ''}下载依赖 yt-dlp。\n独立缓存目录：{target}", flush=True)
        target.mkdir(parents=True, exist_ok=True)
        if importlib.util.find_spec("pip") is not None:
            command = [sys.executable, "-m", "pip", "install", "--disable-pip-version-check", "--upgrade", "--target", str(target), "yt-dlp"]
        elif shutil.which("uv"):
            command = [shutil.which("uv"), "pip", "install", "--python", sys.executable, "--upgrade", "--target", str(target), "yt-dlp"]
        else:
            raise RuntimeError("此 Python 没有 pip，也未找到 uv。请使用附带 pip 的 Python 3.10 或更新版本运行脚本。")
        result = subprocess.run(command, check=False)
        if result.returncode:
            raise RuntimeError("依赖安装失败，请检查网络后重新运行。现有视频不受影响。")
        if str(target) not in sys.path:
            sys.path.insert(0, str(target))
        importlib.invalidate_caches()
        available = importlib.util.find_spec("yt_dlp") is not None
    if not available:
        return None
    return importlib.import_module("yt_dlp")


def clean_input(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    return value


def validate_url(value: str) -> str:
    value = clean_input(value)
    try:
        parsed = urlsplit(value)
    except ValueError as exc:
        raise ValueError("网址格式不正确，请粘贴浏览器地址栏中的完整网址。") from exc
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise ValueError("请输入以 http:// 或 https:// 开头的视频网址。")
    if parsed.username or parsed.password or any(c.isspace() for c in value):
        raise ValueError("请使用不含空格、账号或密码的普通视频网址。")
    return value


def prepare_directory(value: str) -> Path:
    value = clean_input(value) or str(DEFAULT_DIRECTORY)
    # 支持从 macOS 终端拖入带空格的目录，例如 /Users/me/My\ Videos。
    if os.name != "nt" and "\\ " in value:
        try:
            pieces = shlex.split(value)
            if len(pieces) == 1:
                value = pieces[0]
        except ValueError:
            pass
    directory = Path(os.path.expandvars(value)).expanduser().resolve()
    if directory.exists() and not directory.is_dir():
        raise ValueError("填写的是文件，请改为保存视频的文件夹路径。")
    directory.mkdir(parents=True, exist_ok=True)
    # 提前发现无写入权限，避免下载完才报错。只创建并清理本次临时文件。
    with tempfile.TemporaryFile(dir=directory):
        pass
    return directory


def ask_url() -> str:
    while True:
        text = input("\n视频网址（输入 q 退出）：").strip()
        if text.lower() in {"q", "quit", "exit"}:
            raise KeyboardInterrupt
        try:
            return validate_url(text)
        except ValueError as exc:
            print(f"提示：{exc}")


def ask_directory() -> Path:
    while True:
        text = input(f"保存目录（直接回车使用 {DEFAULT_DIRECTORY}）：")
        try:
            return prepare_directory(text)
        except (OSError, ValueError) as exc:
            print(f"目录不可用：{exc}")


def download(yt_dlp, url: str, directory: Path, ffmpeg: str, *, max_height: int = 0) -> list[Path]:
    height = f"[height<={max_height}]" if max_height else ""
    # 优先 MP4 / H.264 + AAC，兼容常见播放器；缺少这些编码时转用站点
    # 提供的其他格式。只进行封装，不为了 MP4 扩展名而伪装或重压画面。
    formats = (
        f"bestvideo[ext=mp4][vcodec^=avc1]{height}+bestaudio[ext=m4a]/"
        f"best[ext=mp4]{height}/"
        f"bestvideo[ext=mp4]{height}+bestaudio[ext=m4a]/"
        f"bestvideo{height}+bestaudio/best{height}"
    )
    finished: list[Path] = []

    def record_finished(name: str) -> str:
        finished.append(Path(name))
        return name

    options = {
        "format": formats,
        "merge_output_format": "mp4/mkv",
        "ffmpeg_location": str(Path(ffmpeg).parent),
        "outtmpl": str(directory / "%(title).140B [%(id)s].%(ext)s"),
        "windowsfilenames": True,
        "noplaylist": True,
        "overwrites": False,
        "continuedl": True,
        "socket_timeout": 30,
        "retries": 3,
        "fragment_retries": 3,
        # 使用 yt-dlp 的最终文件阶段获取合并后的真实文件名。
        "post_hooks": [record_finished],
    }
    print(f"\n保存位置：{directory}\n画质：{'最高可用画质' if not max_height else f'最高 {max_height} 像素高度'}，优先 H.264 MP4\n", flush=True)
    with yt_dlp.YoutubeDL(options) as downloader:
        result = downloader.extract_info(url, download=True)
        if not result:
            raise RuntimeError("未获取到视频信息。")
    paths = list(dict.fromkeys(p.resolve() for p in finished if p.is_file()))
    if not paths:
        raise RuntimeError("下载器未返回已完成的文件，请检查上方输出和保存目录。")
    for file in paths:
        print(f"\n下载完成：{file}\n文件大小：{file.stat().st_size / 1024 / 1024:.2f} MiB")
        if file.suffix.lower() != ".mp4":
            print("说明：此来源未提供适合直接合并的 MP4 流，已保留可用格式，没有强制重新压制。")
    return paths


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="输入网址和目录，下载视频。默认单个视频，优先 MP4。")
    parser.add_argument("--url", help="视频网址；省略时交互输入")
    parser.add_argument("--output", "-o", help="保存目录；省略时交互输入")
    parser.add_argument("--max-height", type=int, default=0, help="限制视频高度，例如 1080；默认不限（竖屏也按高度计算）")
    parser.add_argument("--check", action="store_true", help="只检查依赖，不安装、不下载")
    parser.add_argument("--install-deps", action="store_true", help="仅安装 yt-dlp 并检查环境")
    parser.add_argument("--update", action="store_true", help="更新 yt-dlp 后退出，适用于网站规则变化后下载失败")
    args = parser.parse_args(argv)
    if sys.version_info < (3, 10):
        print("请使用 Python 3.10 或更新版本。", file=sys.stderr)
        return 1
    if args.max_height < 0:
        parser.error("--max-height 必须是 0 或正整数")
    try:
        ffmpeg = find_ffmpeg()
        if args.check or args.install_deps or args.update:
            yt_dlp = load_downloader(install=not args.check, upgrade=args.update)
            print(f"Python：{sys.version.split()[0]}\nyt-dlp：{yt_dlp.version.__version__ if yt_dlp else '未安装'}\nFFmpeg：{ffmpeg or '未安装'}")
            return 0 if yt_dlp and ffmpeg else 1
        if not ffmpeg:
            raise RuntimeError("未找到 FFmpeg。macOS 可运行 brew install ffmpeg；Windows / Linux 请安装 FFmpeg 并加入 PATH，然后重试。")
        print("=== 视频下载器 ===\n支持 B 站等 yt-dlp 支持的网站；默认不下载整个合集。")
        yt_dlp = load_downloader()
        url = validate_url(args.url) if args.url else ask_url()
        directory = prepare_directory(args.output) if args.output else ask_directory()
        download(yt_dlp, url, directory, ffmpeg, max_height=args.max_height)
        return 0
    except (KeyboardInterrupt, EOFError):
        print("\n已取消。未完成的 .part 文件可留待下次续传。")
        return 130
    except Exception as exc:
        print(f"\n下载未完成：{exc}", file=sys.stderr)
        print("若网站要求登录、会员或地区权限，本脚本不会自动读取浏览器 Cookie 或绕过限制。\n若之前可下载而现在失败，可运行：python3 download_video.py --update", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
