/* VD-ATTR-v1:​‌‌​‌‌​​​‌‌​‌​​‌​‌‌​‌‌‌​​‌‌​‌​‌​​‌‌‌​‌​‌​‌‌​​‌​‌​‌‌​​​‌‌​‌‌​‌​​​​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​​‌‌‌​​‌​‌‌‌‌​‌‌​‌​​‌​‌‌‌​​‌​​‌‌​‌‌‌‌​‌‌​‌‌‌​​‌‌​‌‌​‌​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​‌‌​​​‌​​​​​​​‌‌‌​​​‌​‌‌‌​​​‌​​‌​‌‌‌​​‌‌​​​‌‌​‌‌​‌‌‌‌​‌‌​‌‌​‌:END */
'use strict';
// A release guard, not a replacement for reviewing third-party licenses.
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const target = process.argv[2];
if (!['mac-arm64', 'win-x64'].includes(target)) throw Error('Unsupported release target');
const dir = path.join(__dirname, '..', 'vendor', target);
const binary = fs.readFileSync(path.join(dir, target === 'win-x64' ? 'ffmpeg.exe' : 'ffmpeg'));
const hash = createHash('sha256').update(binary).digest('hex');
if (hash === 'a90e3db6a3fd35f6074b013f948b1aa45b31c6375489d39e572bea3f18336584' || binary.includes(Buffer.from('--enable-nonfree'))) {
  throw Error('Refusing to distribute a nonfree FFmpeg build. See THIRD_PARTY_NOTICES.md.');
}
for (const name of ['FFmpeg-LICENSE.txt', 'FFmpeg-SOURCE.txt', 'yt-dlp-LICENSES.txt', 'yt-dlp-SOURCES.txt']) {
  if (!fs.readFileSync(path.join(dir, name), 'utf8').trim()) throw Error(`Missing license/source information: ${name}`);
}
console.log('Basic tool release checks passed; maintainer license review is still required.');
