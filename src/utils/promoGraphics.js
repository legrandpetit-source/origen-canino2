// Utilidades gráficas Canvas 2D de alta resolución para Origen Canino:
// 1) Tarjeta Vertical Story (1080x1920 PNG) para Cupones Promocionales (4 temas)
// 2) Código QR descargable en alta resolución (800x800 PNG)
// 3) Lámina Imprimible 10x15 cm a 300 DPI (1200x1800 px) para Canon SELPHY CP1500
//    con círculo guía NFC exacto de 25 mm (300 px) en la esquina superior derecha.

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const drawRoundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const drawWrappedCenteredText = (ctx, text, cx, startY, maxWidth, lineHeight, maxLines = 3) => {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
      if (lines.length >= maxLines) break;
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  lines.forEach((ln, idx) => ctx.fillText(ln, cx, startY + idx * lineHeight));
  return startY + lines.length * lineHeight;
};

const svgElementToImage = async (svgEl) => {
  if (!svgEl) return null;
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgEl);
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const STORY_THEMES = {
  olive: {
    label: 'Oliva Origen',
    bgStops: ['#FAF7F2', '#F2ECE1', '#EBF2DA'],
    topBar: '#556B2F',
    badgeBg: '#556B2F',
    badgeText: '#FFFFFF',
    titleColor: '#3D2B1F',
    accentColor: '#556B2F',
    subColor: '#5C4B3E',
    cardBg: '#FFFFFF',
    cardBorder: '#E5DACD',
    codeBg: '#FAF7F2',
    codeText: '#3D2B1F',
    footerBg: '#2F3E1E',
    footerText: '#FFFFFF',
    footerSub: '#D9E8B8'
  },
  honey: {
    label: 'Naranjo Miel',
    bgStops: ['#FFFBF5', '#FDF2E2', '#F8E3C4'],
    topBar: '#DB994B',
    badgeBg: '#DB994B',
    badgeText: '#FFFFFF',
    titleColor: '#3D2B1F',
    accentColor: '#C57E2C',
    subColor: '#5C4B3E',
    cardBg: '#FFFFFF',
    cardBorder: '#F0D5B0',
    codeBg: '#FFF8EE',
    codeText: '#3D2B1F',
    footerBg: '#4A3728',
    footerText: '#FFFFFF',
    footerSub: '#F7D7A8'
  },
  christmas: {
    label: 'Especial Navidad',
    bgStops: ['#FFFDF9', '#F9F3EA', '#E9F1E4'],
    topBar: '#9B1C1C',
    badgeBg: '#9B1C1C',
    badgeText: '#FFFFFF',
    titleColor: '#1E3A1E',
    accentColor: '#9B1C1C',
    subColor: '#4A4A42',
    cardBg: '#FFFFFF',
    cardBorder: '#E4D5C7',
    codeBg: '#FEF2F2',
    codeText: '#9B1C1C',
    footerBg: '#1E3A1E',
    footerText: '#FFFFFF',
    footerSub: '#FDE68A'
  },
  vip: {
    label: 'VIP Oscuro & Dorado',
    bgStops: ['#1C1917', '#292524', '#1C1917'],
    topBar: '#D9A441',
    badgeBg: '#D9A441',
    badgeText: '#1C1917',
    titleColor: '#FAF7F2',
    accentColor: '#F2C56B',
    subColor: '#D6D3D1',
    cardBg: '#FFFFFF',
    cardBorder: '#D9A441',
    codeBg: '#1C1917',
    codeText: '#F2C56B',
    footerBg: '#D9A441',
    footerText: '#1C1917',
    footerSub: '#292524'
  }
};

export const generateQrPngDataUrl = async (qrSvgElement, labelText = '') => {
  const W = 800;
  const H = labelText ? 900 : 800;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  const qrImg = await svgElementToImage(qrSvgElement);
  if (qrImg) {
    ctx.drawImage(qrImg, 70, 70, 660, 660);
  }
  if (labelText) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3D2B1F';
    ctx.font = '800 38px "Outfit", sans-serif';
    ctx.fillText(labelText, W / 2, 825);
  }
  return canvas.toDataURL('image/png');
};

export const generateCouponStoryDataUrl = async (coupon, qrSvgElement, themeKeyOverride = null) => {
  const theme = STORY_THEMES[themeKeyOverride || coupon.story_theme || 'olive'] || STORY_THEMES.olive;
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, theme.bgStops[0]);
  bgGrad.addColorStop(0.55, theme.bgStops[1]);
  bgGrad.addColorStop(1, theme.bgStops[2]);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = theme.topBar;
  ctx.fillRect(0, 0, W, 26);

  // Logo Origen Canino
  try {
    const logo = await loadImage('/logo.webp');
    const lw = 148;
    const lh = (logo.height / logo.width) * lw;
    drawRoundRect(ctx, (W - 180) / 2, 82, 180, 180, 38);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.drawImage(logo, (W - lw) / 2, 98, lw, lh);
  } catch {}

  ctx.textAlign = 'center';
  ctx.fillStyle = theme.titleColor;
  ctx.font = '800 44px "Outfit", sans-serif';
  ctx.fillText('Origen CANINO', W / 2, 316);
  ctx.fillStyle = theme.accentColor;
  ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('COMIDA REAL · VIDA SALUDABLE', W / 2, 354);

  // Pill de campaña
  const campTitle = (coupon.campaign_title || '').trim() || 'PROMOCIÓN ESPECIAL';
  drawRoundRect(ctx, 130, 405, W - 260, 72, 36);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.fillStyle = theme.badgeText;
  ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(campTitle.toUpperCase().slice(0, 34), W / 2, 451);

  // Beneficio gigante
  const val = Number(coupon.discount_value || 0);
  const benefitBig =
    coupon.discount_type === 'percentage'
      ? `${val}% OFF`
      : `$${Math.round(val).toLocaleString('es-CL')} OFF`;
  ctx.fillStyle = theme.accentColor;
  ctx.font = '900 124px "Outfit", sans-serif';
  ctx.fillText(benefitBig, W / 2, 608);

  // Subtítulo / descripción
  ctx.fillStyle = theme.subColor;
  ctx.font = '600 32px "Plus Jakarta Sans", sans-serif';
  const desc = (coupon.description || 'Comida real 100% natural para tu perro · BARF y Cocinada').trim();
  drawWrappedCenteredText(ctx, desc, W / 2, 672, W - 160, 44, 2);

  // Tarjeta blanca central con QR + código
  drawRoundRect(ctx, 150, 795, W - 300, 700, 48);
  ctx.fillStyle = theme.cardBg;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.cardBorder;
  ctx.stroke();

  const qrImg = await svgElementToImage(qrSvgElement);
  if (qrImg) {
    ctx.drawImage(qrImg, (W - 430) / 2, 855, 430, 430);
  }

  ctx.fillStyle = '#6B7280';
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ESCANEA EL QR O USA EL CÓDIGO:', W / 2, 1350);

  drawRoundRect(ctx, 230, 1378, W - 460, 82, 24);
  ctx.fillStyle = theme.codeBg;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = theme.cardBorder;
  ctx.stroke();
  ctx.fillStyle = theme.codeText;
  ctx.font = '800 44px monospace';
  ctx.fillText(String(coupon.code || '').toUpperCase(), W / 2, 1434);

  // Condiciones claras
  const condParts = [];
  if (Number(coupon.min_kg || 0) > 0) condParts.push(`Mínimo ${Number(coupon.min_kg)} kg en dietas`);
  if (Number(coupon.min_order_amount || 0) > 0) {
    condParts.push(`Compra mín. $${Number(coupon.min_order_amount).toLocaleString('es-CL')}`);
  }
  if (coupon.end_date) {
    const d = new Date(coupon.end_date);
    if (!isNaN(d.getTime())) {
      condParts.push(`Hasta ${d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}`);
    }
  }
  const condLine = condParts.length > 0 ? condParts.join('  ·  ') : '100% Natural · Sin Ultraprocesados';

  // Footer
  drawRoundRect(ctx, 130, 1565, W - 260, 114, 28);
  ctx.fillStyle = theme.footerBg;
  ctx.fill();
  ctx.fillStyle = theme.footerText;
  ctx.font = '800 34px "Outfit", sans-serif';
  ctx.fillText('origencanino.cl', W / 2, 1617);
  ctx.fillStyle = theme.footerSub;
  ctx.font = '600 23px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Despacho en frío -18°C · Santiago y V Región', W / 2, 1656);

  ctx.fillStyle = theme.subColor;
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(condLine, W / 2, 1748);

  return canvas.toDataURL('image/png');
};

/**
 * Rutas y medidas oficiales editables de la Lámina NFC 10×15 cm (Canon SELPHY CP1500):
 *  - Lienzo total: 1200 × 1800 px (10 × 15 cm exactos a 300 DPI, 12 px/mm)
 *  - Imagen principal (fondo superior a sangre): /images/nfc-lamina-hero.jpg  -> 1200 × 1120 px
 *  - Logo oficial: /logo.webp -> 512 × 512 px (cuadrado fondo blanco o transparente)
 *  - Círculo guía tag NFC NTAG213: 25 mm exactos = 300 px de diámetro (esquina superior derecha)
 *  - Margen seguro anti-recorte borderless SELPHY: 5.5 mm = 66 px en los 4 bordes
 */
export const NFC_LAMINA_SPECS = {
  canvasWidth: 1200,
  canvasHeight: 1800,
  heroImagePath: '/images/nfc-lamina-hero.jpg',
  heroRecommendedSize: '1200 × 1120 px',
  logoImagePath: '/logo.webp',
  logoRecommendedSize: '512 × 512 px (cuadrado)',
  nfcDiameterMm: 25,
  nfcDiameterPx: 300
};

export const generateNfcLamina10x15DataUrl = async (
  building,
  qrSvgElement,
  options = {}
) => {
  const W = NFC_LAMINA_SPECS.canvasWidth;
  const H = NFC_LAMINA_SPECS.canvasHeight;
  const SAFE = 66; // 5.5 mm margen seguro borderless SELPHY CP1500
  const PHOTO_H = 1120; // Mitad superior a sangre (full-bleed)

  const heroSrc = options.customHeroSrc || NFC_LAMINA_SPECS.heroImagePath;
  const logoSrc = options.customLogoSrc || NFC_LAMINA_SPECS.logoImagePath;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 1. Base editorial Verde Bosque Profundo en todo el lienzo
  ctx.fillStyle = '#233016';
  ctx.fillRect(0, 0, W, H);

  // =========================================================================
  // 2. FOTOGRAFÍA EDITORIAL FULL-BLEED (0 -> 1120 px)
  // =========================================================================
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, PHOTO_H);
  ctx.clip();
  try {
    const heroImg = await loadImage(heroSrc);
    const ratio = Math.max(W / heroImg.width, PHOTO_H / heroImg.height);
    const dw = heroImg.width * ratio;
    const dh = heroImg.height * ratio;
    ctx.drawImage(heroImg, (W - dw) / 2, (PHOTO_H - dh) / 2, dw, dh);
  } catch {
    const fb = ctx.createLinearGradient(0, 0, 0, PHOTO_H);
    fb.addColorStop(0, '#3B4D26');
    fb.addColorStop(1, '#233016');
    ctx.fillStyle = fb;
    ctx.fillRect(0, 0, W, PHOTO_H);
  }

  // Viñeta superior muy sutil para que el logo y el círculo NFC respiren con contraste
  const topVignette = ctx.createLinearGradient(0, 0, 0, 320);
  topVignette.addColorStop(0, 'rgba(20, 26, 14, 0.42)');
  topVignette.addColorStop(1, 'rgba(20, 26, 14, 0)');
  ctx.fillStyle = topVignette;
  ctx.fillRect(0, 0, W, 320);

  // Fundido impecable de la base de la foto hacia el bloque inferior (#233016)
  const bottomFade = ctx.createLinearGradient(0, PHOTO_H - 340, 0, PHOTO_H);
  bottomFade.addColorStop(0, 'rgba(35, 48, 22, 0)');
  bottomFade.addColorStop(0.55, 'rgba(35, 48, 22, 0.72)');
  bottomFade.addColorStop(1, 'rgba(35, 48, 22, 1)');
  ctx.fillStyle = bottomFade;
  ctx.fillRect(0, PHOTO_H - 340, W, 340);
  ctx.restore();

  // =========================================================================
  // 3. LOGO PROTAGONISTA ARRIBA IZQUIERDA (SIN TEXTO DUPLICADO)
  // =========================================================================
  const logoR = 128; // Diámetro 256 px — grande, nítido y balanceado con el círculo NFC
  const logoCx = SAFE + logoR;
  const logoCy = SAFE + logoR + 6;

  ctx.save();
  ctx.beginPath();
  ctx.arc(logoCx, logoCy, logoR, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 8;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(logoCx, logoCy, logoR - 6, 0, Math.PI * 2);
  ctx.clip();
  try {
    const logo = await loadImage(logoSrc);
    const pad = 16;
    const maxS = (logoR - pad) * 2;
    const lr = Math.min(maxS / logo.width, maxS / logo.height);
    const lw = logo.width * lr;
    const lh = logo.height * lr;
    ctx.drawImage(logo, logoCx - lw / 2, logoCy - lh / 2, lw, lh);
  } catch {}
  ctx.restore();

  // =========================================================================
  // 4. CÍRCULO GUÍA NFC 25 mm EXACTOS (300 px) — ESQUINA SUPERIOR DERECHA
  // =========================================================================
  const nfcR = 150; // 25 mm exactos @ 300 DPI (12 px/mm)
  const nfcCx = W - SAFE - nfcR; // 984
  const nfcCy = SAFE + nfcR + 4; // 220

  ctx.save();
  // Halo luminoso exterior para llamar la mirada al instante
  ctx.beginPath();
  ctx.arc(nfcCx, nfcCy, nfcR + 12, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.fill();

  // Base del sello NFC 25 mm
  ctx.beginPath();
  ctx.arc(nfcCx, nfcCy, nfcR, 0, Math.PI * 2);
  const nfcGrad = ctx.createLinearGradient(nfcCx - nfcR, nfcCy - nfcR, nfcCx + nfcR, nfcCy + nfcR);
  nfcGrad.addColorStop(0, '#E39F4B');
  nfcGrad.addColorStop(1, '#C57B27');
  ctx.fillStyle = nfcGrad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.36)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Anillo blanco interior fino (calce exacto del tag NTAG213 de 25mm)
  ctx.beginPath();
  ctx.arc(nfcCx, nfcCy, nfcR - 10, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.stroke();

  // Ícono vectorial limpio de ondas NFC centrado arriba
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineCap = 'round';
  const waveCy = nfcCy - 24;
  [18, 36, 54].forEach((r, idx) => {
    ctx.lineWidth = 6.5 - idx * 0.6;
    ctx.beginPath();
    ctx.arc(nfcCx, waveCy, r, -Math.PI * 0.78, -Math.PI * 0.22);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.arc(nfcCx, waveCy, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Texto ultra-limpio dentro del sello NFC (UNA sola fuente: Outfit)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 28px "Outfit", sans-serif';
  ctx.fillText('ACERCA TU', nfcCx, nfcCy + 28);
  ctx.fillText('TELÉFONO', nfcCx, nfcCy + 60);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.font = '700 18px "Outfit", sans-serif';
  ctx.fillText('NFC · SIN APPS', nfcCx, nfcCy + 94);
  ctx.restore();

  // =========================================================================
  // 5. BLOQUE EDITORIAL INFERIOR (UNA SOLA FUENTE: OUTFIT · JERARQUÍA LIMPIA)
  // =========================================================================
  const bName = String(building.name || 'Tu Comunidad').trim().toUpperCase();
  const discPct = Number(building.discount_percent || 15);

  // Eyebrow elegante sobre la transición de la foto
  ctx.textAlign = 'left';
  ctx.fillStyle = '#E5A956';
  ctx.font = '700 24px "Outfit", sans-serif';
  ctx.fillText(`BENEFICIO EXCLUSIVO · ${bName.slice(0, 30)}`, SAFE, 1025);

  // Titular único limpio y sobrio (2 palabras fuertes en 1 línea o 2 líneas muy limpias)
  ctx.fillStyle = '#FAF7F2';
  ctx.font = '800 72px "Outfit", sans-serif';
  ctx.fillText('Comida real para tu perro', SAFE, 1106);

  // Línea sutil separadora dorada
  ctx.fillStyle = 'rgba(229, 169, 86, 0.35)';
  ctx.fillRect(SAFE, 1142, W - SAFE * 2, 2);

  // Columna Izquierda: Descuento protagonista (centrado verticalmente entre y=1142 y y=1642)
  const offerY = 1365;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#E5A956';
  ctx.font = '900 156px "Outfit", sans-serif';
  ctx.fillText(`${discPct}%`, SAFE, offerY);

  const pctWidth = ctx.measureText(`${discPct}%`).width;
  ctx.fillStyle = '#FAF7F2';
  ctx.font = '800 58px "Outfit", sans-serif';
  ctx.fillText('OFF', SAFE + pctWidth + 16, offerY - 56);

  ctx.fillStyle = '#D9E4C8';
  ctx.font = '600 32px "Outfit", sans-serif';
  ctx.fillText('en tu primera compra', SAFE + pctWidth + 16, offerY - 12);

  // Subtítulo único y directo debajo de la oferta
  ctx.fillStyle = '#FAF7F2';
  ctx.font = '600 30px "Outfit", sans-serif';
  ctx.fillText('Dietas BARF crudas y cocinadas al vapor', SAFE, 1460);

  ctx.fillStyle = 'rgba(217, 228, 200, 0.82)';
  ctx.font = '500 25px "Outfit", sans-serif';
  ctx.fillText('100% natural · Despacho a tu edificio en frío -18°C', SAFE, 1506);

  // Columna Derecha: Código QR de respaldo en tarjeta blanca impoluta
  const qrBox = 276;
  const qrX = W - SAFE - qrBox;
  const qrY = 1236;

  ctx.save();
  drawRoundRect(ctx, qrX, qrY, qrBox, qrBox, 28);
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  const qrImg = await svgElementToImage(qrSvgElement);
  if (qrImg) {
    ctx.drawImage(qrImg, qrX + 20, qrY + 20, qrBox - 40, qrBox - 40);
  }
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(217, 228, 200, 0.88)';
  ctx.font = '600 21px "Outfit", sans-serif';
  ctx.fillText('¿Sin NFC? Escanea', qrX + qrBox / 2, qrY + qrBox + 34);

  // =========================================================================
  // 6. PIE MINIMALISTA CON DOMINIO OFICIAL (SOBRE MARGEN SEGURO)
  // =========================================================================
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.fillRect(SAFE, H - SAFE - 92, W - SAFE * 2, 2);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#FAF7F2';
  ctx.font = '700 32px "Outfit", sans-serif';
  ctx.fillText('origencanino.cl', SAFE, H - SAFE - 34);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#E5A956';
  ctx.font = '600 24px "Outfit", sans-serif';
  ctx.fillText('Toca el sello NFC o escanea el QR', W - SAFE, H - SAFE - 36);

  return canvas.toDataURL('image/png');
};
