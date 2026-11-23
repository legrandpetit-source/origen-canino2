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
    baseColor: '#233016',
    baseRgb: '35, 48, 22',
    accentColor: '#E5A956',
    badgeBg: '#E5A956',
    badgeText: '#1F2A14',
    titleColor: '#FAF7F2',
    subColor: '#D9E4C8',
    codeBg: 'rgba(255, 255, 255, 0.08)',
    codeBorder: 'rgba(229, 169, 86, 0.65)',
    codeText: '#FAF7F2',
    divider: 'rgba(229, 169, 86, 0.35)',
    sparkle: false
  },
  honey: {
    label: 'Naranjo Miel',
    baseColor: '#362012',
    baseRgb: '54, 32, 18',
    accentColor: '#F2AE52',
    badgeBg: '#E3973B',
    badgeText: '#FFFFFF',
    titleColor: '#FFF9F2',
    subColor: '#F3D8B8',
    codeBg: 'rgba(255, 255, 255, 0.08)',
    codeBorder: 'rgba(242, 174, 82, 0.70)',
    codeText: '#FFF9F2',
    divider: 'rgba(242, 174, 82, 0.35)',
    sparkle: false
  },
  christmas: {
    label: 'Especial Navidad',
    baseColor: '#152B1D',
    baseRgb: '21, 43, 29',
    accentColor: '#F4C869',
    badgeBg: '#B92525',
    badgeText: '#FFFFFF',
    titleColor: '#FFFDF8',
    subColor: '#D7E6D9',
    codeBg: 'rgba(185, 37, 37, 0.28)',
    codeBorder: 'rgba(244, 200, 105, 0.75)',
    codeText: '#FFFDF8',
    divider: 'rgba(244, 200, 105, 0.42)',
    sparkle: true
  },
  vip: {
    label: 'VIP Oscuro & Dorado',
    baseColor: '#141210',
    baseRgb: '20, 18, 16',
    accentColor: '#E6B85C',
    badgeBg: '#E6B85C',
    badgeText: '#141210',
    titleColor: '#FAF7F2',
    subColor: '#D4CEC4',
    codeBg: 'rgba(230, 184, 92, 0.12)',
    codeBorder: 'rgba(230, 184, 92, 0.75)',
    codeText: '#F5D284',
    divider: 'rgba(230, 184, 92, 0.38)',
    sparkle: false,
    vipFrame: true
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

/**
 * Tarjeta Vertical Story (1080 × 1920 px) de estilo editorial full-bleed
 * con 4 temas diferenciados (Oliva Origen, Naranjo Miel, Especial Navidad, VIP Oscuro & Dorado).
 */
export const generateCouponStoryDataUrl = async (
  coupon,
  qrSvgElement,
  themeKeyOverride = null,
  options = {}
) => {
  const theme = STORY_THEMES[themeKeyOverride || coupon.story_theme || 'olive'] || STORY_THEMES.olive;
  const W = 1080;
  const H = 1920;
  const SAFE = 68;
  const PHOTO_H = 980;

  const heroSrc = options.customHeroSrc || '/images/nfc-lamina-hero.jpg';
  const logoSrc = options.customLogoSrc || '/logo.webp';

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 1. Base profunda del tema
  ctx.fillStyle = theme.baseColor;
  ctx.fillRect(0, 0, W, H);

  // 2. Fotografía editorial a sangre (0 -> 980 px)
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
    ctx.fillStyle = theme.baseColor;
    ctx.fillRect(0, 0, W, PHOTO_H);
  }

  // Viñeta superior sutil para legibilidad de logo y badge de campaña
  const topVig = ctx.createLinearGradient(0, 0, 0, 290);
  topVig.addColorStop(0, `rgba(${theme.baseRgb}, 0.55)`);
  topVig.addColorStop(1, `rgba(${theme.baseRgb}, 0)`);
  ctx.fillStyle = topVig;
  ctx.fillRect(0, 0, W, 290);

  // Fundido impecable de la base de la foto al color del tema
  const botFade = ctx.createLinearGradient(0, PHOTO_H - 360, 0, PHOTO_H);
  botFade.addColorStop(0, `rgba(${theme.baseRgb}, 0)`);
  botFade.addColorStop(0.55, `rgba(${theme.baseRgb}, 0.78)`);
  botFade.addColorStop(1, `rgba(${theme.baseRgb}, 1)`);
  ctx.fillStyle = botFade;
  ctx.fillRect(0, PHOTO_H - 360, W, 360);
  ctx.restore();

  // Detalle sutil de marco dorado para tema VIP
  if (theme.vipFrame) {
    ctx.save();
    drawRoundRect(ctx, 28, 28, W - 56, H - 56, 36);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(230, 184, 92, 0.42)';
    ctx.stroke();
    ctx.restore();
  }

  // Detalles sutiles de destellos dorados minimalistas para Especial Navidad
  if (theme.sparkle) {
    ctx.save();
    const stars = [
      [130, 1020, 12], [945, 960, 14], [880, 1135, 9],
      [115, 1690, 10], [970, 1680, 12], [540, 915, 8]
    ];
    stars.forEach(([sx, sy, sr]) => {
      ctx.fillStyle = 'rgba(244, 200, 105, 0.52)';
      ctx.beginPath();
      ctx.moveTo(sx, sy - sr);
      ctx.quadraticCurveTo(sx, sy, sx + sr, sy);
      ctx.quadraticCurveTo(sx, sy, sx, sy + sr);
      ctx.quadraticCurveTo(sx, sy, sx - sr, sy);
      ctx.quadraticCurveTo(sx, sy, sx, sy - sr);
      ctx.fill();
    });
    ctx.restore();
  }

  // 3. Medallón circular protagonista con el Logo oficial (arriba izquierda, sin texto duplicado)
  const logoR = 112;
  const logoCx = SAFE + logoR;
  const logoCy = SAFE + logoR + 12;

  ctx.save();
  ctx.beginPath();
  ctx.arc(logoCx, logoCy, logoR, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.30)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 8;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.vipFrame ? '#E6B85C' : 'rgba(255, 255, 255, 0.92)';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(logoCx, logoCy, logoR - 6, 0, Math.PI * 2);
  ctx.clip();
  try {
    const logo = await loadImage(logoSrc);
    const maxS = (logoR - 14) * 2;
    const lr = Math.min(maxS / logo.width, maxS / logo.height);
    const lw = logo.width * lr;
    const lh = logo.height * lr;
    ctx.drawImage(logo, logoCx - lw / 2, logoCy - lh / 2, lw, lh);
  } catch {}
  ctx.restore();

  // 4. Pill editorial superior derecha (Título de campaña)
  const campTitle = (coupon.campaign_title || '').trim() || 'PROMOCIÓN ESPECIAL';
  const badgeLabel = campTitle.toUpperCase().slice(0, 26);
  ctx.font = '800 22px "Outfit", sans-serif';
  const badgeW = Math.min(540, Math.max(280, ctx.measureText(badgeLabel).width + 64));
  const badgeX = W - SAFE - badgeW;
  const badgeY = SAFE + 26;

  ctx.save();
  drawRoundRect(ctx, badgeX, badgeY, badgeW, 56, 28);
  ctx.fillStyle = theme.badgeBg;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.textAlign = 'center';
  ctx.fillStyle = theme.badgeText;
  ctx.font = '800 22px "Outfit", sans-serif';
  ctx.fillText(badgeLabel, badgeX + badgeW / 2, badgeY + 36);
  ctx.restore();

  // 5. Bloque Editorial Principal (UNA sola fuente: Outfit)
  const scopeEyebrowMap = {
    all: 'BENEFICIO EXCLUSIVO · DIETA BARF Y COMIDA COCINADA',
    diets: 'BENEFICIO EXCLUSIVO · DIETA BARF Y COMIDA COCINADA',
    barf: 'BENEFICIO EXCLUSIVO · DIETA BARF CRUDA 100% NATURAL',
    cocinada: 'BENEFICIO EXCLUSIVO · ALIMENTACIÓN NATURAL COCINADA',
    snack: 'BENEFICIO EXCLUSIVO · SNACKS NATURALES DESHIDRATADOS'
  };
  const eyebrowTxt =
    scopeEyebrowMap[String(coupon.applicable_scope || 'all').toLowerCase()] ||
    scopeEyebrowMap.all;

  ctx.textAlign = 'left';
  ctx.fillStyle = theme.accentColor;
  ctx.font = '700 25px "Outfit", sans-serif';
  ctx.fillText(eyebrowTxt, SAFE, 930);

  // Beneficio protagonista gigante (sin repetir el % abajo)
  const val = Number(coupon.discount_value || 0);
  const benefitBig =
    coupon.discount_type === 'percentage'
      ? `${val}% OFF`
      : `$${Math.round(val).toLocaleString('es-CL')} OFF`;
  ctx.fillStyle = theme.titleColor;
  ctx.font = '900 144px "Outfit", sans-serif';
  ctx.fillText(benefitBig, SAFE, 1068);

  // Bajada clara explicando el producto (2 líneas limpias, jamás muestra notas internas ni repite %)
  const defaultProductCopyMap = {
    all: 'Dieta BARF cruda y alimentación natural cocinada al vapor para tu perro. Sin harinas ni ultraprocesados.',
    diets: 'Dieta BARF cruda y alimentación natural cocinada al vapor para tu perro. Sin harinas ni ultraprocesados.',
    barf: 'Dieta BARF cruda biológicamente apropiada con carnes, huesos carnosos y vegetales reales.',
    cocinada: 'Alimentación natural cocinada suavemente al vapor, ideal para estómagos sensibles y fácil digestión.',
    snack: 'Snacks 100% naturales deshidratados a baja temperatura y caldos de huesos para tu perro.'
  };
  const desc = (
    (options.customSubtitle || '').trim() ||
    defaultProductCopyMap[String(coupon.applicable_scope || 'all').toLowerCase()] ||
    defaultProductCopyMap.all
  );

  ctx.fillStyle = theme.subColor;
  ctx.font = '500 32px "Outfit", sans-serif';
  const words = desc.split(/\s+/).filter(Boolean);
  const descLines = [];
  let curLine = '';
  for (const w of words) {
    const test = curLine ? `${curLine} ${w}` : w;
    if (ctx.measureText(test).width > W - SAFE * 2 && curLine) {
      descLines.push(curLine);
      curLine = w;
      if (descLines.length >= 2) break;
    } else {
      curLine = test;
    }
  }
  if (curLine && descLines.length < 2) descLines.push(curLine);
  descLines.forEach((ln, idx) => ctx.fillText(ln, SAFE, 1134 + idx * 42));

  // Separador fino
  const sepY = 1236;
  ctx.fillStyle = theme.divider;
  ctx.fillRect(SAFE, sepY, W - SAFE * 2, 2);

  // 6. Zona de Acción: Código a la Izquierda + QR a la Derecha (equilibrio geométrico)
  const blockY = 1295;
  const qrBox = 310;
  const qrX = W - SAFE - qrBox;
  const qrY = blockY;

  // Izquierda: Etiqueta + Código + Condiciones
  const leftMaxW = qrX - SAFE - 40;
  ctx.textAlign = 'left';
  ctx.fillStyle = theme.accentColor;
  ctx.font = '700 23px "Outfit", sans-serif';
  ctx.fillText('USA ESTE CÓDIGO AL COMPRAR', SAFE, blockY + 38);

  const codeStr = String(coupon.code || '').toUpperCase();
  drawRoundRect(ctx, SAFE, blockY + 62, leftMaxW, 108, 26);
  ctx.fillStyle = theme.codeBg;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = theme.codeBorder;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = theme.codeText;
  const codeFontSize = codeStr.length > 11 ? 42 : 52;
  ctx.font = `800 ${codeFontSize}px "Outfit", sans-serif`;
  ctx.fillText(codeStr, SAFE + leftMaxW / 2, blockY + 132);

  // Condiciones limpias debajo del código
  const condLines = [];
  if (Number(coupon.min_kg || 0) > 0) condLines.push(`• Mínimo ${Number(coupon.min_kg)} kg en dietas`);
  if (Number(coupon.min_order_amount || 0) > 0) {
    condLines.push(`• Compra mínima $${Number(coupon.min_order_amount).toLocaleString('es-CL')} CLP`);
  }
  if (coupon.end_date) {
    const d = new Date(coupon.end_date);
    if (!isNaN(d.getTime())) {
      condLines.push(`• Válido hasta el ${d.toLocaleDateString('es-CL', { day: '2-digit', month: 'long' })}`);
    }
  }
  if (condLines.length === 0) {
    condLines.push('• Dietas BARF y Cocinadas al vapor');
    condLines.push('• Sin ultraprocesados ni harinas');
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = theme.subColor;
  ctx.font = '500 25px "Outfit", sans-serif';
  condLines.slice(0, 3).forEach((cl, idx) => {
    ctx.fillText(cl, SAFE + 4, blockY + 218 + idx * 38);
  });

  // Derecha: Tarjeta blanca limpia con QR escaneable
  ctx.save();
  drawRoundRect(ctx, qrX, qrY, qrBox, qrBox, 32);
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.30)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  if (theme.vipFrame) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#E6B85C';
    ctx.stroke();
  }
  const qrImg = await svgElementToImage(qrSvgElement);
  if (qrImg) {
    ctx.drawImage(qrImg, qrX + 22, qrY + 22, qrBox - 44, qrBox - 44);
  }
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = theme.subColor;
  ctx.font = '600 22px "Outfit", sans-serif';
  ctx.fillText('Escanea para aplicar', qrX + qrBox / 2, qrY + qrBox + 38);

  // 7. Pie editorial minimalista (sobre margen seguro)
  ctx.fillStyle = theme.divider;
  ctx.fillRect(SAFE, H - SAFE - 102, W - SAFE * 2, 2);

  ctx.textAlign = 'left';
  ctx.fillStyle = theme.titleColor;
  ctx.font = '800 34px "Outfit", sans-serif';
  ctx.fillText('origencanino.cl', SAFE, H - SAFE - 40);

  ctx.textAlign = 'right';
  ctx.fillStyle = theme.accentColor;
  ctx.font = '600 24px "Outfit", sans-serif';
  ctx.fillText('Frío -18°C · Santiago y V Región', W - SAFE, H - SAFE - 42);

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
