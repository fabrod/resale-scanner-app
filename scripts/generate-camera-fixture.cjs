#!/usr/bin/env node
// Generate a camera input for Cypress without ffmpeg or a barcode image service.
// Run: node scripts/generate-camera-fixture.cjs
// Chrome loops the Y4M file supplied with --use-file-for-fake-video-capture.
const fs = require('node:fs');
const path = require('node:path');

const UPC = '049000028911';
const EAN13 = `0${UPC}`;
const WIDTH = 640;
const HEIGHT = 480;
const MODULE_WIDTH = 4;
const FRAME_COUNT = 10;

const LEFT = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011',
];
const LEFT_EVEN = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111',
];
const PARITY = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
  'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL',
];

function encodeEan13(value) {
  if (!/^\d{13}$/.test(value)) throw new Error('EAN-13 requires 13 digits.');
  const digits = [...value].map(Number);
  const weighted = digits.slice(0, 12).reduce((sum, digit, i) => sum + digit * (i % 2 ? 3 : 1), 0);
  if ((10 - weighted % 10) % 10 !== digits[12]) {
    throw new Error(`Invalid EAN-13 checksum: ${value}`);
  }
  const parity = PARITY[digits[0]];
  const left = digits.slice(1, 7).map((digit, i) => (parity[i] === 'L' ? LEFT : LEFT_EVEN)[digit]).join('');
  const right = digits.slice(7).map((digit) => LEFT[digit].replace(/[01]/g, (bit) => bit === '0' ? '1' : '0')).join('');
  return `101${left}01010${right}101`;
}

const bits = encodeEan13(EAN13);
if (bits.length !== 95) throw new Error('Invalid EAN-13 module count.');

// Studio-range luma with neutral chroma produces a black-on-white barcode.
// Center the 95 barcode modules with at least 11 white modules on either side.
const luma = Buffer.alloc(WIDTH * HEIGHT, 235);
const leftEdge = Math.floor((WIDTH - bits.length * MODULE_WIDTH) / 2);
const top = 120;
const bottom = 340;
for (let module = 0; module < bits.length; module++) {
  if (bits[module] !== '1') continue;
  const isGuard = module < 3 || (module >= 45 && module < 50) || module >= 92;
  const barBottom = bottom + (isGuard ? 12 : 0);
  for (let y = top; y < barBottom; y++) {
    luma.fill(16, y * WIDTH + leftEdge + module * MODULE_WIDTH, y * WIDTH + leftEdge + (module + 1) * MODULE_WIDTH);
  }
}
const chroma = Buffer.alloc(WIDTH * HEIGHT / 2, 128);
const frame = Buffer.concat([Buffer.from('FRAME\n'), luma, chroma]);
const output = path.resolve(process.argv[2] || path.join(__dirname, '..', 'cypress', 'fixtures', 'product-barcode.y4m'));
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, Buffer.concat([
  Buffer.from(`YUV4MPEG2 W${WIDTH} H${HEIGHT} F10:1 Ip A1:1 C420jpeg\n`),
  ...Array(FRAME_COUNT).fill(frame),
]));
console.log(`Generated ${output} (${WIDTH}x${HEIGHT}, ${FRAME_COUNT} frames; UPC ${UPC}, valid EAN-13 ${EAN13}).`);
