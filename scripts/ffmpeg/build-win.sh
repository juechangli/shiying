#!/bin/sh
# SPDX-License-Identifier: LGPL-2.1-or-later
set -eu
apt-get update > /work/windows-apt.log 2>&1
apt-get install -y --no-install-recommends gcc libc6-dev gcc-mingw-w64-x86-64-posix make pkg-config xz-utils ca-certificates >> /work/windows-apt.log 2>&1
mkdir -p /work/windows
cd /work/windows
../ffmpeg-9.0.2/configure --target-os=mingw32 --arch=x86_64 --cross-prefix=x86_64-w64-mingw32- --enable-cross-compile --disable-x86asm --disable-autodetect --disable-gpl --disable-nonfree --disable-doc --disable-debug --disable-ffplay --disable-avdevice --disable-encoders --enable-encoder=aac,pcm_s16le --disable-filters --enable-filter=aresample,anull,aformat,format,null --enable-schannel --extra-ldflags=-static > configure.log 2>&1
make -j8 > build.log 2>&1
x86_64-w64-mingw32-objdump -p ffmpeg.exe | sed -n '/DLL Name/p'
