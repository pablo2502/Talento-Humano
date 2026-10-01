/* =========================================================================
   MODULES.informes — Informes individual, de equipo, por área y general
   (RF-19 a RF-21). Se descargan en PDF (RNF-11) usando la plantilla común
   de PdfPlantilla (ver js/pdf-plantilla.js): encabezado con logo
   institucional, franja de datos, tabla de competencias + radar, y plan de
   desarrollo. Lo único que cambia según el tipo de informe es el contenido
   armado en informeIndividual/informeRoster — el layout es único y
   compartido con Desempeño por objetivos (modules/desempeno.js).
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  const P = window.PdfPlantilla;

  /* -----------------------------------------------------------------
     Cálculo de puntajes promedio por competencia (excluye SST, que es
     binario Sí/No y no aplica a una escala 1-5) para uno o varios
     colaboradores en un período — misma lógica que el backend.
  ----------------------------------------------------------------- */
  function puntajesPorCompetencia(colaboradorIds, periodoId) {
    const ids = Array.isArray(colaboradorIds) ? colaboradorIds : [colaboradorIds];
    const acumulado = {};
    ids.forEach(cid => {
      TH.DB.evaluacionesDe(cid, periodoId).forEach(ev => {
        const indicadores = (ev.calificaciones && ev.calificaciones.indicadores) || {};
        Object.keys(indicadores).forEach(id => {
          const v = indicadores[id];
          if (v === 'NO' || v === null || v === undefined) return;
          const n = Number(v);
          if (Number.isNaN(n)) return;
          const info = TH.DB.indicadorInfo(id);
          if (!info || info.competenciaTipo === 'sst') return;
          const key = info.competenciaNombre;
          if (!acumulado[key]) acumulado[key] = { suma: 0, n: 0 };
          acumulado[key].suma += n;
          acumulado[key].n += 1;
        });
      });
    });
    return Object.keys(acumulado).map(nombre => ({
      nombre,
      puntaje: TH.round1(acumulado[nombre].suma / acumulado[nombre].n)
    }));
  }

  /* -----------------------------------------------------------------
     DETALLE COMPLETO POR COMPETENCIA E INDICADOR (para el informe
     individual detallado, inspirado en el reporte HR Suite V4 2024):
     para cada indicador calcula el resultado ponderado por tipo de
     evaluador usando los MISMOS pesos que TH.DB.consolidar(), así el
     "Resultado" de cada comportamiento es consistente con el resultado
     oficial de la evaluación (RNF-14).
  ----------------------------------------------------------------- */
  const TIPOS_PESO = [['AUTO', 'auto'], ['JEFE', 'jefe'], ['PAR', 'par'], ['SUBALTERNO', 'subalterno']];
  const ETIQUETA_TIPO = { AUTO: 'Autoevaluación', JEFE: 'Jefe', PAR: 'Par', SUBALTERNO: 'Subalterno' };

  function detalleColaborador(colaboradorId, periodoId) {
    const colaborador = TH.DB.usuario(colaboradorId);
    const pesos = TH.PESOS[colaborador.tipoCargo] || {};
    const evaluaciones = TH.DB.evaluacionesDe(colaboradorId, periodoId);

    const porTipo = { AUTO: [], JEFE: [], PAR: [], SUBALTERNO: [] };
    let sstEval = null;
    evaluaciones.forEach(e => {
      if (e.tipoEvaluador === 'SST') { sstEval = e; return; }
      if (porTipo[e.tipoEvaluador]) porTipo[e.tipoEvaluador].push(e);
    });

    function promedioIndicador(indicadorId, lista) {
      const valores = [];
      lista.forEach(e => {
        const v = e.calificaciones && e.calificaciones.indicadores ? e.calificaciones.indicadores[indicadorId] : undefined;
        if (v === undefined || v === null || v === 'NO') return;
        const n = Number(v);
        if (!Number.isNaN(n)) valores.push(n);
      });
      return valores.length ? TH.promedio(valores) : null;
    }

    const tiposActivos = TIPOS_PESO.filter(([, key]) => pesos[key]);

    const competencias = TH.DB.competenciasAplicables(colaborador.tipoCargo).map(comp => {
      const indicadores = comp.indicadores.map(ind => {
        const porEvaluador = {};
        let weightedSum = 0, usedWeight = 0;
        tiposActivos.forEach(([tipo, key]) => {
          const avg = promedioIndicador(ind.id, porTipo[tipo]);
          if (avg === null) return;
          porEvaluador[tipo] = TH.round1((avg / 5) * 100);
          weightedSum += pesos[key] * avg;
          usedWeight += pesos[key];
        });
        const resultado = usedWeight ? TH.round1(((weightedSum / usedWeight) / 5) * 100) : null;
        return { id: ind.id, nombre: ind.nombre, porEvaluador, resultado };
      });

      const conDatos = indicadores.filter(i => i.resultado !== null);
      const scoreTotal = conDatos.length ? TH.round1(TH.promedio(conDatos.map(i => i.resultado))) : null;

      const porEvaluadorComp = {};
      tiposActivos.forEach(([tipo]) => {
        const vals = indicadores.map(i => i.porEvaluador[tipo]).filter(v => v !== undefined);
        if (vals.length) porEvaluadorComp[tipo] = TH.round1(TH.promedio(vals));
      });

      return { id: comp.id, nombre: comp.nombre, tipo: comp.tipo, scoreTotal, porEvaluador: porEvaluadorComp, indicadores };
    }).filter(c => c.scoreTotal !== null);

    let sstDetalle = null;
    if (sstEval) {
      const r = TH.calcResultado(sstEval);
      if (r) {
        const indicadores = Object.keys(sstEval.calificaciones.indicadores || {}).map(id => {
          const v = sstEval.calificaciones.indicadores[id];
          if (v === 'NO' || v === null || v === undefined) return null;
          const info = TH.DB.indicadorInfo(id);
          const resultado = TH.round1((Number(v) / 5) * 100);
          return { id, nombre: info ? info.indicadorNombre : id, resultado };
        }).filter(Boolean);
        sstDetalle = { scoreTotal: r.pct, indicadores };
      }
    }

    return { colaborador, tiposActivos, competencias, sstDetalle };
  }

  function sumarDias(fechaISO, dias) {
    const d = new Date(fechaISO + 'T00:00:00');
    d.setDate(d.getDate() + dias);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  function planIndividual(colaborador, competencias, periodo) {
    if (!competencias.length) return [];
    const masBaja = competencias.reduce((a, b) => (b.puntaje < a.puntaje ? b : a));
    const base = periodo.fechaFin;
    return [
      { accion: `Fortalecer la competencia "${masBaja.nombre}"`, responsable: colaborador.nombre, fecha: sumarDias(base, 30) },
      { accion: 'Acompañamiento y mentoría con el jefe inmediato', responsable: 'Jefe inmediato', fecha: sumarDias(base, 60) },
      { accion: 'Curso o actividad de formación para el próximo periodo', responsable: 'Gestión Humana', fecha: sumarDias(base, 90) }
    ];
  }

  function planAgregado(competencias, periodo, responsablePrincipal) {
    if (!competencias.length) return [];
    const base = periodo.fechaFin;
    const masBajas = competencias.slice().sort((a, b) => a.puntaje - b.puntaje).slice(0, 2);
    const plan = masBajas.map(c => ({
      accion: `Reforzar la competencia "${c.nombre}" en el equipo`,
      responsable: responsablePrincipal,
      fecha: sumarDias(base, 45)
    }));
    plan.push({ accion: 'Plan de formación para el próximo periodo', responsable: 'Gestión Humana', fecha: sumarDias(base, 90) });
    return plan;
  }

  function dibujarCompetencias(doc, competencias, y) {
    if (!competencias.length) {
      return P.dibujarParrafo(doc, 'No se registran calificaciones de competencias para este periodo.', y + 4, { italic: true });
    }

    const conRadar = competencias.length >= 3;

    if (!conRadar) {
      const { next } = P.dibujarTabla(doc, {
        y: y + 5,
        columnas: [
          { titulo: 'Competencia', ancho: P.CONTENT_W - 26, align: 'left' },
          { titulo: 'Puntaje', ancho: 26, align: 'right', bold: true }
        ],
        filas: competencias.map(c => [c.nombre, c.puntaje.toFixed(1)]),
        caja: true
      });
      return next;
    }

    // Radar a la izquierda, tabla de competencias a la derecha, ambos
    // encerrados en recuadros de la misma altura (como en la plantilla).
    const radarW = 78;
    const tablaW = P.CONTENT_W - radarW;
    const yTop = y;
    const labelOffset = 4;
    const labelWidth = 16;
    const radioDeseado = 22;
    const alturaMinima = 2 * (radioDeseado + labelOffset + labelWidth);

    const { bottom, next } = P.dibujarTabla(doc, {
      y: y + 5,
      xStart: P.MARGIN + radarW,
      columnas: [
        { titulo: 'Competencia', ancho: tablaW - 26, align: 'left' },
        { titulo: 'Puntaje', ancho: 26, align: 'right', bold: true }
      ],
      filas: competencias.map(c => [c.nombre, c.puntaje.toFixed(1)]),
      caja: true,
      minAltura: alturaMinima
    });

    P.dibujarRecuadro(doc, P.MARGIN, yTop, radarW, bottom);
    const cx = P.MARGIN + radarW / 2;
    const cy = yTop + (bottom - yTop) / 2;
    const radioMax = Math.min(radarW, bottom - yTop) / 2 - (labelOffset + labelWidth);
    P.dibujarRadar(doc, competencias, cx, cy, Math.min(radioDeseado, radioMax), labelOffset, labelWidth, 5);

    return next;
  }

  function dibujarPlan(doc, plan, y) {
    if (!plan.length) return y;
    let yy = P.dibujarSeccion(doc, 'Plan de desarrollo', y);
    const { next } = P.dibujarTabla(doc, {
      y: yy,
      columnas: [
        { titulo: 'Acción', ancho: 96, align: 'left', color: P.GRAY_TEXT },
        { titulo: 'Responsable', ancho: 52, align: 'left', color: P.GRAY_TEXT },
        { titulo: 'Fecha', ancho: 34, align: 'left', color: P.GRAY_TEXT }
      ],
      filas: plan.map(p => [p.accion, p.responsable, p.fecha]),
      caja: true
    });
    return next;
  }

  /* -----------------------------------------------------------------
     Bandas de la escala de calificación (RF-14), para la leyenda de la
     portada del informe individual detallado.
  ----------------------------------------------------------------- */
  const BANDAS_ESCALA = [
    { rango: '0% – 29%', nivel: 'No cumple', color: 'RED', detalle: 'La conducta no se evidencia o se presenta de manera insuficiente.' },
    { rango: '30% – 49%', nivel: 'Cumple parcialmente', color: 'AMBER', detalle: 'La conducta se evidencia de forma irregular o requiere mejora.' },
    { rango: '50% – 69%', nivel: 'Cumple', color: 'AZUL', detalle: 'La conducta se evidencia de acuerdo con lo esperado.' },
    { rango: '70% – 89%', nivel: 'Supera', color: 'LIMA', detalle: 'La conducta se evidencia de manera consistente y por encima de lo esperado.' },
    { rango: '90% – 100%', nivel: 'Sobresale', color: 'GREEN', detalle: 'La conducta se evidencia de manera ejemplar y genera un impacto positivo.' }
  ];
  const COLORES_SERIE = { AUTO: [42, 150, 166], JEFE: [124, 165, 70], PAR: [214, 146, 30], SUBALTERNO: [180, 70, 70] };

  function nuevaSeccionSegura(doc, y, alturaEstimada, titulo) {
    if (y + alturaEstimada > 270) return P.nuevaPagina(doc, titulo);
    return P.dibujarSeccion(doc, titulo, y);
  }

  function comentariosFortalezasYMejoras(competencias) {
    const todos = [];
    competencias.forEach(c => c.indicadores.forEach(i => {
      if (i.resultado !== null) todos.push({ nombre: i.nombre, competencia: c.nombre, resultado: i.resultado });
    }));
    const fortalezas = todos.filter(i => i.resultado >= 80).sort((a, b) => b.resultado - a.resultado).slice(0, 6);
    const mejoras = todos.filter(i => i.resultado < 80).sort((a, b) => a.resultado - b.resultado).slice(0, 6);
    return { fortalezas, mejoras };
  }

  /* -----------------------------------------------------------------
     Informes por tipo (RF-19 a RF-21): mismo layout, contenido distinto.
     El informe individual es el "Reporte Individual" completo (inspirado
     en la plantilla HR Suite V4 2024): portada con leyenda de la escala,
     resultado global por tipo de evaluador, radar comparativo, una
     página de detalle por competencia (anillo, barras por evaluador,
     fortalezas/oportunidades y tabla de comportamientos) y comentarios
     finales. El logo institucional se redibuja en cada hoja (ver
     PdfPlantilla.nuevaPagina).
  ----------------------------------------------------------------- */
  function informeIndividual(colaboradorId, periodoId) {
    const periodo = TH.DB.periodo(periodoId);
    const consolidado = TH.DB.consolidar(colaboradorId, periodoId);
    const detalle = detalleColaborador(colaboradorId, periodoId);
    const colaborador = detalle.colaborador;
    const nombreArchivo = `informe-individual-${colaborador.nombre.replace(/\s+/g, '-').toLowerCase()}.pdf`;

    const { doc, y: y0 } = P.nuevoDoc('Valoración por Competencias 360°', periodo.nombre);

    const campos = [
      { etiqueta: 'Colaborador', valor: colaborador.nombre },
      { etiqueta: 'Cargo', valor: colaborador.cargo },
      { etiqueta: 'Fecha de generación', valor: new Date().toLocaleDateString('es-CO') },
      { etiqueta: 'Nivel alcanzado', valor: consolidado ? consolidado.descriptor : 'Sin datos' }
    ];
    let y = P.dibujarCampos(doc, campos, y0);

    y = P.dibujarSeccion(doc, 'Escala de calificación', y);
    BANDAS_ESCALA.forEach(b => {
      const color = P[b.color];
      doc.setFillColor(...color);
      doc.rect(P.MARGIN, y - 3.2, 4, 4, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.setTextColor(...color);
      doc.text(`${b.rango} · ${b.nivel}`, P.MARGIN + 7, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.3);
      doc.setTextColor(...P.GRAY_TEXT);
      const lineas = doc.splitTextToSize(b.detalle, P.CONTENT_W - 7);
      doc.text(lineas, P.MARGIN + 7, y + 4.4);
      y += 4.4 + lineas.length * 4 + 3.5;
    });

    if (!consolidado) {
      P.dibujarParrafo(doc, 'Aún no hay evaluaciones calificadas para este colaborador en el período seleccionado.', y + 4, { italic: true });
      P.dibujarPie(doc);
      doc.save(nombreArchivo);
      return;
    }

    // ---- Resultado global de la evaluación ----
    y = P.nuevaPagina(doc, 'Resultado global de la evaluación');
    const cx1 = P.PAGE_W / 2, cy1 = y + 22;
    P.dibujarAnillo(doc, cx1, cy1, 18, consolidado.pctGeneral, { etiqueta: 'Resultado total' });
    y = cy1 + 18 + 16;

    const tipoColW = Math.min(26, (P.CONTENT_W - 70) / detalle.tiposActivos.length);
    const resultadoGlobal = P.dibujarTabla(doc, {
      y: y + 5,
      columnas: [
        { titulo: 'Competencia', ancho: P.CONTENT_W - tipoColW * detalle.tiposActivos.length, align: 'left' },
        ...detalle.tiposActivos.map(([tipo]) => ({ titulo: ETIQUETA_TIPO[tipo], ancho: tipoColW, align: 'right' }))
      ],
      filas: detalle.competencias.map(c => [
        c.nombre,
        ...detalle.tiposActivos.map(([tipo]) => c.porEvaluador[tipo] !== undefined ? c.porEvaluador[tipo] + '%' : '—')
      ]),
      caja: true
    });
    y = resultadoGlobal.next;

    if (detalle.sstDetalle) {
      y = nuevaSeccionSegura(doc, y, 30, 'Resultado SST (transversal a toda la institución)');
      y = P.dibujarBarrasEvaluador(doc, [{ etiqueta: 'Sistema de Gestión de Seguridad y Salud en el Trabajo', pct: detalle.sstDetalle.scoreTotal }], P.MARGIN, y + 4, 110);
    }

    // ---- Radar comparativo por tipo de evaluador ----
    y = P.nuevaPagina(doc, 'Comparativo por tipo de evaluador');
    P.dibujarParrafo(doc, 'Compara la autoevaluación del colaborador frente a la percepción de los demás evaluadores en cada competencia, para identificar puntos ciegos entre fortalezas y áreas de oportunidad.', y, { fontSize: 9 });
    const categorias = detalle.competencias.map(c => c.nombre);
    const series = detalle.tiposActivos.map(([tipo]) => ({
      nombre: ETIQUETA_TIPO[tipo],
      color: COLORES_SERIE[tipo],
      valores: detalle.competencias.map(c => c.porEvaluador[tipo] !== undefined ? c.porEvaluador[tipo] : 0)
    }));
    const radio = 58;
    const cx2 = P.PAGE_W / 2, cy2 = 90 + radio;
    P.dibujarRadarMultiple(doc, categorias, series, cx2, cy2, radio, 4, 22, 100);
    P.dibujarLeyenda(doc, series.map(s => ({ color: s.color, etiqueta: s.nombre })), P.MARGIN, cy2 + radio + 22);

    // ---- Una página de detalle por cada competencia ----
    detalle.competencias.forEach(comp => {
      y = P.nuevaPagina(doc, comp.nombre);
      const cx = P.MARGIN + 24, cy = y + 20;
      P.dibujarAnillo(doc, cx, cy, 18, comp.scoreTotal, { etiqueta: 'Resultado total' });
      const barrasItems = detalle.tiposActivos.map(([tipo]) => ({
        etiqueta: ETIQUETA_TIPO[tipo],
        pct: comp.porEvaluador[tipo] !== undefined ? comp.porEvaluador[tipo] : null
      }));
      P.dibujarBarrasEvaluador(doc, barrasItems, P.MARGIN + 58, y, P.CONTENT_W - 58 - 24);
      y = cy + 18 + 16;

      const fortalezasComp = comp.indicadores.filter(i => i.resultado !== null && i.resultado >= 80);
      const oportunidadesComp = comp.indicadores.filter(i => i.resultado !== null && i.resultado < 80);

      if (fortalezasComp.length) {
        y = nuevaSeccionSegura(doc, y, 20, 'Comportamientos que se constituyen en fortaleza');
        y = P.dibujarBullets(doc, fortalezasComp.map(i => i.nombre), y, P.GREEN);
      }
      if (oportunidadesComp.length) {
        y = nuevaSeccionSegura(doc, y, 20, 'Comportamientos con áreas de oportunidad');
        y = P.dibujarBullets(doc, oportunidadesComp.map(i => i.nombre), y, P.AMBER);
      }

      y = P.nuevaPagina(doc, comp.nombre + ' · Resultados por comportamiento');
      const colTipoW = Math.min(22, (P.CONTENT_W - 70) / detalle.tiposActivos.length);
      P.dibujarTabla(doc, {
        y: y + 5,
        columnas: [
          { titulo: 'Comportamiento', ancho: P.CONTENT_W - colTipoW * detalle.tiposActivos.length - 20, align: 'left' },
          ...detalle.tiposActivos.map(([tipo]) => ({ titulo: ETIQUETA_TIPO[tipo].slice(0, 4) + '.', ancho: colTipoW, align: 'right' })),
          { titulo: 'Result.', ancho: 20, align: 'right', bold: true }
        ],
        filas: comp.indicadores.map(i => [
          i.nombre,
          ...detalle.tiposActivos.map(([tipo]) => i.porEvaluador[tipo] !== undefined ? i.porEvaluador[tipo] + '%' : '—'),
          i.resultado !== null ? i.resultado + '%' : '—'
        ]),
        caja: true
      });
    });

    // ---- Comentarios finales ----
    const { fortalezas, mejoras } = comentariosFortalezasYMejoras(detalle.competencias);
    y = P.nuevaPagina(doc, 'Comentarios de aspectos a mejorar');
    y = P.dibujarBullets(
      doc,
      mejoras.length
        ? mejoras.map(m => `Fortalecer "${m.nombre}" (${m.competencia}) — resultado actual ${m.resultado}%.`)
        : ['No se identificaron comportamientos por debajo del 80% en este período.'],
      y, P.AMBER
    );

    y = nuevaSeccionSegura(doc, y, 20, 'Comentarios de fortalezas');
    P.dibujarBullets(
      doc,
      fortalezas.length
        ? fortalezas.map(f => `"${f.nombre}" (${f.competencia}) — resultado ${f.resultado}%.`)
        : ['No se identificaron comportamientos por encima del 80% en este período.'],
      y, P.GREEN
    );

    P.dibujarPie(doc);
    doc.save(nombreArchivo);
  }

  function informeRoster(titulo, campoAlcance, colaboradores, periodoId, nombreArchivo, responsablePrincipal, compararConInstitucional) {
    const periodo = TH.DB.periodo(periodoId);
    const idsConDatos = [];
    const consolidados = colaboradores
      .map(c => {
        const consolidado = TH.DB.consolidar(c.id, periodoId);
        if (consolidado) idsConDatos.push(c.id);
        return { colaborador: c, consolidado };
      })
      .filter(c => c.consolidado);

    const promedio = consolidados.length
      ? TH.round1(TH.promedio(consolidados.map(c => c.consolidado.scoreGeneral)))
      : null;
    const competencias = puntajesPorCompetencia(idsConDatos, periodoId);

    const { doc, y: y0 } = P.nuevoDoc(titulo, 'Evaluación de desempeño · ' + periodo.nombre);

    const campos = [
      campoAlcance,
      { etiqueta: 'Colaboradores evaluados', valor: String(consolidados.length) },
      { etiqueta: 'Periodo', valor: periodo.nombre },
      { etiqueta: 'Nivel promedio', valor: promedio !== null ? `${promedio}/5 · ${TH.descriptorPara(promedio)}` : 'Sin datos' }
    ];

    if (compararConInstitucional) {
      const todos = TH.DB.usuarios().filter(u => u.rolId === 'colaborador' && u.estado === 'Activo');
      const consolidadosInst = todos.map(u => TH.DB.consolidar(u.id, periodoId)).filter(Boolean);
      const promedioInst = consolidadosInst.length ? TH.round1(TH.promedio(consolidadosInst.map(c => c.scoreGeneral))) : null;
      const comparacion = promedio !== null && promedioInst !== null ? (promedio >= promedioInst ? 'por encima' : 'por debajo') : null;
      campos.push({
        etiqueta: 'Promedio institucional',
        valor: promedioInst !== null
          ? `${promedioInst}/5${comparacion ? ` (área ${comparacion} del promedio)` : ''}`
          : 'Sin datos'
      });
    }

    let y = P.dibujarCampos(doc, campos, y0);
    y = dibujarCompetencias(doc, competencias, y);
    dibujarPlan(doc, planAgregado(competencias, periodo, responsablePrincipal), y);
    P.dibujarPie(doc);

    doc.save(nombreArchivo);
  }

  window.Modules.informes = function (root, ctx) {
    window.Modules.informes.generarInformeIndividual = informeIndividual;
    const usuario = ctx.usuario;
    const esAdmin = usuario.rolId === 'admin';
    const subalternos = esAdmin ? [] : TH.DB.subalternosTodos(usuario.id);
    const visibles = TH.DB.colaboradoresVisiblesPara(usuario).filter(u => u.estado === 'Activo');
    const areasVisibles = esAdmin ? [...new Set(TH.DB.usuarios().filter(u => u.rolId === 'colaborador').map(u => u.area))] : [];

    const tabs = [{ id: 'individual', label: 'Individual' }];
    if (subalternos.length) tabs.push({ id: 'equipo', label: 'Mi equipo' });
    if (esAdmin) { tabs.push({ id: 'area', label: 'Por área' }); tabs.push({ id: 'general', label: 'General' }); }

    let activo = 'individual';

    function pintar() {
      root.innerHTML = `
        <div class="tabs">
          ${tabs.map(t => `<button type="button" class="tab-btn" data-tab="${t.id}" aria-selected="${t.id === activo}">${t.label}</button>`).join('')}
        </div>
        <div class="panel" id="tabContent"></div>
      `;

      root.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => { activo = btn.dataset.tab; pintar(); }));

      const content = root.querySelector('#tabContent');

      if (activo === 'individual') {
        content.innerHTML = `
          <p class="section-label">Informe individual de colaborador (RF-19)</p>
          <div class="form-grid">
            <div class="field"><label>Colaborador</label><select id="colabSel">${visibles.map(u => `<option value="${u.id}">${u.nombre} — ${u.cargo}</option>`).join('')}</select></div>
            <div class="field"><label>Período</label><select id="perSel">${TH.DB.periodosPorTipo('competencias').map(p => `<option value="${p.id}" ${p.estado === 'Activo' ? 'selected' : ''}>${p.nombre}</option>`).join('')}</select></div>
          </div>
          <div class="modal-actions" style="justify-content:flex-start;">
            <button type="button" class="btn btn--primary" id="genBtn">Generar informe en PDF</button>
          </div>
        `;
        content.querySelector('#genBtn').addEventListener('click', () => {
          informeIndividual(content.querySelector('#colabSel').value, content.querySelector('#perSel').value);
          UI.toast('Informe individual generado.');
        });
      }

      if (activo === 'equipo') {
        content.innerHTML = `
          <p class="section-label">Informe de mi equipo (RF-20)</p>
          <div class="form-grid">
            <div class="field field--full"><label>Período</label><select id="perSel">${TH.DB.periodosPorTipo('competencias').map(p => `<option value="${p.id}" ${p.estado === 'Activo' ? 'selected' : ''}>${p.nombre}</option>`).join('')}</select></div>
          </div>
          <div class="modal-actions" style="justify-content:flex-start;">
            <button type="button" class="btn btn--primary" id="genBtn">Generar informe en PDF</button>
          </div>
        `;
        content.querySelector('#genBtn').addEventListener('click', () => {
          const periodoId = content.querySelector('#perSel').value;
          informeRoster(
            'Informe de equipo: ' + usuario.nombre,
            { etiqueta: 'Equipo', valor: 'Colaboradores de ' + usuario.nombre },
            subalternos, periodoId,
            `informe-equipo-${usuario.nombre.replace(/\s+/g, '-').toLowerCase()}.pdf`,
            'Jefe inmediato'
          );
          UI.toast('Informe de equipo generado.');
        });
      }

      if (activo === 'area') {
        content.innerHTML = `
          <p class="section-label">Informe por área (RF-20)</p>
          <div class="form-grid">
            <div class="field"><label>Área</label><select id="areaSel">${areasVisibles.map(a => `<option value="${a}">${a}</option>`).join('')}</select></div>
            <div class="field"><label>Período</label><select id="perSel">${TH.DB.periodosPorTipo('competencias').map(p => `<option value="${p.id}" ${p.estado === 'Activo' ? 'selected' : ''}>${p.nombre}</option>`).join('')}</select></div>
          </div>
          <div class="modal-actions" style="justify-content:flex-start;">
            <button type="button" class="btn btn--primary" id="genBtn">Generar informe en PDF</button>
          </div>
        `;
        content.querySelector('#genBtn').addEventListener('click', () => {
          const area = content.querySelector('#areaSel').value;
          const periodoId = content.querySelector('#perSel').value;
          const colaboradores = TH.DB.usuarios().filter(u => u.rolId === 'colaborador' && u.area === area && u.estado === 'Activo');
          informeRoster(
            'Informe de área: ' + area,
            { etiqueta: 'Área', valor: area },
            colaboradores, periodoId,
            `informe-area-${area.replace(/\s+/g, '-').toLowerCase()}.pdf`,
            'Líder de área',
            true
          );
          UI.toast('Informe de área generado.');
        });
      }

      if (activo === 'general') {
        content.innerHTML = `
          <p class="section-label">Informe general de la organización (RF-21)</p>
          <div class="form-grid">
            <div class="field field--full"><label>Período</label><select id="perSel">${TH.DB.periodosPorTipo('competencias').map(p => `<option value="${p.id}" ${p.estado === 'Activo' ? 'selected' : ''}>${p.nombre}</option>`).join('')}</select></div>
          </div>
          <div class="modal-actions" style="justify-content:flex-start;">
            <button type="button" class="btn btn--primary" id="genBtn">Generar informe en PDF</button>
          </div>
        `;
        content.querySelector('#genBtn').addEventListener('click', () => {
          const periodoId = content.querySelector('#perSel').value;
          const colaboradores = TH.DB.usuarios().filter(u => u.rolId === 'colaborador' && u.estado === 'Activo');
          informeRoster(
            'Informe general de desempeño',
            { etiqueta: 'Organización', valor: 'Todas las áreas' },
            colaboradores, periodoId,
            `informe-general-${TH.DB.periodo(periodoId).nombre.replace(/\s+/g, '-').toLowerCase()}.pdf`,
            'Dirección general'
          );
          UI.toast('Informe general generado.');
        });
      }
    }

    pintar();
  };

})();
