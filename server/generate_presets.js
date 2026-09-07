import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const presets = [
  {
    name: 'avatar-1.svg',
    title: '粉萌小猫',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF9A9E"/>
      <stop offset="100%" stop-color="#FECFEF"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="36" fill="url(#bg1)"/>
  <!-- Ears -->
  <polygon points="32,54 24,24 50,38" fill="#FFFFFF"/>
  <polygon points="34,50 28,30 46,40" fill="#FF8BA7"/>
  <polygon points="88,54 96,24 70,38" fill="#FFFFFF"/>
  <polygon points="86,50 92,30 74,40" fill="#FF8BA7"/>
  <!-- Head -->
  <circle cx="60" cy="66" r="34" fill="#FFFFFF"/>
  <!-- Eyes -->
  <ellipse cx="48" cy="62" rx="4" ry="5.5" fill="#33272A"/>
  <circle cx="49.5" cy="60" r="1.5" fill="#FFFFFF"/>
  <ellipse cx="72" cy="62" rx="4" ry="5.5" fill="#33272A"/>
  <circle cx="73.5" cy="60" r="1.5" fill="#FFFFFF"/>
  <!-- Nose & Mouth -->
  <polygon points="60,68 57,71 63,71" fill="#FF8BA7"/>
  <path d="M55,73 Q60,76 60,73 Q60,76 65,73" fill="none" stroke="#33272A" stroke-width="2" stroke-linecap="round"/>
  <!-- Blush -->
  <circle cx="41" cy="70" r="5" fill="#FFAAA6" opacity="0.6"/>
  <circle cx="79" cy="70" r="5" fill="#FFAAA6" opacity="0.6"/>
  <!-- Whiskers -->
  <line x1="28" y1="67" x2="38" y2="68" stroke="#FF8BA7" stroke-width="2" stroke-linecap="round"/>
  <line x1="29" y1="73" x2="38" y2="72" stroke="#FF8BA7" stroke-width="2" stroke-linecap="round"/>
  <line x1="82" y1="68" x2="92" y2="67" stroke="#FF8BA7" stroke-width="2" stroke-linecap="round"/>
  <line x1="82" y1="72" x2="91" y2="73" stroke="#FF8BA7" stroke-width="2" stroke-linecap="round"/>
</svg>`
  },
  {
    name: 'avatar-2.svg',
    title: '暖心柴犬',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFD166"/>
      <stop offset="100%" stop-color="#FFF3B0"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="36" fill="url(#bg2)"/>
  <!-- Ears -->
  <polygon points="34,50 26,20 54,34" fill="#E08736"/>
  <polygon points="36,46 30,26 50,36" fill="#F8EDEB"/>
  <polygon points="86,50 94,20 66,34" fill="#E08736"/>
  <polygon points="84,46 90,26 70,36" fill="#F8EDEB"/>
  <!-- Head -->
  <circle cx="60" cy="65" r="34" fill="#F4A261"/>
  <!-- Cheeks White Area -->
  <ellipse cx="60" cy="73" rx="26" ry="19" fill="#FFFDF9"/>
  <!-- Eyebrow dots -->
  <circle cx="49" cy="50" r="3" fill="#FFFDF9"/>
  <circle cx="71" cy="50" r="3" fill="#FFFDF9"/>
  <!-- Eyes -->
  <ellipse cx="48" cy="61" rx="3.8" ry="4.8" fill="#264653"/>
  <circle cx="49.5" cy="59.5" r="1.5" fill="#FFFFFF"/>
  <ellipse cx="72" cy="61" rx="3.8" ry="4.8" fill="#264653"/>
  <circle cx="73.5" cy="59.5" r="1.5" fill="#FFFFFF"/>
  <!-- Nose & Mouth -->
  <ellipse cx="60" cy="68" rx="4" ry="3" fill="#264653"/>
  <path d="M56,72 Q60,75 60,72 Q60,75 64,72" fill="none" stroke="#264653" stroke-width="2" stroke-linecap="round"/>
  <!-- Tongue -->
  <path d="M58,74 Q60,80 62,74" fill="#E76F51"/>
  <!-- Blush -->
  <circle cx="40" cy="68" r="4.5" fill="#F4A261" opacity="0.5"/>
  <circle cx="80" cy="68" r="4.5" fill="#F4A261" opacity="0.5"/>
</svg>`
  },
  {
    name: 'avatar-3.svg',
    title: '憨态熊猫',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4EBA8E"/>
      <stop offset="100%" stop-color="#9DE7C8"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="36" fill="url(#bg3)"/>
  <!-- Ears -->
  <circle cx="34" cy="36" r="12" fill="#2B2D42"/>
  <circle cx="86" cy="36" r="12" fill="#2B2D42"/>
  <!-- Head -->
  <circle cx="60" cy="66" r="34" fill="#FFFFFF"/>
  <!-- Eye Patches -->
  <ellipse cx="46" cy="62" rx="9" ry="11" transform="rotate(-15, 46, 62)" fill="#2B2D42"/>
  <ellipse cx="74" cy="62" rx="9" ry="11" transform="rotate(15, 74, 62)" fill="#2B2D42"/>
  <!-- Eyes -->
  <circle cx="47" cy="61" r="3.5" fill="#FFFFFF"/>
  <circle cx="47.5" cy="60.5" r="1.5" fill="#2B2D42"/>
  <circle cx="73" cy="61" r="3.5" fill="#FFFFFF"/>
  <circle cx="72.5" cy="60.5" r="1.5" fill="#2B2D42"/>
  <!-- Nose & Mouth -->
  <ellipse cx="60" cy="71" rx="4.5" ry="3.2" fill="#2B2D42"/>
  <path d="M56,76 Q60,78.5 60,76 Q60,78.5 64,76" fill="none" stroke="#2B2D42" stroke-width="2" stroke-linecap="round"/>
  <!-- Blush -->
  <circle cx="38" cy="72" r="5" fill="#FF8BA7" opacity="0.65"/>
  <circle cx="82" cy="72" r="5" fill="#FF8BA7" opacity="0.65"/>
</svg>`
  },
  {
    name: 'avatar-4.svg',
    title: '聪慧小狐',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="bg4" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF7E5F"/>
      <stop offset="100%" stop-color="#FEB47B"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="36" fill="url(#bg4)"/>
  <!-- Ears -->
  <polygon points="32,52 18,16 54,34" fill="#E65100"/>
  <polygon points="34,48 24,24 50,36" fill="#3E2723"/>
  <polygon points="88,52 102,16 66,34" fill="#E65100"/>
  <polygon points="86,48 96,24 70,36" fill="#3E2723"/>
  <!-- Head -->
  <polygon points="60,94 28,52 92,52" fill="#FF6D00"/>
  <circle cx="46" cy="54" r="18" fill="#FF6D00"/>
  <circle cx="74" cy="54" r="18" fill="#FF6D00"/>
  <!-- White Cheeks -->
  <path d="M60,90 L32,56 C34,74 48,86 60,90 Z" fill="#FFFDF9"/>
  <path d="M60,90 L88,56 C86,74 72,86 60,90 Z" fill="#FFFDF9"/>
  <!-- Eyes -->
  <ellipse cx="46" cy="58" rx="4" ry="4.8" fill="#2E1C12"/>
  <circle cx="47.5" cy="56.5" r="1.5" fill="#FFFFFF"/>
  <ellipse cx="74" cy="58" rx="4" ry="4.8" fill="#2E1C12"/>
  <circle cx="75.5" cy="56.5" r="1.5" fill="#FFFFFF"/>
  <!-- Nose -->
  <circle cx="60" cy="90" r="3.5" fill="#2E1C12"/>
</svg>`
  },
  {
    name: 'avatar-5.svg',
    title: '乖巧小白兔',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="bg5" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#B388FF"/>
      <stop offset="100%" stop-color="#E1BEE7"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="36" fill="url(#bg5)"/>
  <!-- Long Ears -->
  <ellipse cx="44" cy="34" rx="8" ry="24" transform="rotate(-8, 44, 34)" fill="#FFFFFF"/>
  <ellipse cx="44" cy="34" rx="4.5" ry="17" transform="rotate(-8, 44, 34)" fill="#FF80AB"/>
  <ellipse cx="76" cy="34" rx="8" ry="24" transform="rotate(8, 76, 34)" fill="#FFFFFF"/>
  <ellipse cx="76" cy="34" rx="4.5" ry="17" transform="rotate(8, 76, 34)" fill="#FF80AB"/>
  <!-- Head -->
  <circle cx="60" cy="72" r="32" fill="#FFFFFF"/>
  <!-- Eyes -->
  <ellipse cx="48" cy="68" rx="4" ry="5.5" fill="#4A148C"/>
  <circle cx="49.5" cy="66" r="1.5" fill="#FFFFFF"/>
  <ellipse cx="72" cy="68" rx="4" ry="5.5" fill="#4A148C"/>
  <circle cx="73.5" cy="66" r="1.5" fill="#FFFFFF"/>
  <!-- Nose & Mouth -->
  <polygon points="60,74 57.5,77 62.5,77" fill="#FF4081"/>
  <path d="M56,79 Q60,82 60,79 Q60,82 64,79" fill="none" stroke="#4A148C" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Blush -->
  <circle cx="40" cy="76" r="5" fill="#FF80AB" opacity="0.6"/>
  <circle cx="80" cy="76" r="5" fill="#FF80AB" opacity="0.6"/>
</svg>`
  },
  {
    name: 'avatar-6.svg',
    title: '悠闲考拉',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="bg6" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#48CAE4"/>
      <stop offset="100%" stop-color="#ADE8F4"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="36" fill="url(#bg6)"/>
  <!-- Big Fluffy Ears -->
  <circle cx="30" cy="48" r="16" fill="#8D99AE"/>
  <circle cx="30" cy="48" r="9" fill="#EDF2F4"/>
  <circle cx="90" cy="48" r="16" fill="#8D99AE"/>
  <circle cx="90" cy="48" r="9" fill="#EDF2F4"/>
  <!-- Head -->
  <ellipse cx="60" cy="68" rx="34" ry="30" fill="#8D99AE"/>
  <!-- Cheeks -->
  <ellipse cx="44" cy="76" rx="6" ry="4" fill="#EDF2F4" opacity="0.8"/>
  <ellipse cx="76" cy="76" rx="6" ry="4" fill="#EDF2F4" opacity="0.8"/>
  <!-- Eyes -->
  <circle cx="46" cy="63" r="4" fill="#2B2D42"/>
  <circle cx="47.5" cy="61.5" r="1.5" fill="#FFFFFF"/>
  <circle cx="74" cy="63" r="4" fill="#2B2D42"/>
  <circle cx="75.5" cy="61.5" r="1.5" fill="#FFFFFF"/>
  <!-- Big Koala Nose -->
  <ellipse cx="60" cy="71" rx="9" ry="13" fill="#2B2D42"/>
  <ellipse cx="58" cy="67" rx="3" ry="4" fill="#454955" opacity="0.6"/>
  <!-- Blush -->
  <circle cx="36" cy="73" r="4.5" fill="#FF8BA7" opacity="0.5"/>
  <circle cx="84" cy="73" r="4.5" fill="#FF8BA7" opacity="0.5"/>
</svg>`
  },
  {
    name: 'avatar-7.svg',
    title: '活力小狮',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="bg7" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFB703"/>
      <stop offset="100%" stop-color="#FFE6A7"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="36" fill="url(#bg7)"/>
  <!-- Lion Mane -->
  <circle cx="60" cy="65" r="39" fill="#FB8500"/>
  <!-- Ears -->
  <circle cx="36" cy="38" r="8" fill="#FFD166"/>
  <circle cx="36" cy="38" r="4" fill="#FB8500"/>
  <circle cx="84" cy="38" r="8" fill="#FFD166"/>
  <circle cx="84" cy="38" r="4" fill="#FB8500"/>
  <!-- Face -->
  <circle cx="60" cy="66" r="28" fill="#FFD166"/>
  <!-- Eyes -->
  <ellipse cx="49" cy="62" rx="3.8" ry="4.8" fill="#023047"/>
  <circle cx="50.5" cy="60.5" r="1.5" fill="#FFFFFF"/>
  <ellipse cx="71" cy="62" rx="3.8" ry="4.8" fill="#023047"/>
  <circle cx="72.5" cy="60.5" r="1.5" fill="#FFFFFF"/>
  <!-- Nose & Mouth -->
  <polygon points="60,69 56.5,73 63.5,73" fill="#FB8500"/>
  <path d="M55,75 Q60,78 60,75 Q60,78 65,75" fill="none" stroke="#023047" stroke-width="2" stroke-linecap="round"/>
  <!-- Blush -->
  <circle cx="42" cy="72" r="4.5" fill="#FB8500" opacity="0.4"/>
  <circle cx="78" cy="72" r="4.5" fill="#FB8500" opacity="0.4"/>
</svg>`
  },
  {
    name: 'avatar-8.svg',
    title: '暖心棕熊',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="bg8" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A98467"/>
      <stop offset="100%" stop-color="#DDC9B4"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="36" fill="url(#bg8)"/>
  <!-- Ears -->
  <circle cx="34" cy="40" r="11" fill="#6C584C"/>
  <circle cx="34" cy="40" r="6" fill="#DDC9B4"/>
  <circle cx="86" cy="40" r="11" fill="#6C584C"/>
  <circle cx="86" cy="40" r="6" fill="#DDC9B4"/>
  <!-- Head -->
  <circle cx="60" cy="66" r="33" fill="#6C584C"/>
  <!-- Snout -->
  <ellipse cx="60" cy="72" rx="16" ry="12" fill="#DDC9B4"/>
  <!-- Eyes -->
  <circle cx="47" cy="60" r="3.5" fill="#281A12"/>
  <circle cx="48" cy="59" r="1.2" fill="#FFFFFF"/>
  <circle cx="73" cy="60" r="3.5" fill="#281A12"/>
  <circle cx="74" cy="59" r="1.2" fill="#FFFFFF"/>
  <!-- Nose & Mouth -->
  <ellipse cx="60" cy="69" rx="5" ry="3.5" fill="#281A12"/>
  <path d="M57,74 Q60,76.5 60,74 Q60,76.5 63,74" fill="none" stroke="#281A12" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Blush -->
  <circle cx="39" cy="69" r="4.5" fill="#FF8BA7" opacity="0.45"/>
  <circle cx="81" cy="69" r="4.5" fill="#FF8BA7" opacity="0.45"/>
</svg>`
  }
];

const targetDirs = [
  path.join(__dirname, 'uploads', 'avatars', 'presets'),
  path.join(__dirname, '..', 'public', 'avatars', 'presets')
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

for (const preset of presets) {
  for (const dir of targetDirs) {
    const filePath = path.join(dir, preset.name);
    fs.writeFileSync(filePath, preset.svg.trim(), 'utf8');
  }
}

console.log(`[Presets] Successfully generated ${presets.length} cute preset avatars into directories.`);
