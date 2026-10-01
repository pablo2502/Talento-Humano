/* =========================================================================
   PDF-PLANTILLA — layout único para TODOS los informes en PDF de la
   aplicación (Competencias 360° y Desempeño por objetivos, y cualquier
   otro que se agregue): encabezado con logo institucional, título, franja
   de datos clave, tablas, y pie de página. Cada módulo de informes solo
   arma el CONTENIDO (qué campos, qué filas); el layout se dibuja siempre
   igual desde aquí, así que un cambio de plantilla se hace en un solo
   lugar (RNF-11: todos los informes se descargan en PDF con formato
   consistente).
========================================================================= */

(function (global) {
  'use strict';

  const NAVY = [23, 41, 98];
  const GRAY_TEXT = [106, 111, 117];
  const GRID = [213, 216, 220];
  const DARK = [34, 34, 34];
  const FILL_NAVY_LIGHT = [221, 227, 240];
  const RED = [200, 29, 48];
  const AMBER = [180, 116, 14];
  const AZUL = [42, 84, 144];
  const LIMA = [124, 165, 70];
  const GREEN = [33, 122, 67];

  // Colores de la escala de desempeño (RF-14), de más bajo a más alto —
  // usados tanto en la leyenda de la portada como en anillos/barras.
  const ESCALA_COLORES = [RED, AMBER, AZUL, LIMA, GREEN];

  function colorParaPct(pct) {
    if (pct >= 90) return GREEN;
    if (pct >= 70) return LIMA;
    if (pct >= 50) return AZUL;
    if (pct >= 30) return AMBER;
    return RED;
  }

  const PAGE_W = 210;
  const MARGIN = 14;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  function dibujarEncabezado(doc) {
    if (global.TH_LOGO_BASE64) {
      try { doc.addImage(global.TH_LOGO_BASE64, 'PNG', MARGIN, 8, 20, 16.6); } catch (e) { /* logo opcional */ }
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text('Fundación Universitaria Empresarial', MARGIN + 24, 15);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.setTextColor(...GRAY_TEXT);
    doc.text('Talento humano', PAGE_W - MARGIN, 15, { align: 'right' });
    doc.setDrawColor(...GRID);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, 26, PAGE_W - MARGIN, 26);
  }

  function dibujarPie(doc) {
    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setDrawColor(...GRID);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, 282, PAGE_W - MARGIN, 282);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
      doc.setTextColor(...GRAY_TEXT);
      doc.text('Uniempresarial · Gestión Humana · Documento confidencial', MARGIN, 288);
      doc.text('Página ' + i, PAGE_W - MARGIN, 288, { align: 'right' });
    }
  }

  function dibujarTitulo(doc, titulo, subtitulo) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.setTextColor(...NAVY);
    doc.text(titulo, MARGIN, 38);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.setTextColor(...GRAY_TEXT);
    doc.text(subtitulo, MARGIN, 45);
    return 49;
  }

  function nuevoDoc(titulo, subtitulo) {
    const { jsPDF } = global.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    dibujarEncabezado(doc);
    const y = dibujarTitulo(doc, titulo, subtitulo);
    return { doc, y };
  }

  /**
   * Agrega una página nueva y vuelve a dibujar el encabezado (logo
   * institucional) en ella — así cada hoja del informe, no solo la
   * primera, lleva el logo. Si se pasa `tituloSeccion`, lo dibuja como
   * título de sección justo debajo del encabezado.
   */
  function nuevaPagina(doc, tituloSeccion) {
    doc.addPage();
    dibujarEncabezado(doc);
    let y = 34;
    if (tituloSeccion) y = dibujarSeccion(doc, tituloSeccion, y - 6) + 2;
    return y;
  }

  /** Deja espacio para un bloque de `alturaEstimada` mm; si no cabe antes
   *  del pie de página, salta a una página nueva (con logo) y continúa ahí. */
  function asegurarEspacio(doc, y, alturaEstimada, tituloSeccion) {
    if (y + alturaEstimada > 274) return nuevaPagina(doc, tituloSeccion);
    return y;
  }

  function dibujarCampos(doc, campos, y) {
    const colW = CONTENT_W / campos.length;
    let maxY = y;
    campos.forEach((campo, i) => {
      const x = MARGIN + colW * i;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      doc.setTextColor(...GRAY_TEXT);
      doc.text(campo.etiqueta.toUpperCase(), x, y + 6);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
      doc.setTextColor(...DARK);
      const lineas = doc.splitTextToSize(String(campo.valor), colW - 6);
      doc.text(lineas, x, y + 12);
      const bottom = y + 12 + (lineas.length - 1) * 4.6;
      if (bottom > maxY) maxY = bottom;
    });
    const lineY = maxY + 4;
    doc.setDrawColor(...GRID);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, lineY, PAGE_W - MARGIN, lineY);
    return lineY + 10;
  }

  function dibujarSeccion(doc, titulo, y) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text(titulo, MARGIN, y + 6);
    return y + 12;
  }

  function dibujarParrafo(doc, texto, y, opts) {
    const o = opts || {};
    doc.setFont('helvetica', o.italic ? 'italic' : 'normal');
    doc.setFontSize(o.fontSize || 9.5);
    doc.setTextColor(...(o.color || GRAY_TEXT));
    const lineas = doc.splitTextToSize(texto, o.maxWidth || CONTENT_W);
    doc.text(lineas, MARGIN, y);
    return y + lineas.length * 4.6 + 4;
  }

  const BOX_BORDER = [70, 70, 70];

  /**
   * Tabla genérica con encabezado en navy y filas separadas por líneas,
   * con ajuste automático de texto por columna. Con `caja: true` dibuja
   * un recuadro completo (borde exterior + divisores verticales), como
   * en la plantilla; sin ella, solo divisores horizontales (usado para
   * franjas de datos más livianas).
   * columnas: [{ titulo, ancho, align: 'left'|'right', bold, color }]
   * filas: array de arrays de valores (mismo orden que columnas)
   * Devuelve { bottom, next }: `bottom` es el borde inferior real de la
   * tabla (útil para alinear elementos junto a ella, p.ej. un gráfico);
   * `next` ya incluye el espaciado para continuar el contenido debajo.
   */
  function dibujarTabla(doc, { y, xStart, columnas, filas, caja, minAltura }) {
    const x0 = xStart || MARGIN;
    const xPos = [];
    let acc = x0;
    columnas.forEach(c => { xPos.push(acc); acc += c.ancho; });
    const total = acc - x0;
    const yTop = y - 5;
    const borderColor = caja ? BOX_BORDER : GRID;

    const PAD = 2.2;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    columnas.forEach((c, i) => {
      const align = c.align || 'left';
      doc.text(c.titulo, align === 'right' ? xPos[i] + c.ancho - PAD : xPos[i] + PAD, y, { align });
    });
    doc.setDrawColor(...(caja ? BOX_BORDER : NAVY));
    doc.setLineWidth(caja ? 0.35 : 0.5);
    doc.line(x0, y + 2, x0 + total, y + 2);
    let yy = y + 2;

    if (!filas.length) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(9.5);
      doc.setTextColor(...GRAY_TEXT);
      doc.text('Sin datos para este período.', x0 + PAD, yy + 8);
      const bottom = yy + 12;
      if (caja) dibujarCaja(doc, x0, yTop, total, bottom, xPos, columnas);
      return { bottom, next: bottom + 8 };
    }

    filas.forEach(fila => {
      const lineasPorCol = fila.map((v, i) => doc.splitTextToSize(String(v), columnas[i].ancho - PAD * 2));
      const maxLineas = Math.max(...lineasPorCol.map(l => l.length));
      const rowH = maxLineas * 4.6 + 4;
      lineasPorCol.forEach((lineas, i) => {
        const align = columnas[i].align || 'left';
        doc.setFont('helvetica', columnas[i].bold ? 'bold' : 'normal'); doc.setFontSize(9.5);
        doc.setTextColor(...(columnas[i].color || DARK));
        doc.text(lineas, align === 'right' ? xPos[i] + columnas[i].ancho - PAD : xPos[i] + PAD, yy + 6, { align });
      });
      yy += rowH;
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(caja ? 0.3 : 0.25);
      doc.line(x0, yy, x0 + total, yy);
    });

    const bottom = minAltura ? Math.max(yy, yTop + minAltura) : yy;
    if (caja) dibujarCaja(doc, x0, yTop, total, bottom, xPos, columnas);
    return { bottom, next: bottom + 8 };
  }

  function dibujarCaja(doc, x0, yTop, total, yBottom, xPos, columnas) {
    doc.setDrawColor(...BOX_BORDER);
    doc.setLineWidth(0.35);
    doc.rect(x0, yTop, total, yBottom - yTop, 'S');
    for (let i = 1; i < xPos.length; i++) {
      doc.line(xPos[i], yTop, xPos[i], yBottom);
    }
  }

  /** Dibuja solo un recuadro vacío (p.ej. para alojar un gráfico junto a una tabla). */
  function dibujarRecuadro(doc, x, yTop, w, yBottom) {
    doc.setDrawColor(...BOX_BORDER);
    doc.setLineWidth(0.35);
    doc.rect(x, yTop, w, yBottom - yTop, 'S');
  }

  function dibujarRadar(doc, items, cx, cy, radius, labelOffset, labelWidth, escalaMax) {
    const n = items.length;
    const angleStep = (2 * Math.PI) / n;
    const start = -Math.PI / 2;
    const max = escalaMax || 5;

    doc.setDrawColor(...GRID);
    doc.setLineWidth(0.2);
    for (let r = 1; r <= max; r++) {
      const rr = (radius * r) / max;
      let prev = null;
      for (let i = 0; i <= n; i++) {
        const a = start + angleStep * (i % n);
        const x = cx + rr * Math.cos(a);
        const y = cy + rr * Math.sin(a);
        if (prev) doc.line(prev[0], prev[1], x, y);
        prev = [x, y];
      }
    }

    for (let i = 0; i < n; i++) {
      const a = start + angleStep * i;
      doc.line(cx, cy, cx + radius * Math.cos(a), cy + radius * Math.sin(a));
    }

    const puntos = items.map((c, i) => {
      const a = start + angleStep * i;
      const valor = Math.max(0, Math.min(c.puntaje, max));
      const rr = radius * (valor / max);
      return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
    });

    doc.setFillColor(...FILL_NAVY_LIGHT);
    for (let i = 0; i < n; i++) {
      const p1 = puntos[i];
      const p2 = puntos[(i + 1) % n];
      doc.triangle(cx, cy, p1[0], p1[1], p2[0], p2[1], 'F');
    }

    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.6);
    for (let i = 0; i < n; i++) {
      const p1 = puntos[i];
      const p2 = puntos[(i + 1) % n];
      doc.line(p1[0], p1[1], p2[0], p2[1]);
    }

    doc.setFillColor(...NAVY);
    puntos.forEach(p => doc.circle(p[0], p[1], 1, 'F'));

    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);
    for (let i = 0; i < n; i++) {
      const a = start + angleStep * i;
      const cos = Math.cos(a);
      const lx = cx + (radius + labelOffset) * cos;
      const ly = cy + (radius + labelOffset) * Math.sin(a) + 1.5;
      const align = cos > 0.3 ? 'left' : cos < -0.3 ? 'right' : 'center';
      const maxWidth = align === 'center' ? labelWidth * 1.7 : labelWidth;
      doc.text(items[i].nombre, lx, ly, { align, maxWidth });
    }
  }

  function dibujarArco(doc, cx, cy, radius, startDeg, endDeg) {
    const steps = Math.max(2, Math.round(Math.abs(endDeg - startDeg) / 4));
    let prev = null;
    for (let i = 0; i <= steps; i++) {
      const deg = startDeg + (endDeg - startDeg) * (i / steps);
      const rad = (deg * Math.PI) / 180;
      const x = cx + radius * Math.cos(rad);
      const y = cy + radius * Math.sin(rad);
      if (prev) doc.line(prev[0], prev[1], x, y);
      prev = [x, y];
    }
  }

  /** Anillo de porcentaje (como el "Resultado Total" de la plantilla),
   *  con el número en el centro y una etiqueta debajo. */
  function dibujarAnillo(doc, cx, cy, radius, pct, opts) {
    const o = opts || {};
    const color = o.color || colorParaPct(pct);
    const grosor = o.grosor || 3.4;
    doc.setLineWidth(grosor);
    doc.setDrawColor(...GRID);
    dibujarArco(doc, cx, cy, radius, 0, 359.9);
    doc.setDrawColor(...color);
    dibujarArco(doc, cx, cy, radius, -90, -90 + 3.6 * Math.max(0, Math.min(100, pct)));
    doc.setFont('helvetica', 'bold'); doc.setFontSize(radius > 14 ? 15 : 11);
    doc.setTextColor(...color);
    doc.text(Math.round(pct * 10) / 10 + '%', cx, cy + (radius > 14 ? 2 : 1.5), { align: 'center' });
    if (o.etiqueta) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      doc.setTextColor(...GRAY_TEXT);
      doc.text(o.etiqueta, cx, cy + radius + 8, { align: 'center' });
    }
  }

  /** Barras horizontales de porcentaje por tipo de evaluador.
   *  items: [{ etiqueta, pct, color? }]. Devuelve la y siguiente. */
  function dibujarBarrasEvaluador(doc, items, x, y, width) {
    let yy = y;
    items.forEach(it => {
      const pct = it.pct === null || it.pct === undefined ? null : it.pct;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.2);
      doc.setTextColor(...GRAY_TEXT);
      doc.text(it.etiqueta, x, yy);
      const barY = yy + 1.6;
      doc.setFillColor(...GRID);
      doc.rect(x, barY, width, 3.6, 'F');
      if (pct !== null) {
        const color = it.color || colorParaPct(pct);
        const filled = (width * Math.max(0, Math.min(100, pct))) / 100;
        doc.setFillColor(...color);
        if (filled > 0.1) doc.rect(x, barY, filled, 3.6, 'F');
      }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.2);
      doc.setTextColor(...DARK);
      doc.text(pct !== null ? pct + '%' : '—', x + width + 4, barY + 3);
      yy += 9.5;
    });
    return yy;
  }

  /** Lista con viñetas, color configurable (fortalezas vs. oportunidades). */
  function dibujarBullets(doc, items, y, color) {
    let yy = y;
    doc.setTextColor(...(color || DARK));
    items.forEach(texto => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      const lineas = doc.splitTextToSize('•  ' + texto, CONTENT_W - 4);
      doc.text(lineas, MARGIN + 2, yy);
      yy += lineas.length * 4.6 + 2;
    });
    return yy + 3;
  }

  /** Radar con varias series superpuestas (p.ej. una por tipo de
   *  evaluador), en escala 0–escalaMax. series: [{ nombre, color, valores }] */
  function dibujarRadarMultiple(doc, categorias, series, cx, cy, radius, labelOffset, labelWidth, escalaMax) {
    const n = categorias.length;
    const angleStep = (2 * Math.PI) / n;
    const start = -Math.PI / 2;
    const max = escalaMax || 100;

    doc.setDrawColor(...GRID);
    doc.setLineWidth(0.2);
    for (let r = 1; r <= 5; r++) {
      const rr = (radius * r) / 5;
      let prev = null;
      for (let i = 0; i <= n; i++) {
        const a = start + angleStep * (i % n);
        const x = cx + rr * Math.cos(a);
        const y = cy + rr * Math.sin(a);
        if (prev) doc.line(prev[0], prev[1], x, y);
        prev = [x, y];
      }
    }
    for (let i = 0; i < n; i++) {
      const a = start + angleStep * i;
      doc.line(cx, cy, cx + radius * Math.cos(a), cy + radius * Math.sin(a));
    }

    series.forEach(serie => {
      const puntos = categorias.map((_, i) => {
        const a = start + angleStep * i;
        const valor = Math.max(0, Math.min(serie.valores[i] || 0, max));
        const rr = (radius * valor) / max;
        return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
      });
      doc.setDrawColor(...serie.color);
      doc.setLineWidth(0.7);
      for (let i = 0; i < n; i++) {
        const p1 = puntos[i], p2 = puntos[(i + 1) % n];
        doc.line(p1[0], p1[1], p2[0], p2[1]);
      }
      doc.setFillColor(...serie.color);
      puntos.forEach(p => doc.circle(p[0], p[1], 0.9, 'F'));
    });

    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.2);
    doc.setTextColor(60, 60, 60);
    for (let i = 0; i < n; i++) {
      const a = start + angleStep * i;
      const cos = Math.cos(a);
      const lx = cx + (radius + labelOffset) * cos;
      const ly = cy + (radius + labelOffset) * Math.sin(a) + 1.5;
      const align = cos > 0.3 ? 'left' : cos < -0.3 ? 'right' : 'center';
      const maxWidth = align === 'center' ? labelWidth * 1.7 : labelWidth;
      doc.text(categorias[i], lx, ly, { align, maxWidth });
    }
  }

  /** Leyenda horizontal de cuadritos de color + etiqueta (series de radar,
   *  bandas de la escala, etc.). items: [{ color, etiqueta }] */
  function dibujarLeyenda(doc, items, x, y) {
    let xx = x;
    items.forEach(it => {
      doc.setFillColor(...it.color);
      doc.rect(xx, y - 2.6, 3, 3, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8);
      doc.setTextColor(...DARK);
      doc.text(it.etiqueta, xx + 4.5, y);
      xx += 4.5 + doc.getTextWidth(it.etiqueta) + 7;
    });
    return y + 6;
  }

  global.PdfPlantilla = {
    NAVY, GRAY_TEXT, GRID, DARK, FILL_NAVY_LIGHT, RED, AMBER, AZUL, LIMA, GREEN, ESCALA_COLORES,
    PAGE_W, MARGIN, CONTENT_W,
    colorParaPct,
    nuevoDoc, nuevaPagina, asegurarEspacio,
    dibujarCampos, dibujarSeccion, dibujarParrafo, dibujarTabla, dibujarRadar, dibujarRadarMultiple,
    dibujarRecuadro, dibujarPie, dibujarAnillo, dibujarBarrasEvaluador, dibujarBullets, dibujarLeyenda
  };

})(window);
