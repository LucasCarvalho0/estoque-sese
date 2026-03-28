/**
 * Run once: node scripts/generate-icons.js
 * Generates app icons as SVG (browsers support SVG icons natively)
 */
const fs = require('fs');
const path = require('path');

const iconDir = path.join(__dirname, '..', 'public', 'icons');

const svgIcon = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#0f172a"/>
  <rect x="${size*0.1}" y="${size*0.1}" width="${size*0.8}" height="${size*0.8}" rx="${size*0.15}" fill="#1e293b"/>
  <g transform="translate(${size*0.5},${size*0.42}) scale(${size/512})">
    <path d="M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l43.3 43.3c4.7 4.7 4.7 12.3 0 17L142 79.5c-4.7 4.7-12.3 4.7-17 0L81.7 36.2C76.4 55.6 86.3 75.9 105 83.6l-85.6 85.6c-9.4 9.4-9.4 24.6 0 33.9l17 17c9.4 9.4 24.6 9.4 33.9 0l85.6-85.6c18.7 7.7 39 1.8 46.6-17.5z"
      transform="translate(-100,-100)" fill="#f59e0b"/>
  </g>
  <text x="${size*0.5}" y="${size*0.85}" font-family="Arial,sans-serif" font-size="${size*0.18}" font-weight="800" text-anchor="middle" fill="#f59e0b">Sesé</text>
</svg>`;

fs.writeFileSync(path.join(iconDir, 'icon-192.svg'), svgIcon(192));
fs.writeFileSync(path.join(iconDir, 'icon-512.svg'), svgIcon(512));
console.log('SVG icons generated!');
