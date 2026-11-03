#!/usr/bin/env node
// ============================================================================
// Generador del Modelo Entidad-Relación (MER) del módulo Adquisiciones y Compras.
//
// Lee specs/001-erp-base-module/data-model.json (fuente única del modelo) y
// escribe en la misma carpeta:
//   - mer-conceptual.svg  (Proveedor, Orden de Compra, Recepción, Producto;
//                          N:M Orden–Producto punteada)
//   - mer-logico.svg      (N:M resuelta con LÍNEA DE DETALLE)
//   - data-model.md       (documentación legible generada del mismo JSON)
//
// Uso: npm run mer        (sin dependencias: solo módulos nativos de Node)
// ============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const SPEC_DIR = resolve(__dirname, '..', 'specs', '001-erp-base-module');
export const MODEL_PATH = resolve(SPEC_DIR, 'data-model.json');

// ---------------------------------------------------------------------------
// Constantes visuales
// ---------------------------------------------------------------------------
export const STYLE = Object.freeze({
  fontFamily: "Georgia, 'Times New Roman', serif",
  background: '#ffffff',
  navy: '#1b2a5c',
  boxBorder: '#3b4a63',
  boxBorderWidth: 2,
  boxRadius: 4,
  headerFill: '#c6dbf3',
  pkFill: '#d5f0d3',
  fkFill: '#f8d3d3',
  separator: '#9aa5b5',
  legendBorder: '#c9d0da',
  text: '#1f2633',
  titleSize: 44,
  titleY: 66,
  headerSize: 18,
  headerHeight: 40,
  rowSize: 14,
  rowLineHeight: 18,
  rowPadY: 7,
  cellPadX: 10,
  leftColMin: 64,
  leftColMaxRatio: 0.52,
  lineWidth: 2,
  dash: '7 6',
  cardSize: 17,
  annotationSize: 15,
  annotationLineHeight: 19,
  annotationGap: 12,
  annotationMinWidth: 100,
  crowLength: 16,
  crowSpread: 9,
  oneBarOffset: 10,
  oneBarHalf: 8,
  oneDotOffset: 20,
  oneDotRadius: 4,
  cardOffset: 34,
  legendSize: 15,
  legendMarginTop: 50,
  canvasMarginBottom: 30
});

// ---------------------------------------------------------------------------
// Utilidades de texto
// ---------------------------------------------------------------------------
export function escapeXml(value){
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Estimación de ancho para Georgia (no hay motor de fuentes en Node).
// Se usa un factor por clase de carácter, ligeramente conservador.
export function textWidth(text, size, bold = false){
  let units = 0;
  for(const ch of String(text)){
    if(' '.includes(ch)) units += 0.27;
    else if('il.,:;\'|!()[]ítjfI'.includes(ch)) units += 0.33;
    else if('mwMW—'.includes(ch)) units += 0.9;
    else if(/[A-ZÁÉÍÓÚÑ]/.test(ch)) units += 0.7;
    else if(/[0-9]/.test(ch)) units += 0.6;
    else if('→×Σ≥−–'.includes(ch)) units += 0.65;
    else units += 0.54;
  }
  return units * size * (bold ? 1.1 : 1);
}

// Parte una palabra demasiado larga en fronteras camelCase, "_" o "/".
function splitLongWord(word, maxWidth, size, bold){
  const pieces = word.split(/(?<=[a-záéíóú])(?=[A-Z])|(?<=[_/])/);
  const out = [];
  let cur = '';
  for(const p of pieces){
    if(cur && textWidth(cur + p, size, bold) > maxWidth){ out.push(cur); cur = p; }
    else cur += p;
  }
  if(cur) out.push(cur);
  return out;
}

export function wrapText(text, maxWidth, size, bold = false){
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for(const raw of words){
    const parts = textWidth(raw, size, bold) > maxWidth ? splitLongWord(raw, maxWidth, size, bold) : [raw];
    for(const w of parts){
      const candidate = cur ? `${cur} ${w}` : w;
      if(cur && textWidth(candidate, size, bold) > maxWidth){ lines.push(cur); cur = w; }
      else cur = candidate;
    }
  }
  if(cur) lines.push(cur);
  return lines;
}

const fmt = (n) => Number(n.toFixed(2));

// ---------------------------------------------------------------------------
// Modelo
// ---------------------------------------------------------------------------
export function loadModel(path = MODEL_PATH){
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function entitiesForView(model, view){
  return model.entidades.filter((e) => e.vistas.includes(view));
}

export function relationsForView(model, view){
  return model.relaciones.filter((r) => r.vistas.includes(view));
}

// Atributos dibujados: PK primero, FK al final, resto en su orden declarado.
export function merAttributes(entity){
  const shown = entity.atributos.filter((a) => a.enMer !== false);
  return [
    ...shown.filter((a) => a.clave === 'PK'),
    ...shown.filter((a) => a.clave !== 'PK' && a.clave !== 'FK'),
    ...shown.filter((a) => a.clave === 'FK')
  ];
}

// ---------------------------------------------------------------------------
// Geometría de entidades
// ---------------------------------------------------------------------------
export function layoutEntity(entity, view){
  const pos = entity.layout && entity.layout[view];
  if(!pos) throw new Error(`La entidad "${entity.id}" no declara layout para la vista "${view}"`);
  const { x, y, ancho: w } = pos;
  const S = STYLE;
  const attrs = merAttributes(entity);

  const leftLabel = (a) => (a.clave ? a.clave : a.nombre);
  const rightLabel = (a) => (a.clave ? a.nombre : (a.mer || ''));
  const isBoldRight = (a) => a.clave === 'PK';
  const isBoldLeft = (a) => Boolean(a.clave);

  const widest = Math.max(...attrs.map((a) => textWidth(leftLabel(a), S.rowSize, isBoldLeft(a))));
  const leftW = Math.min(Math.max(widest + 2 * S.cellPadX, S.leftColMin), w * S.leftColMaxRatio);
  const rightW = w - leftW;

  let cursor = y + S.headerHeight;
  const rows = attrs.map((a) => {
    const left = wrapText(leftLabel(a), leftW - 2 * S.cellPadX, S.rowSize, isBoldLeft(a));
    const right = wrapText(rightLabel(a), rightW - 2 * S.cellPadX, S.rowSize, isBoldRight(a));
    const lines = Math.max(left.length, right.length, 1);
    const h = lines * S.rowLineHeight + 2 * S.rowPadY;
    const row = { attr: a, y: cursor, h, left, right, boldLeft: isBoldLeft(a), boldRight: isBoldRight(a) };
    cursor += h;
    return row;
  });

  return { entity, x, y, w, h: cursor - y, leftW, rows };
}

export function layoutView(model, view){
  const boxes = {};
  for(const e of entitiesForView(model, view)) boxes[e.id] = layoutEntity(e, view);
  const relations = relationsForView(model, view).map((r) => routeRelation(r, boxes));
  return { boxes, relations };
}

// ---------------------------------------------------------------------------
// Trazado de relaciones (ortogonal)
// ---------------------------------------------------------------------------
const SIDE_VECTORS = {
  derecha: { x: 1, y: 0 },
  izquierda: { x: -1, y: 0 },
  abajo: { x: 0, y: 1 },
  arriba: { x: 0, y: -1 }
};

function anchor(box, side, fraction){
  const f = fraction ?? 0.5;
  switch(side){
    case 'derecha': return { x: box.x + box.w, y: box.y + f * box.h };
    case 'izquierda': return { x: box.x, y: box.y + f * box.h };
    case 'abajo': return { x: box.x + f * box.w, y: box.y + box.h };
    case 'arriba': return { x: box.x + f * box.w, y: box.y };
    default: throw new Error(`Lado de anclaje desconocido: ${side}`);
  }
}

const isHorizontalSide = (s) => s === 'derecha' || s === 'izquierda';

export function routeRelation(rel, boxes){
  const from = boxes[rel.origen];
  const to = boxes[rel.destino];
  if(!from || !to) throw new Error(`La relación "${rel.id}" referencia entidades sin caja en esta vista`);
  const t = rel.trazado;
  const a = anchor(from, t.origen, t.fraccionOrigen);
  let b;
  // Si no se fija la fracción de destino, se alinea con el origen (línea recta)
  // cuando el punto cae dentro del lado de destino.
  if(t.fraccionDestino === undefined && isHorizontalSide(t.origen) && isHorizontalSide(t.destino)
     && a.y > to.y + 10 && a.y < to.y + to.h - 10){
    b = { x: anchor(to, t.destino, 0).x, y: a.y };
  } else if(t.fraccionDestino === undefined && !isHorizontalSide(t.origen) && !isHorizontalSide(t.destino)
     && a.x > to.x + 10 && a.x < to.x + to.w - 10){
    b = { x: a.x, y: anchor(to, t.destino, 0).y };
  } else {
    b = anchor(to, t.destino, t.fraccionDestino);
  }

  let points;
  const hA = isHorizontalSide(t.origen);
  const hB = isHorizontalSide(t.destino);
  if(hA && hB){
    points = Math.abs(a.y - b.y) < 0.5 ? [a, b] : [a, { x: (a.x + b.x) / 2, y: a.y }, { x: (a.x + b.x) / 2, y: b.y }, b];
  } else if(!hA && !hB){
    points = Math.abs(a.x - b.x) < 0.5 ? [a, b] : [a, { x: a.x, y: (a.y + b.y) / 2 }, { x: b.x, y: (a.y + b.y) / 2 }, b];
  } else if(!hA && hB){
    points = [a, { x: a.x, y: b.y }, b]; // codo en L: vertical y luego horizontal
  } else {
    points = [a, { x: b.x, y: a.y }, b]; // horizontal y luego vertical
  }

  // Vectores unitarios que apuntan HACIA cada caja (para dibujar extremos).
  const inFrom = { x: -SIDE_VECTORS[t.origen].x, y: -SIDE_VECTORS[t.origen].y };
  const inTo = { x: -SIDE_VECTORS[t.destino].x, y: -SIDE_VECTORS[t.destino].y };

  return { rel, points, ends: { origen: { p: a, into: inFrom }, destino: { p: b, into: inTo } } };
}

// Rectángulos ocupados por la anotación de una relación ya trazada.
export function annotationLayout(routed){
  const S = STYLE;
  const { rel, points } = routed;
  const segs = [];
  for(let i = 0; i < points.length - 1; i++) segs.push([points[i], points[i + 1]]);
  const horiz = segs.filter(([p, q]) => Math.abs(p.y - q.y) < 0.5).sort((s1, s2) => Math.abs(s2[1].x - s2[0].x) - Math.abs(s1[1].x - s1[0].x));
  // Ancho de la anotación: el declarado en `trazado.anchoAnotacion` o, si no,
  // el del segmento horizontal más largo (menos un margen a cada lado).
  const segLen = horiz.length ? Math.abs(horiz[0][1].x - horiz[0][0].x) : 0;
  const width = (rel.trazado && rel.trazado.anchoAnotacion) || Math.max(segLen - 24, S.annotationMinWidth);
  const lines = wrapText(rel.anotacion, width, S.annotationSize);
  const blockH = lines.length * S.annotationLineHeight;
  const blockW = Math.max(...lines.map((l) => textWidth(l, S.annotationSize)));
  if(horiz.length){
    const [p, q] = horiz[0];
    const minX = Math.min(p.x, q.x);
    const maxX = Math.max(p.x, q.x);
    let cx = (minX + maxX) / 2;
    // Mantener el bloque sobre el segmento cuando es más ancho que este,
    // desplazándolo hacia el codo (lado sin caja) en lugar de invadir una caja.
    const endIsLeft = Math.abs(points[points.length - 1].x - minX) < 0.5 && points.length > 2;
    if(blockW > maxX - minX - 24){
      cx = endIsLeft ? minX + 14 + blockW / 2 : maxX - 14 - blockW / 2;
    }
    const top = p.y + S.annotationGap;
    return { lines, anchor: 'middle', x: cx, top, rect: { x: cx - blockW / 2, y: top, w: blockW, h: blockH } };
  }
  // Solo segmentos verticales: anotación a la izquierda del punto medio
  // (las etiquetas de cardinalidad van a la derecha).
  const [p, q] = segs[0];
  const midY = (p.y + q.y) / 2;
  const x = p.x - 16;
  const top = midY - blockH / 2;
  return { lines, anchor: 'end', x, top, rect: { x: x - blockW, y: top, w: blockW, h: blockH } };
}

// ---------------------------------------------------------------------------
// Render SVG
// ---------------------------------------------------------------------------
function renderEntity(box){
  const S = STYLE;
  const { entity, x, y, w, h, leftW, rows } = box;
  const clipId = `clip-${entity.id}`;
  const out = [];
  out.push(`<g class="entidad" data-entidad="${escapeXml(entity.id)}">`);
  out.push(`<clipPath id="${clipId}"><rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" rx="${S.boxRadius}"/></clipPath>`);
  out.push(`<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" rx="${S.boxRadius}" fill="#ffffff" filter="url(#sombra)"/>`);
  out.push(`<g clip-path="url(#${clipId})">`);
  out.push(`<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${S.headerHeight}" fill="${S.headerFill}"/>`);
  for(const r of rows){
    if(r.attr.clave === 'PK' || r.attr.clave === 'FK'){
      const fill = r.attr.clave === 'PK' ? S.pkFill : S.fkFill;
      out.push(`<rect x="${fmt(x)}" y="${fmt(r.y)}" width="${fmt(leftW)}" height="${fmt(r.h)}" fill="${fill}"/>`);
    }
  }
  out.push('</g>');
  // Separadores
  out.push(`<line x1="${fmt(x)}" y1="${fmt(y + S.headerHeight)}" x2="${fmt(x + w)}" y2="${fmt(y + S.headerHeight)}" stroke="${S.boxBorder}" stroke-width="1.5"/>`);
  rows.forEach((r, i) => {
    if(i > 0) out.push(`<line x1="${fmt(x)}" y1="${fmt(r.y)}" x2="${fmt(x + w)}" y2="${fmt(r.y)}" stroke="${S.separator}" stroke-width="1"/>`);
  });
  out.push(`<line x1="${fmt(x + leftW)}" y1="${fmt(y + S.headerHeight)}" x2="${fmt(x + leftW)}" y2="${fmt(y + h)}" stroke="${S.separator}" stroke-width="1"/>`);
  out.push(`<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" rx="${S.boxRadius}" fill="none" stroke="${S.boxBorder}" stroke-width="${S.boxBorderWidth}"/>`);
  // Título
  out.push(`<text class="titulo-entidad" x="${fmt(x + w / 2)}" y="${fmt(y + S.headerHeight / 2 + S.headerSize * 0.35)}" text-anchor="middle" font-size="${S.headerSize}" font-weight="bold" fill="${S.text}">${escapeXml(entity.titulo.toUpperCase())}</text>`);
  // Filas
  for(const r of rows){
    const a = r.attr;
    const attrs = `class="atributo" data-atributo="${escapeXml(a.nombre)}"${a.clave ? ` data-clave="${a.clave}"` : ''}${a.referencia ? ` data-referencia="${escapeXml(`${a.referencia.entidad}.${a.referencia.atributo}`)}"` : ''}`;
    out.push(`<g ${attrs}>`);
    const lines = Math.max(r.left.length, r.right.length, 1);
    const blockTop = r.y + (r.h - lines * S.rowLineHeight) / 2;
    const textCell = (cellLines, cx, bold, anchorAttr) => {
      if(!cellLines.length) return;
      const top = r.y + (r.h - cellLines.length * S.rowLineHeight) / 2;
      const tspans = cellLines.map((l, i) => `<tspan x="${fmt(cx)}" y="${fmt(top + (i + 0.72) * S.rowLineHeight)}">${escapeXml(l)}</tspan>`).join('');
      out.push(`<text font-size="${S.rowSize}"${bold ? ' font-weight="bold"' : ''}${anchorAttr} fill="${S.text}">${tspans}</text>`);
    };
    void blockTop;
    if(a.clave) textCell(r.left, x + leftW / 2, true, ' text-anchor="middle"');
    else textCell(r.left, x + S.cellPadX, false, '');
    textCell(r.right, x + leftW + S.cellPadX, r.boldRight, '');
    out.push('</g>');
  }
  out.push('</g>');
  return out.join('\n');
}

function renderEnd(end, kind){
  const S = STYLE;
  const { p, into } = end;
  const back = { x: -into.x, y: -into.y };
  const perp = { x: -back.y, y: back.x };
  const at = (d, s = 0) => ({ x: p.x + back.x * d + perp.x * s, y: p.y + back.y * d + perp.y * s });
  const parts = [];
  if(kind === '1'){
    const b1 = at(S.oneBarOffset, S.oneBarHalf);
    const b2 = at(S.oneBarOffset, -S.oneBarHalf);
    const dot = at(S.oneDotOffset);
    parts.push(`<line class="extremo-uno" x1="${fmt(b1.x)}" y1="${fmt(b1.y)}" x2="${fmt(b2.x)}" y2="${fmt(b2.y)}" stroke="${S.navy}" stroke-width="${S.lineWidth}"/>`);
    parts.push(`<circle cx="${fmt(dot.x)}" cy="${fmt(dot.y)}" r="${S.oneDotRadius}" fill="${S.navy}"/>`);
  } else {
    const c = at(S.crowLength);
    const t1 = at(0, S.crowSpread);
    const t2 = at(0, -S.crowSpread);
    parts.push(`<path class="pata-gallo" d="M${fmt(t1.x)},${fmt(t1.y)} L${fmt(c.x)},${fmt(c.y)} L${fmt(t2.x)},${fmt(t2.y)} M${fmt(c.x)},${fmt(c.y)} L${fmt(p.x)},${fmt(p.y)}" fill="none" stroke="${S.navy}" stroke-width="${S.lineWidth}"/>`);
  }
  return parts.join('\n');
}

function cardinalityLabel(end, text, which){
  const S = STYLE;
  const { p, into } = end;
  const back = { x: -into.x, y: -into.y };
  const base = { x: p.x + back.x * S.cardOffset, y: p.y + back.y * S.cardOffset };
  const horizontal = Math.abs(into.x) > 0;
  const x = horizontal ? base.x : base.x + 12;
  const y = horizontal ? base.y - 9 : base.y + S.cardSize * 0.35;
  const anchorAttr = horizontal ? 'middle' : 'start';
  return `<text class="cardinalidad" data-extremo="${which}" x="${fmt(x)}" y="${fmt(y)}" text-anchor="${anchorAttr}" font-size="${S.cardSize}" font-weight="bold" fill="${S.navy}">${escapeXml(text)}</text>`;
}

function renderRelation(routed){
  const S = STYLE;
  const { rel, points, ends } = routed;
  const d = points.map((pt, i) => `${i ? 'L' : 'M'}${fmt(pt.x)},${fmt(pt.y)}`).join(' ');
  const dashed = rel.estilo === 'punteada';
  const card = `${rel.cardinalidad.origen}:${rel.cardinalidad.destino}`;
  const out = [`<g class="relacion" data-relacion="${escapeXml(rel.id)}" data-origen="${escapeXml(rel.origen)}" data-destino="${escapeXml(rel.destino)}" data-cardinalidad="${card}" data-estilo="${escapeXml(rel.estilo)}">`];
  out.push(`<path class="linea" d="${d}" fill="none" stroke="${S.navy}" stroke-width="${S.lineWidth}"${dashed ? ` stroke-dasharray="${S.dash}"` : ''}/>`);
  out.push(renderEnd(ends.origen, rel.cardinalidad.origen));
  out.push(renderEnd(ends.destino, rel.cardinalidad.destino));
  out.push(cardinalityLabel(ends.origen, rel.cardinalidad.origen, 'origen'));
  out.push(cardinalityLabel(ends.destino, rel.cardinalidad.destino, 'destino'));
  const ann = annotationLayout(routed);
  const tspans = ann.lines.map((l, i) => `<tspan x="${fmt(ann.x)}" y="${fmt(ann.top + (i + 0.78) * S.annotationLineHeight)}">${escapeXml(l)}</tspan>`).join('');
  out.push(`<text class="anotacion" text-anchor="${ann.anchor}" font-size="${S.annotationSize}" fill="${S.navy}">${tspans}</text>`);
  out.push('</g>');
  return out.join('\n');
}

function renderLegend(centerX, top){
  const S = STYLE;
  const badgeW = 34;
  const badgeH = 22;
  const gap = 8;
  const t1 = '= clave primaria';
  const sep = '|';
  const t2 = '= clave foránea';
  const w1 = textWidth(t1, S.legendSize);
  const w2 = textWidth(t2, S.legendSize);
  const ws = textWidth(sep, S.legendSize);
  const inner = badgeW + gap + w1 + 18 + ws + 18 + badgeW + gap + w2;
  const padX = 18;
  const boxW = inner + 2 * padX;
  const boxH = 40;
  const x0 = centerX - boxW / 2;
  const cy = top + boxH / 2;
  let cx = x0 + padX;
  const parts = [`<g class="leyenda">`];
  parts.push(`<rect x="${fmt(x0)}" y="${fmt(top)}" width="${fmt(boxW)}" height="${boxH}" rx="8" fill="#ffffff" stroke="${S.legendBorder}" stroke-width="1.5"/>`);
  const badge = (label, fill) => {
    parts.push(`<rect x="${fmt(cx)}" y="${fmt(cy - badgeH / 2)}" width="${badgeW}" height="${badgeH}" rx="3" fill="${fill}" stroke="${S.boxBorder}" stroke-width="1"/>`);
    parts.push(`<text x="${fmt(cx + badgeW / 2)}" y="${fmt(cy + 5)}" text-anchor="middle" font-size="14" font-weight="bold" fill="${S.text}">${label}</text>`);
    cx += badgeW + gap;
  };
  const label = (txt, w) => {
    parts.push(`<text x="${fmt(cx)}" y="${fmt(cy + 5)}" font-size="${S.legendSize}" fill="${S.text}">${escapeXml(txt)}</text>`);
    cx += w;
  };
  badge('PK', S.pkFill); label(t1, w1);
  cx += 18; label(sep, ws); cx += 18;
  badge('FK', S.fkFill); label(t2, w2);
  parts.push('</g>');
  return { svg: parts.join('\n'), height: boxH };
}

export function buildSvg(model, view){
  const S = STYLE;
  const cfg = model.vistas[view];
  if(!cfg) throw new Error(`Vista desconocida: ${view}`);
  const width = cfg.ancho;
  const { boxes, relations } = layoutView(model, view);

  const annRects = relations.map((r) => annotationLayout(r).rect);
  const contentBottom = Math.max(
    ...Object.values(boxes).map((b) => b.y + b.h),
    ...annRects.map((r) => r.y + r.h)
  );
  const legendTop = contentBottom + S.legendMarginTop;
  const legend = renderLegend(width / 2, legendTop);
  const height = Math.ceil(Math.max(cfg.altoMinimo || 0, legendTop + legend.height + S.canvasMarginBottom));

  const titleSize = Math.min(S.titleSize, (width - 60) / (textWidth(cfg.titulo, 1, true)));

  const parts = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${escapeXml(S.fontFamily)}" data-vista="${view}">`);
  parts.push(`<title>${escapeXml(cfg.titulo)}</title>`);
  parts.push('<defs><filter id="sombra" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#1b2a5c" flood-opacity="0.12"/></filter></defs>');
  parts.push(`<rect width="100%" height="100%" fill="${S.background}"/>`);
  parts.push(`<text class="titulo" x="${width / 2}" y="${S.titleY}" text-anchor="middle" font-size="${fmt(titleSize)}" font-weight="bold" fill="${S.navy}">${escapeXml(cfg.titulo)}</text>`);
  // Relaciones primero para que las cajas queden por encima de los extremos.
  for(const r of relations) parts.push(renderRelation(r));
  for(const b of Object.values(boxes)) parts.push(renderEntity(b));
  parts.push(legend.svg);
  parts.push('</svg>');
  return parts.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Render Markdown (data-model.md)
// ---------------------------------------------------------------------------
const md = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

function mermaidName(text){
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function mermaidEnd(max, participation, side){
  const many = max !== '1';
  const optional = participation === 'opcional';
  if(side === 'left') return many ? (optional ? '}o' : '}|') : (optional ? '|o' : '||');
  return many ? (optional ? 'o{' : '|{') : (optional ? 'o|' : '||');
}

export function buildMermaid(model, view = 'logico'){
  const lines = ['erDiagram'];
  const byId = Object.fromEntries(model.entidades.map((e) => [e.id, e]));
  for(const r of relationsForView(model, view)){
    const a = mermaidName(byId[r.origen].titulo).toUpperCase();
    const b = mermaidName(byId[r.destino].titulo).toUpperCase();
    lines.push(`  ${a} ${mermaidEnd(r.cardinalidad.origen, r.participacion.origen, 'left')}--${mermaidEnd(r.cardinalidad.destino, r.participacion.destino, 'right')} ${b} : "${r.verbo}"`);
  }
  for(const e of entitiesForView(model, view)){
    lines.push(`  ${mermaidName(e.titulo).toUpperCase()} {`);
    for(const a of merAttributes(e)){
      const type = (a.tipo.match(/[a-z]+/i) || ['string'])[0];
      const key = a.clave ? ` ${a.clave}` : '';
      const comment = (a.mer || '').replace(/"/g, "'");
      lines.push(`    ${type} ${mermaidName(a.nombre)}${key}${comment ? ` "${comment}"` : ''}`);
    }
    lines.push('  }');
  }
  return lines.join('\n');
}

export function buildMarkdown(model){
  const byId = Object.fromEntries(model.entidades.map((e) => [e.id, e]));
  const title = (id) => byId[id].titulo.toUpperCase();
  const out = [];
  out.push(`# Modelo de Datos: Módulo ${model.modulo}`);
  out.push('');
  out.push('> **Archivo generado** por `npm run mer` (`scripts/generate-mer.js`) a partir de [`data-model.json`](data-model.json), que es la fuente única del modelo. No lo edites a mano: cambia el JSON y vuelve a generar.');
  out.push('');
  out.push(`Fuentes: ${model.fuentes.map((f) => `\`${f}\``).join(', ')}. Ante contradicciones prevalece \`plan.md\` (ver [Notas de reconciliación](#notas-de-reconciliación)).`);
  out.push('');
  out.push('## Diagramas');
  out.push('');
  out.push('| MER conceptual | MER lógico |');
  out.push('|---|---|');
  out.push(`| [![MER conceptual](${model.vistas.conceptual.archivo})](${model.vistas.conceptual.archivo}) | [![MER lógico](${model.vistas.logico.archivo})](${model.vistas.logico.archivo}) |`);
  out.push('');
  out.push('- **Conceptual**: Proveedor, Orden de Compra, Recepción y Producto; la relación Orden–Producto N:M se dibuja punteada.');
  out.push('- **Lógico**: la N:M se resuelve con la entidad intermedia **Línea de Detalle** (dos relaciones 1:N).');
  out.push('');
  out.push('### Vista rápida (Mermaid, modelo lógico)');
  out.push('');
  out.push('```mermaid');
  out.push(buildMermaid(model, 'logico'));
  out.push('```');
  out.push('');
  out.push('## Entidades');
  out.push('');
  out.push('Columnas: **Obligatorio** = Sí / No / Calculado (nunca lo escribe el usuario). **MER** = ✓ si el atributo se dibuja en los diagramas; los demás existen en el código pero se omiten para mantener el MER legible.');
  out.push('');
  for(const e of model.entidades){
    out.push(`### ${e.titulo.toUpperCase()}${e.vistas.includes('conceptual') ? '' : ' (solo MER lógico)'}`);
    out.push('');
    out.push(`${e.descripcion}`);
    out.push('');
    out.push(`*Implementación*: ${e.implementacion}.`);
    out.push('');
    out.push('| Campo | Campo en código | Tipo | Obligatorio | PK/FK | Descripción / ejemplo | Regla de validación | MER |');
    out.push('|---|---|---|---|---|---|---|---|');
    for(const a of e.atributos){
      const oblig = a.calculado ? 'Calculado' : (a.obligatorio ? 'Sí' : 'No');
      const key = a.clave === 'FK' && a.referencia ? `FK → ${title(a.referencia.entidad)}.${a.referencia.atributo}` : (a.clave || '');
      const desc = a.mer && a.mer !== a.descripcion && !a.mer.startsWith('→') ? `${a.descripcion} Ej./valores: ${a.mer}` : a.descripcion;
      const code = a.campoCodigo ? `\`${a.campoCodigo}\`` : '—';
      out.push(`| \`${md(a.nombre)}\` | ${md(code)} | ${md(a.tipo)} | ${oblig} | ${md(key)} | ${md(desc)} | ${md(a.validacion)} | ${a.enMer === false ? '—' : '✓'} |`);
    }
    out.push('');
  }
  out.push('## Relaciones');
  out.push('');
  out.push('| Origen | Destino | Cardinalidad | Participación (origen / destino) | Vista | Implementación | Descripción |');
  out.push('|---|---|---|---|---|---|---|');
  for(const r of model.relaciones){
    const card = `${r.cardinalidad.origen}:${r.cardinalidad.destino}`;
    const impl = r.fk ? `FK \`${r.fk.atributo}\` en ${title(r.fk.entidad)}` : 'Conceptual (sin FK); se resuelve con LÍNEA DE DETALLE';
    const vistas = r.vistas.map((v) => (v === 'logico' ? 'lógico' : v)).join(', ');
    out.push(`| ${title(r.origen)} | ${title(r.destino)} | ${card}${r.estilo === 'punteada' ? ' (punteada)' : ''} | ${r.participacion.origen} / ${r.participacion.destino} | ${vistas} | ${md(impl)} | ${md(r.anotacion)} |`);
  }
  out.push('');
  out.push('Integridad referencial: al eliminar un PROVEEDOR se eliminan los documentos que referencian su `entity_id` (cascada del storage). Las líneas de detalle viven dentro de su documento y desaparecen con él.');
  out.push('');
  const lc = model.cicloDeVida;
  out.push(`## Ciclo de vida de estados (${title(lc.entidad)}.${lc.atributo})`);
  out.push('');
  out.push('| Estado actual | Transiciones permitidas |');
  out.push('|---|---|');
  for(const s of lc.estados){
    const next = lc.transiciones[s] || [];
    out.push(`| ${s} | ${next.length ? next.join(', ') : '*(fin)*'} |`);
  }
  out.push('');
  out.push('```mermaid');
  out.push('stateDiagram-v2');
  out.push(`  [*] --> ${mermaidName(lc.estados[0])}`);
  for(const s of lc.estados){
    const next = lc.transiciones[s] || [];
    if(!next.length) out.push(`  ${mermaidName(s)} --> [*]`);
    for(const n of next) out.push(`  ${mermaidName(s)} --> ${mermaidName(n)}`);
  }
  out.push('```');
  out.push('');
  out.push(lc.nota);
  out.push('');
  out.push('## Fórmulas de totales');
  out.push('');
  out.push('| Campo | Fórmula | Helper (`src/module-config.js`) |');
  out.push('|---|---|---|');
  for(const f of model.formulas) out.push(`| \`${f.campo}\` | \`${md(f.expresion)}\` | \`${f.helper}\` |`);
  out.push('');
  out.push(model.notaFormulas);
  out.push('');
  const mc = model.configuracionModulo;
  out.push('## Configuración del módulo (ModuleConfig)');
  out.push('');
  out.push(mc.descripcion);
  out.push('');
  out.push('| Campo | Tipo | Descripción | Restricciones |');
  out.push('|---|---|---|---|');
  for(const c of mc.campos) out.push(`| \`${c.nombre}\` | ${c.tipo} | ${md(c.descripcion)} | ${md(c.restricciones)} |`);
  out.push('');
  for(const r of mc.reglas) out.push(`- ${r}`);
  out.push('');
  out.push('## Notas de reconciliación');
  out.push('');
  model.notasReconciliacion.forEach((n, i) => out.push(`${i + 1}. **${n.tema}.** ${n.detalle}`));
  out.push('');
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
export function generateAll(model = loadModel()){
  const written = [];
  for(const view of Object.keys(model.vistas)){
    const file = resolve(SPEC_DIR, model.vistas[view].archivo);
    writeFileSync(file, buildSvg(model, view), 'utf8');
    written.push(file);
  }
  const mdFile = resolve(SPEC_DIR, 'data-model.md');
  writeFileSync(mdFile, buildMarkdown(model), 'utf8');
  written.push(mdFile);
  return written;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if(invokedDirectly){
  try {
    for(const f of generateAll()) console.log(`✔ ${f}`);
  } catch(err){
    console.error(`✖ ${err.message}`);
    process.exit(1);
  }
}
