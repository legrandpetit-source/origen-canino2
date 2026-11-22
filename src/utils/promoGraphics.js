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
 * Lámina Imprimible Vertical 10×15 cm a 300 DPI (1200 × 1800 px) para Canon SELPHY CP1500.
 * - Margen de seguridad borderless: 5 mm (60 px) en los 4 bordes.
 * - Círculo guía NFC en esquina superior derecha: 25 mm exactos = 300 px de diámetro (radio 150 px).
 * - Diseño editorial ultra-pulcro y de alto contraste para pedestales acrílicos en L.
 */
export const generateNfcLamina10x15DataUrl = async (building, qrSvgElement) => {
  const W = 1200; // 100 mm @ 300 DPI (12 px/mm)
  const H = 1800; // 150 mm @ 300 DPI (12 px/mm)
  const SAFE = 66; // 5.5 mm margen seguro anti-recorte SELPHY

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 1. Fondo editorial crema cálido con degradado radial ultra limpio
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#FFFFFF');
  bgGrad.addColorStop(0.45, '#FAF7F2');
  bgGrad.addColorStop(1, '#EFE8DA');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Franja superior arquitectónica verde oliva oscuro + línea fina dorada
  ctx.fillStyle = '#3C4F26';
  ctx.fillRect(0, 0, W, 22);
  ctx.fillStyle = '#DB994B';
  ctx.fillRect(0, 22, W, 6);

  // =========================================================================
  // 2. ZONA SUPERIOR: LOGO IZQUIERDA + CÍRCULO GUÍA NFC 25mm (300px) DERECHA
  // =========================================================================
  // Logo + Marca a la izquierda (alineado al margen seguro)
  try {
    const logo = await loadImage('/logo.webp');
    const boxSize = 152;
    drawRoundRect(ctx, SAFE, SAFE + 16, boxSize, boxSize, 32);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(61, 43, 31, 0.10)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#EAE0D0';
    ctx.stroke();

    const lw = 128;
    const lh = (logo.height / logo.width) * lw;
    ctx.drawImage(logo, SAFE + (boxSize - lw) / 2, SAFE + 16 + (boxSize - lh) / 2, lw, lh);
  } catch {}

  ctx.textAlign = 'left';
  ctx.fillStyle = '#3D2B1F';
  ctx.font = '900 44px "Outfit", sans-serif';
  ctx.fillText('Origen', SAFE + 174, SAFE + 82);
  ctx.fillStyle = '#556B2F';
  ctx.font = '900 44px "Outfit", sans-serif';
  ctx.fillText('CANINO', SAFE + 174, SAFE + 128);
  ctx.fillStyle = '#7A6A5B';
  ctx.font = '800 17px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('COMIDA REAL · VIDA SALUDABLE', SAFE + 176, SAFE + 160);

  // Círculo Guía NFC 25 mm EXACTOS (diámetro 300 px → radio 150 px) en esquina superior derecha
  const nfcR = 150; // 25 mm exactos a 12 px/mm
  const nfcCx = W - SAFE - nfcR; // 1200 - 66 - 150 = 984
  const nfcCy = SAFE + nfcR + 12; // 66 + 150 + 12 = 228

  // Halo exterior llamativo (invita a acercar el celular)
  ctx.save();
  ctx.beginPath();
  ctx.arc(nfcCx, nfcCy, nfcR + 14, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(219, 153, 75, 0.16)';
  ctx.fill();

  // Cuerpo del círculo 25mm (guía exacta para pegar el tag NTAG213)
  ctx.beginPath();
  ctx.arc(nfcCx, nfcCy, nfcR, 0, Math.PI * 2);
  const nfcGrad = ctx.createLinearGradient(nfcCx - nfcR, nfcCy - nfcR, nfcCx + nfcR, nfcCy + nfcR);
  nfcGrad.addColorStop(0, '#2F3E1E');
  nfcGrad.addColorStop(1, '#4A612E');
  ctx.fillStyle = nfcGrad;
  ctx.shadowColor = 'rgba(47, 62, 30, 0.25)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Borde punteado sutil interior para calce exacto del sticker 25mm
  ctx.beginPath();
  ctx.arc(nfcCx, nfcCy, nfcR - 10, 0, Math.PI * 2);
  ctx.setLineDash([8, 7]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(247, 215, 168, 0.78)';
  ctx.stroke();
  ctx.setLineDash([]);

  // Ícono vectorial limpio de ondas NFC centrado arriba
  ctx.strokeStyle = '#F7D7A8';
  ctx.lineCap = 'round';
  const waveY = nfcCy - 38;
  [18, 34, 50].forEach((r, idx) => {
    ctx.lineWidth = 6 - idx * 0.5;
    ctx.beginPath();
    ctx.arc(nfcCx, waveY + 14, r, -Math.PI * 0.78, -Math.PI * 0.22);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.arc(nfcCx, waveY + 14, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#F7D7A8';
  ctx.fill();

  // Texto dentro del círculo NFC
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 26px "Outfit", sans-serif';
  ctx.fillText('ACERCA TU', nfcCx, nfcCy + 28);
  ctx.fillText('CELULAR AQUÍ', nfcCx, nfcCy + 58);

  // Pill mini "NFC" debajo
  drawRoundRect(ctx, nfcCx - 46, nfcCy + 74, 92, 30, 15);
  ctx.fillStyle = '#DB994B';
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 17px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('NFC', nfcCx, nfcCy + 95);
  ctx.restore();

  // Flechita / nota sutil debajo del círculo invitando al toque
  ctx.textAlign = 'center';
  ctx.fillStyle = '#556B2F';
  ctx.font = '800 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('▲ TOCA AQUÍ SIN APPS', nfcCx, nfcCy + nfcR + 36);

  // =========================================================================
  // 3. BLOQUE PROTAGONISTA: BENEFICIO EXCLUSIVO DEL EDIFICIO + DESCUENTO
  // =========================================================================
  const heroTop = 426;

  // Pill de exclusividad del edificio
  const bName = String(building.name || 'Tu Comunidad').trim();
  drawRoundRect(ctx, SAFE, heroTop, W - SAFE * 2, 54, 27);
  ctx.fillStyle = '#EBF2DA';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#C9DC9F';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#3C4F26';
  ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`BENEFICIO EXCLUSIVO VECINOS · ${bName.toUpperCase().slice(0, 34)}`, W / 2, heroTop + 35);

  // Titular editorial principal
  ctx.fillStyle = '#3D2B1F';
  ctx.font = '900 64px "Outfit", sans-serif';
  ctx.fillText('Comida Real para', W / 2, heroTop + 132);
  ctx.fillStyle = '#556B2F';
  ctx.font = '900 64px "Outfit", sans-serif';
  ctx.fillText('la Salud de tu Perro', W / 2, heroTop + 200);

  // Foto editorial del plato + Tarjeta de Descuento integrada (composición de alto impacto)
  const photoY = heroTop + 236;
  const photoW = W - SAFE * 2;
  const photoH = 445;

  ctx.save();
  drawRoundRect(ctx, SAFE, photoY, photoW, photoH, 38);
  ctx.shadowColor = 'rgba(61, 43, 31, 0.16)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.clip();

  try {
    const foodImg = await loadImage('/images/products/dieta-barf.jpg');
    const ratio = Math.max(photoW / foodImg.width, photoH / foodImg.height);
    const dw = foodImg.width * ratio;
    const dh = foodImg.height * ratio;
    ctx.drawImage(foodImg, SAFE + (photoW - dw) / 2, photoY + (photoH - dh) / 2, dw, dh);
  } catch {
    ctx.fillStyle = '#EBF2DA';
    ctx.fillRect(SAFE, photoY, photoW, photoH);
  }

  // Degradado sutil oscuro en la parte inferior de la foto para legibilidad total
  const scrim = ctx.createLinearGradient(0, photoY + photoH * 0.45, 0, photoY + photoH);
  scrim.addColorStop(0, 'rgba(28, 22, 16, 0)');
  scrim.addColorStop(1, 'rgba(28, 22, 16, 0.78)');
  ctx.fillStyle = scrim;
  ctx.fillRect(SAFE, photoY, photoW, photoH);

  // Sello superior izquierdo dentro de la foto
  drawRoundRect(ctx, SAFE + 28, photoY + 26, 400, 46, 23);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#3C4F26';
  ctx.font = '800 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('100% NATURAL · SIN ULTRAPROCESADOS', SAFE + 228, photoY + 56);

  // Texto inferior dentro de la foto
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 32px "Outfit", sans-serif';
  ctx.fillText('Dietas BARF Crudas y Cocinadas al Vapor', SAFE + 34, photoY + photoH - 64);
  ctx.fillStyle = '#F3E8D4';
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Despacho directo a tu edificio con cadena de frío -18°C', SAFE + 34, photoY + photoH - 28);
  ctx.restore();

  // Borde blanco nítido alrededor de la foto
  drawRoundRect(ctx, SAFE, photoY, photoW, photoH, 38);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();

  // =========================================================================
  // 4. BANNER DE DESCUENTO PROTAGONISTA (NARANJO MIEL DE ALTO IMPACTO)
  // =========================================================================
  const discY = photoY + photoH + 34;
  const discH = 172;
  const discPct = Number(building.discount_percent || 15);

  const discGrad = ctx.createLinearGradient(SAFE, discY, W - SAFE, discY + discH);
  discGrad.addColorStop(0, '#DB994B');
  discGrad.addColorStop(1, '#C47B2B');
  drawRoundRect(ctx, SAFE, discY, photoW, discH, 34);
  ctx.fillStyle = discGrad;
  ctx.shadowColor = 'rgba(196, 123, 43, 0.28)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 108px "Outfit", sans-serif';
  ctx.fillText(`${discPct}%`, SAFE + 48, discY + 124);

  const pctW = ctx.measureText(`${discPct}%`).width;
  ctx.font = '900 44px "Outfit", sans-serif';
  ctx.fillText('DE DESCUENTO', SAFE + 66 + pctW, discY + 76);
  ctx.fillStyle = '#FFF5E4';
  ctx.font = '700 27px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('EN TU PRIMERA COMPRA', SAFE + 66 + pctW, discY + 116);
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Aplicado automáticamente al tocar el chip NFC o escanear el QR', SAFE + 66 + pctW, discY + 148);

  // =========================================================================
  // 5. ZONA INFERIOR: RESPALDO QR + INSTRUCCIÓN LIMPIA + DOMINIO
  // =========================================================================
  const botY = discY + discH + 32;
  const botH = H - botY - SAFE;

  drawRoundRect(ctx, SAFE, botY, photoW, botH, 34);
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(61, 43, 31, 0.08)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#E6DCCB';
  ctx.stroke();

  // QR a la izquierda de la tarjeta inferior
  const qrSize = Math.min(240, botH - 44);
  const qrX = SAFE + 34;
  const qrY = botY + (botH - qrSize) / 2;

  const qrImg = await svgElementToImage(qrSvgElement);
  if (qrImg) {
    drawRoundRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 20);
    ctx.fillStyle = '#FAF7F2';
    ctx.fill();
    ctx.strokeStyle = '#E6DCCB';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  }

  // Texto explicativo a la derecha del QR
  const infoX = qrX + qrSize + 44;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#556B2F';
  ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('¿SIN NFC ACTIVADO EN TU TELÉFONO?', infoX, botY + 68);

  ctx.fillStyle = '#3D2B1F';
  ctx.font = '800 38px "Outfit", sans-serif';
  ctx.fillText('Escanea este código QR', infoX, botY + 116);

  ctx.fillStyle = '#6B5A4C';
  ctx.font = '600 23px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Calcula la ración exacta de tu perro en 30 seg', infoX, botY + 158);
  ctx.fillText('y activa el descuento de tu comunidad al instante.', infoX, botY + 190);

  // Pill inferior con dominio oficial
  drawRoundRect(ctx, infoX, botY + botH - 76, 360, 48, 16);
  ctx.fillStyle = '#2F3E1E';
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 25px "Outfit", sans-serif';
  ctx.fillText('www.origencanino.cl', infoX + 180, botY + botH - 43);

  return canvas.toDataURL('image/png');
};
