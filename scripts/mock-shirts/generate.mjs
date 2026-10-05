// Regenerates the mock shirt catalog: one SVG per product+color under frontend/public/products/shirts/
// and seed.sql (replaces ALL products). Usage: node scripts/mock-shirts/generate.mjs
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const imgDir = path.join(root, 'frontend/public/products/shirts');

// Same hex values as COLOR_MAP in frontend/lib/product-display.ts, so the color swatch on the
// product page is exactly the color of the shirt in the image.
const COLORS = {
  Black: '#121212', White: '#f9fafb', Navy: '#1e293b', Charcoal: '#2d3134', Grey: '#6b7280',
  Olive: '#47553b', Sand: '#d7cdb9', Bone: '#eae6df', Sage: '#8a9a86', Terracotta: '#b85437',
  Cobalt: '#1e40af', Sky: '#7dd3fc', Butter: '#fef08a', Blush: '#fbcfe8', Coral: '#f43f5e',
  Evergreen: '#1b3b2b', Rust: '#a8462d', Ochre: '#d97706', Ocean: '#0284c7',
};

// ---------- color + geometry helpers ----------
const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v + (B[i] - v) * t)); };
const shade = (h, t) => mix(h, '#000000', t);
const tint = (h, t) => mix(h, '#ffffff', t);
const lum = (h) => { const [r, g, b] = hex2rgb(h).map((v) => v / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const isDark = (h) => lum(h) < 0.45;

const mirror = ([x, y]) => [600 - x, y];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const unit = (a) => { const l = Math.hypot(a[0], a[1]); return [a[0] / l, a[1] / l]; };
const pt = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
const poly = (pts) => `M${pts.map(pt).join(' L')} Z`;

// ---------- silhouettes (left half only; the right half is mirrored) ----------
// A node is a point on the outline; `c` is the quadratic control point of the segment arriving at it.
const N = (x, y, c) => ({ p: [x, y], c });
const GEOM = {
  tee: { kx: 1.32, ky: 0.88, nodes: [N(254, 140), N(172, 168), N(130, 256), N(168, 284), N(188, 256), N(188, 650, [194, 460])], hem: 660 },
  boxy: { kx: 1.14, ky: 0.86, nodes: [N(254, 142), N(156, 176), N(104, 284), N(146, 322), N(164, 310), N(160, 636, [166, 480])], hem: 648 },
  long: { kx: 1.28, ky: 0.88, nodes: [N(254, 140), N(172, 168), N(134, 556, [152, 372]), N(178, 570), N(188, 292, [174, 432]), N(190, 650, [196, 470])], hem: 660 },
  polo: { kx: 1.3, ky: 0.88, nodes: [N(254, 140), N(172, 170), N(128, 262), N(166, 290), N(188, 262), N(190, 650, [196, 460])], hem: 662 },
  shortShirt: { kx: 1.3, ky: 0.88, nodes: [N(256, 138), N(170, 170), N(122, 274), N(162, 308), N(190, 276), N(192, 640, [198, 460])], hem: 650 },
  longShirt: { kx: 1.28, ky: 0.88, nodes: [N(256, 138), N(168, 172), N(130, 556, [148, 370]), N(174, 572), N(190, 298, [170, 440]), N(190, 636, [196, 470])], hem: 690 },
  tank: { kx: 1.45, ky: 0.95, nodes: [N(268, 116), N(232, 116), N(198, 300, [254, 206]), N(202, 600, [208, 450])], hem: 610 },
  muscle: { kx: 1.4, ky: 0.95, nodes: [N(262, 120), N(222, 120), N(190, 330, [264, 236]), N(194, 600, [200, 470])], hem: 610 },
};

const NECKS = {
  crew: { depth: 30 }, boat: { depth: 9 }, mock: { depth: 30 }, henley: { depth: 30 }, collar: { depth: 26 },
  band: { depth: 24 }, scoop: { depth: 72 }, wide: { depth: 52 },
  v: { apex: 228 }, polo: { apex: 236 }, camp: { apex: 252 },
};

function neckPaths(NL, neckKey) {
  const NR = mirror(NL);
  const n = NECKS[neckKey];
  if (n.apex) {
    return {
      close: ` L300,${n.apex} L${pt(NL)}`,
      line: `M${pt(NR)} L300,${n.apex} L${pt(NL)}`,
      hole: `M${pt(NL)} L${pt(NR)} L300,${n.apex} Z`,
    };
  }
  const cy = NL[1] + 2 * n.depth;
  return {
    close: ` Q300,${cy} ${pt(NL)}`,
    line: `M${pt(NR)} Q300,${cy} ${pt(NL)}`,
    hole: `M${pt(NL)} L${pt(NR)} Q300,${cy} ${pt(NL)} Z`,
  };
}

function outline(g, neckKey) {
  const nodes = g.nodes;
  let d = `M${pt(nodes[0].p)}`;
  for (let i = 1; i < nodes.length; i++) {
    const n = nodes[i];
    d += n.c ? ` Q${pt(n.c)} ${pt(n.p)}` : ` L${pt(n.p)}`;
  }
  d += ` Q300,${g.hem} ${pt(mirror(nodes[nodes.length - 1].p))}`;
  for (let i = nodes.length - 1; i >= 1; i--) {
    const n = nodes[i];
    const t = mirror(nodes[i - 1].p);
    d += n.c ? ` Q${pt(mirror(n.c))} ${pt(t)}` : ` L${pt(t)}`;
  }
  return d + neckPaths(nodes[0].p, neckKey).close + ' Z';
}

// ---------- one shirt image ----------
function renderShirt(spec, colorName) {
  const base = COLORS[colorName];
  const dark = isDark(base);
  const g = GEOM[spec.base];
  const nodes = g.nodes;
  const hasSleeves = nodes.length >= 6;
  const NL = nodes[0].p;
  const [S, O, I, A] = hasSleeves ? [1, 2, 3, 4].map((i) => nodes[i].p) : [];
  const isLong = hasSleeves && O[1] > 400;
  const body = outline(g, spec.neck);
  const np = neckPaths(NL, spec.neck);

  const ink = dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)';
  const trim = dark ? '#f1eee6' : '#1e293b';
  const rib = spec.ringer ? trim : dark ? tint(base, 0.14) : shade(base, 0.12);
  const inner = shade(base, dark ? 0.6 : 0.4);
  const flap = dark ? tint(base, 0.1) : shade(base, 0.05);
  const btn = dark ? '#e8e3d6' : shade(base, 0.4);
  const both = (f) => f((p) => p) + f(mirror);
  // The garment is stretched (kx, ky) to get realistic body proportions; textures and round shapes undo that so they stay true.
  const patT = `scale(${(1 / g.kx).toFixed(4)} ${(1 / g.ky).toFixed(4)})`;
  const upright = (x, y, inner) => `<g transform="translate(${x} ${y}) scale(${(1 / g.kx).toFixed(4)} ${(1 / g.ky).toFixed(4)})">${inner}</g>`;
  const button = (x, y) => upright(x, y,
    `<circle r="4.6" fill="${btn}" stroke="rgba(0,0,0,0.38)" stroke-width="1"/>` +
    [[-1.4, -1.2], [1.4, -1.2], [-1.4, 1.2], [1.4, 1.2]].map(([dx, dy]) => `<circle cx="${dx}" cy="${dy}" r="0.85" fill="rgba(0,0,0,0.45)"/>`).join(""));
  const stitch = (d) => `<path d="${d}" fill="none" stroke="${ink}" stroke-width="1.3" stroke-dasharray="5 4"/>`;
  const line = (d, w = 1.4) => `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round"/>`;

  let defs = '', clipped = '', silhouette = '', details = '';

  // fabric patterns / color blocking (clipped to the shirt)
  if (spec.pattern === 'stripes') {
    const c = dark ? '#f3f0e8' : '#1e293b';
    defs += `<pattern id="pat" width="600" height="44" patternUnits="userSpaceOnUse" patternTransform="${patT}"><rect y="8" width="600" height="21" fill="${c}"/></pattern>`;
    clipped += `<rect width="600" height="800" fill="url(#pat)"/>`;
  } else if (spec.pattern === 'plaid') {
    const dk = shade(base, 0.55), lt = tint(base, 0.45);
    defs += `<pattern id="pat" width="76" height="76" patternUnits="userSpaceOnUse" patternTransform="${patT}"><rect width="76" height="76" fill="${base}"/>` +
      `<rect x="10" width="18" height="76" fill="${dk}" opacity="0.42"/><rect y="10" width="76" height="18" fill="${dk}" opacity="0.42"/>` +
      `<rect x="46" width="4" height="76" fill="${lt}" opacity="0.45"/><rect y="46" width="76" height="4" fill="${lt}" opacity="0.45"/></pattern>`;
    clipped += `<rect width="600" height="800" fill="url(#pat)"/>`;
  } else if (spec.pattern === 'waffle') {
    defs += `<pattern id="pat" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="${patT}"><rect width="10" height="10" fill="none" stroke="${dark ? '#fff' : '#000'}" stroke-opacity="0.11" stroke-width="2"/></pattern>`;
    clipped += `<rect width="600" height="800" fill="url(#pat)"/>`;
  } else if (spec.pattern === 'rib') {
    defs += `<pattern id="pat" width="8" height="10" patternUnits="userSpaceOnUse" patternTransform="${patT}"><rect width="2.6" height="10" fill="${dark ? '#fff' : '#000'}" opacity="0.11"/></pattern>`;
    clipped += `<rect width="600" height="800" fill="url(#pat)"/>`;
  } else if (spec.pattern === 'weave') {
    defs += `<pattern id="pat" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="${patT}"><path d="M0,1H4M1,0V4" stroke="${dark ? '#fff' : '#000'}" stroke-opacity="0.08" stroke-width="1"/></pattern>`;
    clipped += `<rect width="600" height="800" fill="url(#pat)"/>`;
  } else if (spec.pattern === 'slub') {
    defs += `<pattern id="pat" width="70" height="16" patternUnits="userSpaceOnUse" patternTransform="${patT}"><rect x="4" y="3" width="26" height="1.2" fill="${dark ? '#fff' : '#000'}" opacity="0.10"/><rect x="38" y="10" width="20" height="1.2" fill="${dark ? '#fff' : '#000'}" opacity="0.08"/></pattern>`;
    clipped += `<rect width="600" height="800" fill="url(#pat)"/>`;
  }
  if (spec.raglan) {
    const sleeveCol = dark ? '#eae6df' : '#2d3134';
    clipped += both((m) => `<path d="${poly([NL, S, O, I, A].map(m))}" fill="${sleeveCol}"/>`);
    details += both((m) => line(`M${pt(m(NL))} L${pt(m(A))}`, 1.6));
  }

  // sleeves: seams, hems, cuffs
  if (hasSleeves) {
    const dO = unit(sub(S, O)), dI = unit(sub(A, I));
    if (!spec.raglan) {
      details += both((m) => line(`M${pt(m(S))} Q${pt(m([S[0] + 8, (S[1] + A[1]) / 2]))} ${pt(m(A))}`));
    }
    const bandPoly = (w) => [O, I, add(I, mul(dI, w)), add(O, mul(dO, w))];
    if (isLong) {
      const shirt = spec.base === 'longShirt';
      const w = shirt ? 34 : 30;
      const cuffFill = shirt ? flap : rib;
      details += both((m) => `<path d="${poly(bandPoly(w).map(m))}" fill="${cuffFill}" stroke="${ink}" stroke-width="1.2"/>`);
      if (shirt) {
        const mid = add(mul(add(O, I), 0.5), mul(unit(add(dO, dI)), w * 0.5));
        details += both((m) => button(...m(mid)));
      }
    } else if (spec.ringer) {
      details += both((m) => `<path d="${poly(bandPoly(17).map(m))}" fill="${trim}"/>`);
    } else {
      const o2 = add(O, mul(dO, 13)), i2 = add(I, mul(dI, 13));
      details += both((m) => stitch(`M${pt(m(o2))} L${pt(m(i2))}`));
    }
  }

  // hem stitching
  const hl = nodes[nodes.length - 1].p;
  details += stitch(`M${hl[0] + 3},${hl[1] - 14} Q300,${g.hem - 14} ${600 - hl[0] - 3},${hl[1] - 14}`);

  // neckline
  const ribW = spec.neck === 'boat' ? 7 : 9;
  const ribbedNeck = ['crew', 'boat', 'v', 'henley', 'mock', 'scoop', 'wide'].includes(spec.neck);
  if (ribbedNeck) {
    details += `<path d="${np.hole}" fill="${inner}"/>`;
    details += `<path d="${np.line}" fill="none" stroke="${rib}" stroke-width="${ribW}" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  if (spec.neck === 'mock') {
    const band = `M${NL[0] - 2},152 L${NL[0] + 1},112 Q300,98 ${600 - NL[0] - 1},112 L${600 - NL[0] + 2},152 Q300,180 ${NL[0] - 2},152 Z`;
    silhouette += `<path d="${band}" fill="${rib}"/>`;
    details += `<path d="${band}" fill="${rib}" stroke="${ink}" stroke-width="1.2"/>` + line(`M${NL[0] + 1},128 Q300,146 ${600 - NL[0] - 1},128`);
  }
  if (spec.neck === 'henley') {
    details += `<rect x="288" y="168" width="24" height="104" rx="3" fill="${flap}" stroke="${ink}" stroke-width="1.2"/>` +
      button(300, 188) + button(300, 218) + button(300, 248);
  }
  if (spec.neck === 'polo' || spec.neck === 'camp') {
    const isPolo = spec.neck === 'polo';
    silhouette += `<path d="M238,128 Q300,100 362,128 L350,146 Q300,126 250,146 Z" fill="${inner}"/>`;
    details += `<path d="${np.hole}" fill="${inner}"/>`;
    if (isPolo) {
      details += `<rect x="288" y="170" width="24" height="172" rx="3" fill="${flap}" stroke="${ink}" stroke-width="1.2"/>` +
        button(300, 256) + button(300, 288) + button(300, 320);
      const f = [[242, 126], [206, 166], [284, 232], [302, 176]];
      details += both((m) => `<path d="${poly(f.map(m))}" fill="${flap}" stroke="${ink}" stroke-width="1.3" stroke-linejoin="round"/>`);
    } else {
      details += button(300, 282) + button(300, 320);
      const f = [[244, 122], [300, 168], [236, 250], [198, 224]];
      details += both((m) => `<path d="${poly(f.map(m))}" fill="${flap}" stroke="${ink}" stroke-width="1.3" stroke-linejoin="round"/>`);
    }
  }
  if (spec.neck === 'collar') {
    silhouette += `<path d="M240,128 Q300,104 360,128 L352,150 Q300,130 248,150 Z" fill="${inner}"/>`;
    details += `<path d="${np.hole}" fill="${inner}"/>`;
    details += `<rect x="289" y="150" width="22" height="490" fill="${flap}" opacity="0.55"/>` +
      stitch('M289,150 L289,640') + stitch('M311,150 L311,640');
    for (let y = 182; y <= 600; y += 58) details += button(300, y);
    const f = [[246, 124], [301, 150], [240, 206], [212, 190]];
    details += both((m) => `<path d="${poly(f.map(m))}" fill="${flap}" stroke="${ink}" stroke-width="1.3" stroke-linejoin="round"/>`);
  }
  if (spec.neck === 'band') {
    details += `<path d="${np.hole}" fill="${inner}"/>`;
    details += `<rect x="289" y="150" width="22" height="490" fill="${flap}" opacity="0.55"/>` +
      stitch('M289,150 L289,640') + stitch('M311,150 L311,640');
    for (let y = 196; y <= 600; y += 58) details += button(300, y);
    const band = 'M251,124 Q300,106 349,124 L347,158 Q300,146 253,158 Z';
    silhouette += `<path d="${band}" fill="${flap}"/>`;
    details += `<path d="${band}" fill="${flap}" stroke="${ink}" stroke-width="1.3"/>` + button(300, 146);
  }
  if (spec.neck === 'camp') {
    // buttons only below the open collar
    const start = 360;
    details += `<rect x="289" y="252" width="22" height="388" fill="${flap}" opacity="0.5"/>` + stitch('M289,252 L289,640') + stitch('M311,252 L311,640');
    for (let y = start; y <= 600; y += 58) details += button(300, y);
  }

  // pockets
  if (spec.pocket === 'chest') {
    details += `<path d="M338,238 L392,238 L392,294 Q365,304 338,294 Z" fill="${flap}" stroke="${ink}" stroke-width="1.3"/>` +
      stitch('M342,244 L388,244 L388,289 Q365,297 342,289 Z');
  } else if (spec.pocket === 'flaps') {
    for (const x of [214, 328]) {
      details += `<path d="M${x},262 L${x + 58},262 L${x + 58},322 L${x},322 Z" fill="${flap}" stroke="${ink}" stroke-width="1.3"/>` +
        `<path d="M${x},262 L${x + 58},262 L${x + 58},282 L${x + 29},292 L${x},282 Z" fill="${flap}" stroke="${ink}" stroke-width="1.3"/>` +
        button(x + 29, 280);
    }
  } else if (spec.pocket === 'shirt') {
    details += `<path d="M334,262 L392,262 L392,326 L334,326 Z" fill="${flap}" stroke="${ink}" stroke-width="1.3"/>` +
      stitch('M338,268 L388,268 L388,321 L338,321 Z');
  }

  // graphic print
  if (spec.graphic) {
    const c = dark ? '#f1eee6' : '#1d2430';
    let rays = '';
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI + (i * Math.PI) / 8;
      rays += `M${(300 + 58 * Math.cos(a)).toFixed(1)},${(352 + 58 * Math.sin(a)).toFixed(1)} L${(300 + 80 * Math.cos(a)).toFixed(1)},${(352 + 80 * Math.sin(a)).toFixed(1)} `;
    }
    details += upright(300, 350,
      `<g transform="translate(-300 -352)"><path d="M254,352 A46,46 0 0 1 346,352 Z" fill="#f59e0b"/>` +
      `<path d="${rays}" stroke="#f59e0b" stroke-width="5" stroke-linecap="round" fill="none"/>` +
      `<rect x="232" y="364" width="136" height="6" rx="3" fill="${c}"/><rect x="250" y="378" width="100" height="6" rx="3" fill="${c}"/>` +
      `<rect x="268" y="392" width="64" height="6" rx="3" fill="${c}"/></g>`);
  }

  const crease = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)';
  const glow = dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
<defs>
<radialGradient id="bg" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="#f6f5f2"/><stop offset="1" stop-color="#e6e4df"/></radialGradient>
<filter id="drop" x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="0" dy="14" stdDeviation="13" flood-color="#000" flood-opacity="0.2"/></filter>
<filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7"/></filter>
<linearGradient id="cloth" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.14"/><stop offset="0.28" stop-color="#000" stop-opacity="0"/><stop offset="0.62" stop-color="#fff" stop-opacity="0.07"/><stop offset="1" stop-color="#000" stop-opacity="0.18"/></linearGradient>
<clipPath id="shape"><path d="${body}"/></clipPath>
${defs}
</defs>
<rect width="600" height="800" fill="url(#bg)"/>
<g transform="matrix(${g.kx} 0 0 ${g.ky} ${(300 * (1 - g.kx)).toFixed(2)} 50)">
<g filter="url(#drop)"><path d="${body}" fill="${base}"/>${silhouette}</g>
<g clip-path="url(#shape)">${clipped}</g>
<path d="${body}" fill="url(#cloth)"/>
<g clip-path="url(#shape)" filter="url(#soft)">
<path d="M232,300 Q244,470 226,640" stroke="${crease}" stroke-width="16" fill="none" stroke-linecap="round"/>
<path d="M358,330 Q376,480 366,640" stroke="${crease}" stroke-width="20" fill="none" stroke-linecap="round"/>
<path d="M296,200 Q306,330 296,470" stroke="${glow}" stroke-width="34" fill="none" stroke-linecap="round"/>
<path d="M214,240 Q250,300 270,340" stroke="${crease}" stroke-width="10" fill="none" stroke-linecap="round"/>
</g>
${details}
<path d="${body}" fill="none" stroke="rgba(0,0,0,0.16)" stroke-width="1.6" stroke-linejoin="round"/>
</g>
</svg>
`;
}

// ---------- catalog ----------
const SIZES = { std: ['S', 'M', 'L', 'XL', 'XXL'], slim: ['XS', 'S', 'M', 'L', 'XL'], tank: ['S', 'M', 'L', 'XL'] };
const PRODUCTS = [
  { name: 'Classic Crew Tee', category: 'T-Shirts', price: 24.99, weight: 190, prefix: 'CCT', colors: ['White', 'Black', 'Navy', 'Sand'], sizes: 'std',
    desc: 'Our everyday tee in midweight combed cotton with a clean rib collar and a relaxed, true-to-size fit. Pre-shrunk, so it stays the size you bought.',
    style: { base: 'tee', neck: 'crew' } },
  { name: 'V-Neck Tee', category: 'T-Shirts', price: 26.99, weight: 185, prefix: 'VNT', colors: ['Charcoal', 'White', 'Sage'], sizes: 'std',
    desc: 'Soft cotton-modal jersey with a V neckline that sits neatly under a jacket or on its own. Light, smooth and easy to layer.',
    style: { base: 'tee', neck: 'v' } },
  { name: 'Pocket Tee', category: 'T-Shirts', price: 28.99, weight: 205, prefix: 'PKT', colors: ['Bone', 'Olive', 'Terracotta'], sizes: 'std',
    desc: 'Heavyweight cotton jersey with a single chest pocket. Garment-washed for a lived-in feel from the first wear.',
    style: { base: 'tee', neck: 'crew', pocket: 'chest' } },
  { name: 'Oversized Boxy Tee', category: 'T-Shirts', price: 34.99, weight: 240, prefix: 'OBT', colors: ['Black', 'Bone', 'Cobalt', 'Coral'], sizes: 'slim',
    desc: 'Dropped shoulders and a boxy, slightly cropped body in heavyweight 240gsm cotton. Sized to sit loose, so take your usual size for the intended fit.',
    style: { base: 'boxy', neck: 'crew' } },
  { name: 'Ringer Tee', category: 'T-Shirts', price: 29.99, weight: 195, prefix: 'RNG', colors: ['Bone', 'Sky', 'Butter'], sizes: 'std',
    desc: 'A retro ringer with contrast trim on the collar and sleeve hems. Slim through the body in soft ring-spun cotton.',
    style: { base: 'tee', neck: 'crew', ringer: true } },
  { name: 'Raglan Baseball Tee', category: 'T-Shirts', price: 32.99, weight: 200, prefix: 'RGL', colors: ['Bone', 'Grey', 'Olive'], sizes: 'std',
    desc: 'Contrast raglan sleeves in a soft cotton-blend jersey. Comfortable through the shoulders with an easy, athletic drape.',
    style: { base: 'tee', neck: 'crew', raglan: true } },
  { name: 'Breton Stripe Tee', category: 'T-Shirts', price: 38.99, weight: 210, prefix: 'BRT', colors: ['Navy', 'Black', 'Terracotta'], sizes: 'slim',
    desc: 'The classic Breton stripe with a wide boat neck, knitted in a substantial cotton jersey that keeps its shape wash after wash.',
    style: { base: 'tee', neck: 'boat', pattern: 'stripes' } },
  { name: 'Sunrise Graphic Tee', category: 'T-Shirts', price: 34.99, weight: 200, prefix: 'SGT', colors: ['Bone', 'Black', 'Butter', 'Ocean'], sizes: 'std',
    desc: 'Midweight cotton tee with a screen-printed sunrise on the chest. Water-based inks for a soft hand you barely feel.',
    style: { base: 'tee', neck: 'crew', graphic: true } },
  { name: 'Long Sleeve Tee', category: 'Long Sleeves', price: 32.99, weight: 260, prefix: 'LST', colors: ['Black', 'Charcoal', 'Sage', 'Blush'], sizes: 'std',
    desc: 'A dependable long sleeve in soft combed cotton with ribbed cuffs that stay put. Wear it alone or under a shirt.',
    style: { base: 'long', neck: 'crew' } },
  { name: 'Waffle Henley', category: 'Long Sleeves', price: 44.99, weight: 310, prefix: 'WFH', colors: ['Bone', 'Olive', 'Rust'], sizes: 'std',
    desc: 'Textured waffle-knit cotton with a three-button placket. Warm without being bulky, and just as good as a base layer.',
    style: { base: 'long', neck: 'henley', pattern: 'waffle' } },
  { name: 'Mock Neck Long Sleeve', category: 'Long Sleeves', price: 36.99, weight: 270, prefix: 'MNL', colors: ['Black', 'Sand', 'Evergreen'], sizes: 'slim',
    desc: 'A fitted long sleeve with a soft, folded mock neck. Stretch cotton jersey that moves with you.',
    style: { base: 'long', neck: 'mock' } },
  { name: 'Classic Polo', category: 'Polos', price: 42.99, weight: 250, prefix: 'POL', colors: ['Navy', 'White', 'Evergreen', 'Charcoal'], sizes: 'std',
    desc: 'A textured piqué polo with a two-button placket and ribbed sleeve cuffs. Smart enough for the office, easy enough for the weekend.',
    style: { base: 'polo', neck: 'polo' } },
  { name: 'Johnny Collar Polo', category: 'Polos', price: 48.99, weight: 240, prefix: 'JCP', colors: ['Sand', 'Black', 'Sky'], sizes: 'std',
    desc: 'A knit polo with a soft, open johnny collar and a short button placket. Lightweight and breathable for warm days.',
    style: { base: 'polo', neck: 'camp' } },
  { name: 'Oxford Button-Down', category: 'Shirts', price: 64.99, weight: 330, prefix: 'OXF', colors: ['White', 'Sky', 'Blush'], sizes: 'slim',
    desc: 'A wardrobe staple in a crisp cotton oxford weave, with a button-down collar, a chest pocket and a curved shirt-tail hem.',
    style: { base: 'longShirt', neck: 'collar', pocket: 'shirt', pattern: 'weave' } },
  { name: 'Flannel Plaid Shirt', category: 'Shirts', price: 58.99, weight: 430, prefix: 'FLN', colors: ['Rust', 'Evergreen', 'Navy'], sizes: 'std',
    desc: 'Brushed cotton flannel in a bold plaid, cut generously so it layers over a tee. Soft from the first wear and warmer than it looks.',
    style: { base: 'longShirt', neck: 'collar', pocket: 'shirt', pattern: 'plaid' } },
  { name: 'Camp Collar Shirt', category: 'Shirts', price: 52.99, weight: 290, prefix: 'CMP', colors: ['Sage', 'Butter', 'Terracotta', 'Black'], sizes: 'std',
    desc: 'A relaxed short-sleeve shirt with an open camp collar and a straight hem. Drapey viscose blend that feels cool against the skin.',
    style: { base: 'shortShirt', neck: 'camp' } },
  { name: 'Linen Short Sleeve Shirt', category: 'Shirts', price: 56.99, weight: 260, prefix: 'LSS', colors: ['Bone', 'Sky', 'Sage'], sizes: 'std',
    desc: 'Breathable European linen with a grandad collar and a straight, easy fit. Gets softer and better-looking with every wash.',
    style: { base: 'shortShirt', neck: 'band', pattern: 'slub' } },
  { name: 'Chambray Work Shirt', category: 'Shirts', price: 68.99, weight: 380, prefix: 'CHM', colors: ['Sky', 'Cobalt', 'Charcoal'], sizes: 'std',
    desc: 'A sturdy cotton chambray work shirt with two flap pockets and a full button front. Built to be worn hard and washed often.',
    style: { base: 'longShirt', neck: 'collar', pocket: 'flaps', pattern: 'weave' } },
  { name: 'Ribbed Tank', category: 'Tanks', price: 19.99, weight: 120, prefix: 'RBT', colors: ['White', 'Black', 'Coral', 'Sand'], sizes: 'tank',
    desc: 'A stretchy ribbed tank with a scooped neck that hugs without squeezing. Layers well or wears on its own.',
    style: { base: 'tank', neck: 'scoop', pattern: 'rib' } },
  { name: 'Muscle Tee', category: 'Tanks', price: 22.99, weight: 150, prefix: 'MSC', colors: ['Charcoal', 'Ochre', 'Ocean'], sizes: 'tank',
    desc: 'A sleeveless cut with deep armholes and a soft cotton hand. Made for heat, the gym, or the beach.',
    style: { base: 'muscle', neck: 'wide' } },
];

const CATEGORIES = [
  ['T-Shirts', 't-shirts'], ['Long Sleeves', 'long-sleeves'], ['Polos', 'polos'], ['Shirts', 'shirts'], ['Tanks', 'tanks'],
];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

// deterministic stock so re-running gives the same catalog: mostly healthy, a few low, a couple sold out
function stockFor(sku) {
  let h = 2166136261;
  for (const ch of sku) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const r = h % 100;
  if (r < 4) return 0;
  if (r < 12) return 1 + (h >>> 8) % 4;
  return [12, 18, 24, 30, 40][(h >>> 8) % 5];
}

fs.rmSync(imgDir, { recursive: true, force: true });
fs.mkdirSync(imgDir, { recursive: true });

let sql = `-- Generated by scripts/mock-shirts/generate.mjs. REPLACES ALL PRODUCTS, CATEGORIES AND THE HOMEPAGE LAYOUT with a 20-shirt mock catalog.
-- Existing orders are kept (order items keep their own name/price snapshots; the link to the variant is set NULL).
BEGIN;
DELETE FROM home_section;
DELETE FROM product;
DELETE FROM category;
`;
for (const [name, slug] of CATEGORIES) sql += `INSERT INTO category (name, slug) VALUES (${q(name)}, ${q(slug)});\n`;

let images = 0, variants = 0;
for (const p of PRODUCTS) {
  const slug = slugify(p.name);
  const id = randomUUID();
  const catSlug = CATEGORIES.find(([n]) => n === p.category)[1];
  sql += `\nINSERT INTO product (id, category_id, name, price, slug, description, status, weight_grams) VALUES (${q(id)}, (SELECT id FROM category WHERE slug = ${q(catSlug)}), ${q(p.name)}, ${p.price}, ${q(slug)}, ${q(p.desc)}, 'ACTIVE', ${p.weight});\n`;
  p.colors.forEach((color, ci) => {
    const file = `${slug}-${slugify(color)}.svg`;
    fs.writeFileSync(path.join(imgDir, file), renderShirt(p.style, color));
    sql += `INSERT INTO product_image (product_id, color_group, url, sort_order) VALUES (${q(id)}, ${q(color)}, ${q('/products/shirts/' + file)}, ${ci});\n`;
    images++;
    for (const size of SIZES[p.sizes]) {
      const sku = `${p.prefix}-${color.slice(0, 3).toUpperCase()}-${size}`;
      sql += `INSERT INTO product_variant (product_id, sku, size, color, stock_qty, low_stock_threshold) VALUES (${q(id)}, ${q(sku)}, ${q(size)}, ${q(color)}, ${stockFor(sku)}, 5);\n`;
      variants++;
    }
  });
}
// sample homepage: hero, product rows, a split banner, a second hero, more rows (the admin edits all of this)
const BLOCKS = [
  { type: 'HERO', title: 'Fresh shirts\nfor every day', description: '20 new styles in every color', image: '/banner2.jpg', buttonText: 'Shop the collection', buttonLink: '/products' },
  { type: 'PRODUCTS', title: 'New Arrivals', slugs: ['sunrise-graphic-tee', 'oxford-button-down', 'camp-collar-shirt', 'waffle-henley', 'breton-stripe-tee', 'classic-polo', 'linen-short-sleeve-shirt', 'oversized-boxy-tee'] },
  { type: 'PRODUCTS', title: 'Everyday Essentials', slugs: ['classic-crew-tee', 'ribbed-tank', 'v-neck-tee', 'long-sleeve-tee', 'pocket-tee', 'muscle-tee'] },
  { type: 'SPLIT_BANNER', panels: [
    { image: '/banner1.jpg', title: 'The Shirt Edit', description: 'Button-ups, camp collars and linen for warm days.' },
    { image: '/hero-rains.jpg', title: 'Tees & Tanks', description: 'Soft cotton basics in every color.' } ] },
  { type: 'PRODUCTS', title: 'Shirts We Love', slugs: ['oxford-button-down', 'flannel-plaid-shirt', 'camp-collar-shirt', 'linen-short-sleeve-shirt', 'chambray-work-shirt'] },
  { type: 'HERO', title: 'Made to be worn\nevery day', description: 'Soft fabrics, honest prices and colors you will reach for again.', image: '/hero-rains-tall.jpg', buttonText: 'Shop the collection', buttonLink: '/products' },
  { type: 'PRODUCTS', title: 'Polos & Long Sleeves', slugs: ['classic-polo', 'johnny-collar-polo', 'long-sleeve-tee', 'waffle-henley', 'mock-neck-long-sleeve'] },
];
const known = new Set(PRODUCTS.map((p) => slugify(p.name)));
BLOCKS.forEach((block, i) => {
  const id = randomUUID();
  if (block.type === 'HERO') {
    sql += `\nINSERT INTO home_section (id, type, title, description, image_url, button_text, button_link, sort_order, active) VALUES (${q(id)}, 'HERO', ${q(block.title)}, ${q(block.description)}, ${q(block.image)}, ${q(block.buttonText)}, ${q(block.buttonLink)}, ${i}, TRUE);\n`;
  } else if (block.type === 'SPLIT_BANNER') {
    const [left, right] = block.panels;
    sql += `\nINSERT INTO home_section (id, type, title, description, image_url, right_title, right_description, right_image_url, sort_order, active) VALUES (${q(id)}, 'SPLIT_BANNER', ${q(left.title)}, ${q(left.description)}, ${q(left.image)}, ${q(right.title)}, ${q(right.description)}, ${q(right.image)}, ${i}, TRUE);\n`;
  } else {
    sql += `\nINSERT INTO home_section (id, type, title, sort_order, active) VALUES (${q(id)}, 'PRODUCTS', ${q(block.title)}, ${i}, TRUE);\n`;
    block.slugs.forEach((slug, n) => {
      if (!known.has(slug)) throw new Error(`Section "${block.title}" references unknown product ${slug}`);
      sql += `INSERT INTO home_section_product (section_id, product_id, sort_order) SELECT ${q(id)}, id, ${n} FROM product WHERE slug = ${q(slug)};\n`;
    });
  }
});
sql += '\nCOMMIT;\n';
fs.writeFileSync(path.join(here, 'seed.sql'), sql);
console.log(`${PRODUCTS.length} products, ${variants} variants, ${images} images -> ${path.relative(root, imgDir)}, seed.sql`);
