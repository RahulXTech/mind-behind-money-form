/* ============ Booking receipt PDF ============
 * Draws the receipt on a canvas (so Hindi text renders with the site's own font), then wraps the
 * image in a one-page A4 PDF. No PDF library needed.
 */

const PAGE_W = 595.28; // A4 in PDF points
const PAGE_H = 841.89;
const SCALE = 2.78; // ≈ 200 dpi
const C = {
  navy: "#1E2530", teal: "#2A7470", gold: "#E3A93A", ink: "#5B6470",
  field: "#FBF6EA", line: "#EADFC6", danger: "rgba(194, 65, 45, 0.13)",
};
const FONT = 'Poppins, "Noto Sans Devanagari", system-ui, sans-serif';

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Splits text into lines that fit `width` (breaks long words such as emails/IDs too)
function wrap(ctx, text, width) {
  const lines = [];
  let line = "";
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const tryLine = line ? line + " " + word : word;
    if (ctx.measureText(tryLine).width <= width) { line = tryLine; continue; }
    if (line) lines.push(line);
    line = "";
    let chunk = "";
    for (const ch of word) {
      if (ctx.measureText(chunk + ch).width > width && chunk) { lines.push(chunk); chunk = ""; }
      chunk += ch;
    }
    line = chunk;
  }
  if (line) lines.push(line);
  return lines.length ? lines : ["—"];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

async function drawReceipt(r) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(PAGE_W * SCALE);
  canvas.height = Math.round(PAGE_H * SCALE);
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);
  const font = (weight, size) => (ctx.font = `${weight} ${size}px ${FONT}`);
  const text = (s, x, y, { weight = 500, size = 11, color = C.navy, align = "left" } = {}) => {
    font(weight, size);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(s, x, y);
  };

  // Make sure every glyph (Latin + Devanagari + ₹) is loaded before drawing
  const sample = JSON.stringify(r.labels) + JSON.stringify(r.values) + "₹0123456789";
  await Promise.all([500, 600, 700, 800].map((w) => document.fonts.load(`${w} 16px Poppins`, sample).catch(() => {})));
  const logo = await loadImage(new URL("assets/logo.png", document.baseURI).href);

  const L = r.labels;
  const M = 48; // page margin
  const RIGHT = PAGE_W - M;

  // Background + top accent bar
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  const bar = ctx.createLinearGradient(0, 0, PAGE_W, 0);
  bar.addColorStop(0, C.teal); bar.addColorStop(0.5, C.gold); bar.addColorStop(1, C.teal);
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, PAGE_W, 7);

  // Header: logo + brand, receipt title on the right
  const LOGO = 62, LX = M, LY = 34;
  if (logo) {
    ctx.save();
    ctx.beginPath(); ctx.arc(LX + LOGO / 2, LY + LOGO / 2, LOGO / 2, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(logo, LX, LY, LOGO, LOGO);
    ctx.restore();
  }
  ctx.lineWidth = 3; ctx.strokeStyle = C.teal;
  ctx.beginPath(); ctx.arc(LX + LOGO / 2, LY + LOGO / 2, LOGO / 2, 0, Math.PI * 2); ctx.stroke();

  text("MIND BEHIND", M + LOGO + 16, 60, { weight: 800, size: 15 });
  text("MONEY", M + LOGO + 16, 82, { weight: 800, size: 22, color: C.teal });
  text("Paise ke peeche ki soch", M + LOGO + 16, 96, { weight: 500, size: 8.5, color: C.ink });

  text(L.title, RIGHT, 60, { weight: 700, size: 17, align: "right" });
  text(`${L.bookingId}: ${r.values.id}`, RIGHT, 78, { weight: 500, size: 9.5, color: C.ink, align: "right" });
  text(`${L.issuedOn}: ${r.values.issuedOn}`, RIGHT, 92, { weight: 500, size: 9.5, color: C.ink, align: "right" });

  ctx.fillStyle = C.line;
  ctx.fillRect(M, 120, PAGE_W - 2 * M, 1.2);

  // Total + PAID badge
  text(L.total, M, 152, { weight: 500, size: 10.5, color: C.ink });
  text(r.values.amount, M, 186, { weight: 800, size: 30, color: C.teal });
  font(700, 11);
  const badgeW = ctx.measureText(L.paid).width + 34;
  ctx.fillStyle = C.teal;
  roundRect(ctx, RIGHT - badgeW, 150, badgeW, 28, 14); ctx.fill();
  text(L.paid, RIGHT - badgeW / 2, 168.5, { weight: 700, size: 11, color: "#FFFFFF", align: "center" });

  // Sections: title + rounded box with label / value rows
  const VALUE_X = M + 150;
  const VALUE_W = RIGHT - 16 - VALUE_X;
  let y = 222;
  for (const section of r.sections) {
    text(section.title, M, y, { weight: 700, size: 11.5, color: C.teal });
    y += 10;
    const rows = section.rows.map(([label, value]) => {
      font(500, 10);
      const labels = wrap(ctx, label, VALUE_X - M - 30);
      font(600, 11);
      const lines = wrap(ctx, value || "—", VALUE_W);
      return { labels, lines, h: Math.max(labels.length, lines.length) * 15 + 14 };
    });
    const boxH = rows.reduce((h, row) => h + row.h, 0) + 8;
    ctx.fillStyle = C.field;
    roundRect(ctx, M, y, PAGE_W - 2 * M, boxH, 12); ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = C.line; ctx.stroke();

    let ry = y + 4;
    rows.forEach((row, i) => {
      if (i) { ctx.fillStyle = C.line; ctx.fillRect(M + 16, ry, PAGE_W - 2 * M - 32, 0.8); }
      row.labels.forEach((ln, j) => text(ln, M + 16, ry + 19 + j * 15, { weight: 500, size: 10, color: C.ink }));
      row.lines.forEach((ln, j) => text(ln, VALUE_X, ry + 19 + j * 15, { weight: 600, size: 11 }));
      ry += row.h;
    });
    y += boxH + 30;
  }

  // Test-mode watermark
  if (r.testMode) {
    ctx.save();
    ctx.translate(PAGE_W / 2, PAGE_H / 2 + 40);
    ctx.rotate(-Math.PI / 7);
    text(L.testWatermark, 0, 0, { weight: 800, size: 30, color: C.danger, align: "center" });
    ctx.restore();
  }

  // Footer
  ctx.fillStyle = C.line;
  ctx.fillRect(M, PAGE_H - 74, PAGE_W - 2 * M, 1.2);
  text(L.footer, PAGE_W / 2, PAGE_H - 52, { weight: 500, size: 9, color: C.ink, align: "center" });
  text("Mind Behind Money  ·  Money · Mindset · Business", PAGE_W / 2, PAGE_H - 36, { weight: 600, size: 9, color: C.navy, align: "center" });

  return canvas;
}

// Minimal PDF: one A4 page showing one JPEG image
function jpegToPdf(jpeg, imgW, imgH, title) {
  const enc = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let length = 0;
  const push = (part) => {
    const bytes = typeof part === "string" ? enc.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const obj = (n, body) => { offsets[n] = length; push(`${n} 0 obj\n${body}\nendobj\n`); };
  const ascii = (s) => s.replace(/[^\x20-\x7E]/g, "").replace(/[()\\]/g, "\\$&");
  const draw = `q ${PAGE_W} 0 0 ${PAGE_H} 0 0 cm /Im0 Do Q`;

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = length;
  push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  push(jpeg);
  push("\nendstream\nendobj\n");
  obj(5, `<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);
  obj(6, `<< /Title (${ascii(title)}) /Producer (Mind Behind Money) >>`);

  const xref = length;
  push(`xref\n0 7\n0000000000 65535 f \n${offsets.slice(1).map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("")}`);
  push(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: "application/pdf" });
}

/**
 * @param {object} r { labels, values: {id, issuedOn, amount}, sections: [{title, rows: [[label, value]]}], testMode }
 * @returns {Promise<Blob>} the PDF file
 */
export async function makeReceiptPdf(r) {
  const canvas = await drawReceipt(r);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  const bin = atob(dataUrl.split(",")[1]);
  const jpeg = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return jpegToPdf(jpeg, canvas.width, canvas.height, `Mind Behind Money receipt ${r.values.id}`);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
