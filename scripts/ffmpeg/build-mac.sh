#!/bin/sh
# SPDX-License-Identifier: LGPL-2.1-or-later
set -eu
cd "$(dirname "$0")/mac"
../ffmpeg-9.0.2/configure --disable-autodetect --disable-gpl --disable-nonfree --disable-doc --disable-debug --disable-ffplay --disable-avdevice --disable-encoders --enable-encoder=aac,pcm_s16le --disable-filters --enable-filter=aresample,anull,aformat,format,null --enable-securetransport --extra-cflags=-mmacosx-version-min=12.0 --extra-ldflags=-mmacosx-version-min=12.0 > configure.log 2>&1
make -j8 > build.log 2>&1
./ffmpeg -L
