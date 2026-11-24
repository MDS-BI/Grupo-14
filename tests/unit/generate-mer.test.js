// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import {
  loadModel,
  buildSvg,
  buildMarkdown,
  entitiesForView,
  relationsForView,
  layoutView,
  annotationLayout,
  escapeXml
} from '../../scripts/generate-mer.js';

const VIEWS = ['conceptual', 'logico'];
let model;
const docs = {};

function parseSvg(svg){
  return new DOMParser().parseFromString(svg, 'image/svg+xml');
}

beforeAll(() => {
  model = loadModel();
  for(const v of VIEWS) docs[v] = parseSvg(buildSvg(model, v));
});

describe('data-model.json', () => {
  it('cada FK apunta a una PK existente', () => {
    const byId = Object.fromEntries(model.entidades.map((e) => [e.id, e]));
    const fks = model.entidades.flatMap((e) => e.atributos.filter((a) => a.clave === 'FK').map((a) => ({ e, a })));
    expect(fks.length).toBeGreaterThan(0);
    for(const { e, a } of fks){
      expect(a.referencia, `${e.id}.${a.nombre} sin referencia`).toBeTruthy();
      const target = byId[a.referencia.entidad];
      expect(target, `${e.id}.${a.nombre} apunta a una entidad inexistente`).toBeTruthy();
      const pk = target.atributos.find((t) => t.nombre === a.referencia.atributo);
      expect(pk && pk.clave, `${e.id}.${a.nombre} no apunta a una PK`).toBe('PK');
    }
  });

  it('cada entidad tiene exactamente una PK', () => {
    for(const e of model.entidades){
      expect(e.atributos.filter((a) => a.clave === 'PK')).toHaveLength(1);
    }
  });

  it('las FK declaradas en las relaciones existen y apuntan al lado "1"', () => {
    for(const r of model.relaciones.filter((rel) => rel.fk)){
      const ent = model.entidades.find((e) => e.id === r.fk.entidad);
      const attr = ent.atributos.find((a) => a.nombre === r.fk.atributo);
      expect(attr.clave).toBe('FK');
      const oneSide = r.cardinalidad.origen === '1' ? r.origen : r.destino;
      expect(attr.referencia.entidad).toBe(oneSide);
    }
  });
});

describe.each(VIEWS)('MER %s (SVG)', (view) => {
  it('es XML válido', () => {
    const doc = docs[view];
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(doc.documentElement.nodeName).toBe('svg');
  });

  it('contiene cada entidad de la vista con su título y sus atributos', () => {
    const doc = docs[view];
    for(const e of entitiesForView(model, view)){
      const g = doc.querySelector(`g.entidad[data-entidad="${e.id}"]`);
      expect(g, `falta ${e.id}`).toBeTruthy();
      expect(g.querySelector('text.titulo-entidad').textContent).toBe(e.titulo.toUpperCase());
      const rows = [...g.querySelectorAll('g.atributo')];
      expect(rows[0].getAttribute('data-clave')).toBe('PK');
      const shown = e.atributos.filter((a) => a.enMer !== false);
      expect(rows).toHaveLength(shown.length);
      const fkRows = rows.filter((r) => r.getAttribute('data-clave') === 'FK');
      // Las FK son siempre las últimas filas.
      expect(rows.slice(rows.length - fkRows.length)).toEqual(fkRows);
    }
  });

  it('no dibuja entidades de otras vistas', () => {
    const ids = [...docs[view].querySelectorAll('g.entidad')].map((g) => g.getAttribute('data-entidad'));
    expect(ids.sort()).toEqual(entitiesForView(model, view).map((e) => e.id).sort());
  });

  it('refleja las cardinalidades del JSON en las etiquetas 1/N/M', () => {
    const doc = docs[view];
    const rels = relationsForView(model, view);
    expect(doc.querySelectorAll('g.relacion')).toHaveLength(rels.length);
    for(const r of rels){
      const g = doc.querySelector(`g.relacion[data-relacion="${r.id}"]`);
      expect(g, `falta relación ${r.id}`).toBeTruthy();
      expect(g.getAttribute('data-cardinalidad')).toBe(`${r.cardinalidad.origen}:${r.cardinalidad.destino}`);
      expect(g.querySelector('text.cardinalidad[data-extremo="origen"]').textContent).toBe(r.cardinalidad.origen);
      expect(g.querySelector('text.cardinalidad[data-extremo="destino"]').textContent).toBe(r.cardinalidad.destino);
      const crows = g.querySelectorAll('path.pata-gallo').length;
      const expected = [r.cardinalidad.origen, r.cardinalidad.destino].filter((c) => c !== '1').length;
      expect(crows).toBe(expected);
      const dashed = g.querySelector('path.linea').hasAttribute('stroke-dasharray');
      expect(dashed).toBe(r.estilo === 'punteada');
    }
  });

  it('las líneas de relación y las anotaciones no atraviesan cajas', () => {
    const { boxes, relations } = layoutView(model, view);
    const inside = (b, x, y) => x > b.x + 1 && x < b.x + b.w - 1 && y > b.y + 1 && y < b.y + b.h - 1;
    for(const routed of relations){
      for(let i = 0; i < routed.points.length - 1; i++){
        const p = routed.points[i];
        const q = routed.points[i + 1];
        for(const b of Object.values(boxes)){
          for(let t = 0; t <= 1; t += 0.02){
            const x = p.x + (q.x - p.x) * t;
            const y = p.y + (q.y - p.y) * t;
            expect(inside(b, x, y), `${routed.rel.id} cruza ${b.entity.id}`).toBe(false);
          }
        }
      }
      const a = annotationLayout(routed).rect;
      for(const b of Object.values(boxes)){
        const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        expect(overlap, `la anotación de ${routed.rel.id} pisa ${b.entity.id}`).toBe(false);
      }
    }
  });
});

describe('MER conceptual frente a lógico', () => {
  it('el conceptual tiene la N:M punteada y el lógico la resuelve con Línea de Detalle', () => {
    const nm = docs.conceptual.querySelector('g.relacion[data-cardinalidad="N:M"]');
    expect(nm.getAttribute('data-estilo')).toBe('punteada');
    expect(docs.logico.querySelector('g.relacion[data-cardinalidad="N:M"]')).toBeNull();
    expect(docs.logico.querySelector('g.entidad[data-entidad="lineaDetalle"]')).toBeTruthy();
    expect(docs.conceptual.querySelector('g.entidad[data-entidad="lineaDetalle"]')).toBeNull();
  });
});

describe('utilidades', () => {
  it('escapa texto para XML', () => {
    expect(escapeXml('A & B <c> "d" \'e\'')).toBe('A &amp; B &lt;c&gt; &quot;d&quot; &apos;e&apos;');
  });

  it('data-model.md generado incluye cada entidad, el diagrama Mermaid y las notas', () => {
    const md = buildMarkdown(model);
    for(const e of model.entidades) expect(md).toContain(`### ${e.titulo.toUpperCase()}`);
    expect(md).toContain('```mermaid\nerDiagram');
    expect(md).toContain('## Notas de reconciliación');
    for(const f of model.formulas) expect(md).toContain(f.expresion);
  });
});
