import type { VenueDocument } from "@openvenue/scene-schema";
import { planScene, type PlanScene } from "../plan/model";

const PNG_SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function boundsOf(scene: PlanScene): Bounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const point of scene.points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, maxX: 10, minZ: 0, maxZ: 8 };
  }
  const pad = 1;
  return { minX: minX - pad, maxX: maxX + pad, minZ: minZ - pad, maxZ: maxZ + pad };
}

function xml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => {
    if (char === "&") {
      return "&amp;";
    }
    if (char === "<") {
      return "&lt;";
    }
    if (char === ">") {
      return "&gt;";
    }
    return "&quot;";
  });
}

function points(values: readonly { x: number; z: number }[]): string {
  return values.map((point) => `${point.x.toFixed(3)},${point.z.toFixed(3)}`).join(" ");
}

/** Floor plan as SVG, with +Z up the page. */
export function planSvg(document: VenueDocument): string {
  const scene = planScene(document);
  const bounds = boundsOf(scene);
  const ppm = 24;
  const width = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) * ppm));
  const height = Math.max(1, Math.ceil((bounds.maxZ - bounds.minZ) * ppm));
  const room = scene.rooms
    .map((polygon) => `<polygon fill="#166534" points="${points(polygon.points)}" />`)
    .join("");
  const zone = scene.zones
    .map(
      (polygon) =>
        `<polygon fill="${xml(polygon.color ?? "#0f766e")}" fill-opacity="0.35" points="${points(polygon.points)}" />`,
    )
    .join("");
  const wall = scene.walls
    .map(
      (item) =>
        `<line x1="${item.start.x.toFixed(3)}" y1="${item.start.z.toFixed(3)}" x2="${item.end.x.toFixed(3)}" y2="${item.end.z.toFixed(3)}" stroke="#18181b" stroke-width="${item.thickness.toFixed(3)}" stroke-linecap="square" />`,
    )
    .join("");
  const opening = scene.openings
    .map(
      (item) =>
        `<line x1="${item.start.x.toFixed(3)}" y1="${item.start.z.toFixed(3)}" x2="${item.end.x.toFixed(3)}" y2="${item.end.z.toFixed(3)}" stroke="#166534" stroke-width="0.28" />`,
    )
    .join("");
  const furniture = scene.objects
    .map(
      (item) =>
        `<polygon fill="#e7e5e4" stroke="#27272a" stroke-width="0.02" points="${points(item.points)}" />`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>${xml(document.venue.name)}</title>
  <g transform="translate(0 ${height}) scale(${ppm} ${-ppm}) translate(${(-bounds.minX).toFixed(3)} ${(-bounds.minZ).toFixed(3)})">
    <rect x="${bounds.minX.toFixed(3)}" y="${bounds.minZ.toFixed(3)}" width="${(bounds.maxX - bounds.minX).toFixed(3)}" height="${(bounds.maxZ - bounds.minZ).toFixed(3)}" fill="#f4f4f5" />
    ${room}${zone}${wall}${opening}${furniture}
  </g>
</svg>
`;
}

function pdfText(value: string): string {
  return value.replace(/[()\\]/g, (char) => `\\${char}`).replace(/[^\x20-\x7e]/g, "?");
}

function pathOf(
  values: readonly { x: number; z: number }[],
  map: (x: number, z: number) => string,
): string {
  return values
    .map((point, index) => `${map(point.x, point.z)} ${index === 0 ? "m" : "l"}`)
    .join(" ");
}

/** One-page vector floor plan. */
export function planPdf(document: VenueDocument): Uint8Array {
  const scene = planScene(document);
  const bounds = boundsOf(scene);
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 36;
  const spanX = Math.max(bounds.maxX - bounds.minX, 1);
  const spanZ = Math.max(bounds.maxZ - bounds.minZ, 1);
  const scale = Math.min((pageWidth - margin * 2) / spanX, (pageHeight - margin * 2 - 24) / spanZ);
  const map = (x: number, z: number) =>
    `${(margin + (x - bounds.minX) * scale).toFixed(2)} ${(margin + (z - bounds.minZ) * scale).toFixed(2)}`;
  const commands = [
    "0.96 0.96 0.96 rg",
    `${margin.toFixed(2)} ${margin.toFixed(2)} ${(spanX * scale).toFixed(2)} ${(spanZ * scale).toFixed(2)} re f`,
    ...scene.rooms.map((room) => `0.09 0.40 0.20 rg ${pathOf(room.points, map)} h f`),
    ...scene.zones.map((zone) => `0.06 0.46 0.43 rg ${pathOf(zone.points, map)} h f`),
    ...scene.walls.map(
      (wall) =>
        `${Math.max(wall.thickness * scale, 0.6).toFixed(2)} w 0.09 0.09 0.11 RG ${map(wall.start.x, wall.start.z)} m ${map(wall.end.x, wall.end.z)} l S`,
    ),
    ...scene.objects.map(
      (object) => `0.91 0.90 0.89 rg 0.15 0.15 0.16 RG 0.4 w ${pathOf(object.points, map)} h B`,
    ),
    "BT /F1 14 Tf 36 560 Td",
    `(${pdfText(document.venue.name)}) Tj ET`,
  ];
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(new TextEncoder().encode(body).length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const startxref = new TextEncoder().encode(body).length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    xref += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  body += `${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
  return new TextEncoder().encode(body);
}

function fillPolygon(
  pixels: Uint8Array,
  width: number,
  height: number,
  polygon: readonly { x: number; y: number }[],
  color: readonly [number, number, number],
) {
  if (polygon.length < 3) {
    return;
  }
  let minY = height;
  let maxY = 0;
  for (const point of polygon) {
    minY = Math.min(minY, Math.floor(point.y));
    maxY = Math.max(maxY, Math.ceil(point.y));
  }
  minY = Math.max(0, minY);
  maxY = Math.min(height - 1, maxY);
  for (let y = minY; y <= maxY; y += 1) {
    const crossings: number[] = [];
    for (let index = 0; index < polygon.length; index += 1) {
      const start = polygon[index];
      const end = polygon[(index + 1) % polygon.length];
      if (
        !start ||
        !end ||
        start.y === end.y ||
        (start.y > y && end.y > y) ||
        (start.y < y && end.y < y)
      ) {
        continue;
      }
      const t = (y + 0.5 - start.y) / (end.y - start.y);
      if (t >= 0 && t < 1) {
        crossings.push(start.x + t * (end.x - start.x));
      }
    }
    crossings.sort((a, b) => a - b);
    for (let pair = 0; pair + 1 < crossings.length; pair += 2) {
      const left = Math.max(0, Math.ceil(crossings[pair] ?? 0));
      const right = Math.min(width - 1, Math.floor(crossings[pair + 1] ?? 0));
      for (let x = left; x <= right; x += 1) {
        const offset = (y * width + x) * 3;
        pixels[offset] = color[0];
        pixels[offset + 1] = color[1];
        pixels[offset + 2] = color[2];
      }
    }
  }
}

function stroke(
  pixels: Uint8Array,
  width: number,
  height: number,
  start: { x: number; y: number },
  end: { x: number; y: number },
  thickness: number,
  color: readonly [number, number, number],
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = (-dy / length) * (thickness / 2);
  const ny = (dx / length) * (thickness / 2);
  fillPolygon(
    pixels,
    width,
    height,
    [
      { x: start.x + nx, y: start.y + ny },
      { x: end.x + nx, y: end.y + ny },
      { x: end.x - nx, y: end.y - ny },
      { x: start.x - nx, y: start.y - ny },
    ],
    color,
  );
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = (crc & 1) === 1 ? 0xedb88320 : 0;
      crc = (crc >>> 1) ^ mask;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function adler32(data: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const byte of data) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function zlibStore(data: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = [Uint8Array.from([0x78, 0x01])];
  for (let offset = 0; offset < data.length; offset += 65535) {
    const block = data.subarray(offset, offset + 65535);
    const last = offset + block.length >= data.length;
    const header = new Uint8Array(5 + block.length);
    header[0] = last ? 1 : 0;
    header[1] = block.length & 0xff;
    header[2] = (block.length >> 8) & 0xff;
    const complement = ~block.length & 0xffff;
    header[3] = complement & 0xff;
    header[4] = (complement >> 8) & 0xff;
    header.set(block, 5);
    chunks.push(header);
  }
  const checksum = adler32(data);
  const tail = new Uint8Array(4);
  new DataView(tail.buffer).setUint32(0, checksum);
  chunks.push(tail);
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of chunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return out;
}

function encodePng(width: number, height: number, rgb: Uint8Array): Uint8Array {
  const scan = new Uint8Array(height * (1 + width * 3));
  for (let y = 0; y < height; y += 1) {
    const row = y * (1 + width * 3);
    scan[row] = 0;
    scan.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), row + 1);
  }
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header[8] = 8;
  header[9] = 2;
  const parts = [
    PNG_SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlibStore(scan)),
    pngChunk("IEND", new Uint8Array()),
  ];
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const part of parts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}

/** Raster floor plan. The same drawing as the SVG, packed as a PNG. */
export function planPng(document: VenueDocument): Uint8Array {
  const scene = planScene(document);
  const bounds = boundsOf(scene);
  const ppm = 16;
  const width = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) * ppm));
  const height = Math.max(1, Math.ceil((bounds.maxZ - bounds.minZ) * ppm));
  const pixels = new Uint8Array(width * height * 3);
  pixels.fill(244);
  const project = (point: { x: number; z: number }) => ({
    x: (point.x - bounds.minX) * ppm,
    y: (bounds.maxZ - point.z) * ppm,
  });
  for (const room of scene.rooms) {
    fillPolygon(pixels, width, height, room.points.map(project), [22, 101, 52]);
  }
  for (const wall of scene.walls) {
    stroke(
      pixels,
      width,
      height,
      project(wall.start),
      project(wall.end),
      Math.max(wall.thickness * ppm, 2),
      [24, 24, 27],
    );
  }
  for (const object of scene.objects) {
    fillPolygon(pixels, width, height, object.points.map(project), [231, 229, 228]);
  }
  return encodePng(width, height, pixels);
}
