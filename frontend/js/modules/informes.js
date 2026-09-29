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
     Informes por tipo (RF-19 a RF-21): mismo layout, contenido distinto.
  ----------------------------------------------------------------- */
  function informeIndividual(colaboradorId, periodoId) {
    const colaborador = TH.DB.usuario(colaboradorId);
    const periodo = TH.DB.periodo(periodoId);
    const consolidado = TH.DB.consolidar(colaboradorId, periodoId);
    const competencias = puntajesPorCompetencia(colaboradorId, periodoId);

    const { doc, y: y0 } = P.nuevoDoc('Perfil de competencias', 'Evaluación de desempeño · ' + periodo.nombre);

    const campos = [
      { etiqueta: 'Colaborador', valor: colaborador.nombre },
      { etiqueta: 'Cargo', valor: colaborador.cargo },
      { etiqueta: 'Periodo', valor: periodo.nombre },
      { etiqueta: 'Nivel', valor: consolidado ? consolidado.descriptor : 'Sin datos' }
    ];
    let y = P.dibujarCampos(doc, campos, y0);
    y = dibujarCompetencias(doc, competencias, y);
    dibujarPlan(doc, planIndividual(colaborador, competencias, periodo), y);
    P.dibujarPie(doc);

    doc.save(`informe-individual-${colaborador.nombre.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  }

  function informeRoster(titulo, campoAlcance, colaboradores, periodoId, nombreArchivo, responsablePrincipal) {
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
      { etiqueta: 'Nivel promedio', valor: promedio !== null ? TH.descriptorPara(promedio) : 'Sin datos' }
    ];
    let y = P.dibujarCampos(doc, campos, y0);
    y = dibujarCompetencias(doc, competencias, y);
    dibujarPlan(doc, planAgregado(competencias, periodo, responsablePrincipal), y);
    P.dibujarPie(doc);

    doc.save(nombreArchivo);
  }

  window.Modules.informes = function (root, ctx) {
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
            'Líder de área'
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
