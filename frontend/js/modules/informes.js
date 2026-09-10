/* =========================================================================
   MODULES.informes — Informes individual, de equipo y general (RF-19 a RF-21)
   Todos los informes se pueden descargar en PDF (RNF-11).
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  function nuevoDoc(titulo, subtitulo) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text(titulo, 14, 20);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(subtitulo + ' · Generado el ' + new Date().toLocaleDateString('es-CO'), 14, 27);
    doc.line(14, 31, 196, 31);
    return doc;
  }

  function informeIndividual(colaboradorId, periodoId) {
    const colaborador = TH.DB.usuario(colaboradorId);
    const periodo = TH.DB.periodo(periodoId);
    const evaluaciones = TH.DB.evaluacionesDe(colaboradorId, periodoId);
    const consolidado = TH.DB.consolidar(colaboradorId, periodoId);
    const historial = TH.DB.historialDe(colaboradorId).filter(h => h.periodo.estado === 'Cerrado');

    const doc = nuevoDoc('Informe individual de desempeno 360', periodo.nombre);
    let y = 42;
    doc.setFont('helvetica', 'bold'); doc.text('Colaborador: ' + colaborador.nombre, 14, y);
    doc.setFont('helvetica', 'normal');
    y += 7; doc.text('Cargo: ' + colaborador.cargo + '   Area: ' + colaborador.area + '   Nivel: ' + TH.TIPO_CARGO_LABEL[colaborador.tipoCargo], 14, y);
    y += 10;

    doc.setFont('helvetica', 'bold'); doc.text('Evaluador', 14, y); doc.text('Tipo', 90, y); doc.text('Institucional', 120, y); doc.text('Especifico', 155, y); doc.text('Resultado', 180, y);
    doc.line(14, y + 2, 196, y + 2);
    doc.setFont('helvetica', 'normal'); y += 9;
    evaluaciones.forEach(ev => {
      const evaluador = TH.DB.usuario(ev.evaluadorId);
      const r = TH.DB.resultado(ev);
      doc.text(evaluador ? evaluador.nombre : '-', 14, y);
      doc.text(TH.TIPOS_EVALUADOR[ev.tipoEvaluador] || ev.tipoEvaluador, 90, y);
      doc.text(r && r.scoreInstitucional !== null ? r.scoreInstitucional + '/5' : '-', 120, y);
      doc.text(r && r.scoreEspecifico !== null ? r.scoreEspecifico + '/5' : '-', 155, y);
      doc.text(r ? r.score + '/5' : '-', 180, y);
      y += 7;
    });

    y += 5; doc.line(14, y, 196, y); y += 9;
    if (consolidado) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text('Resultado consolidado: ' + consolidado.scoreGeneral + '/5 (' + consolidado.pctGeneral + '%)  ·  Nivel: ' + consolidado.descriptor, 14, y);
      doc.setFontSize(9); y += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(doc.splitTextToSize(consolidado.reglaConsolidacion, 180), 14, y);
      doc.setFontSize(10); y += 10;
    }

    if (historial.length) {
      doc.setFont('helvetica', 'bold'); doc.text('Evolucion historica', 14, y); y += 7;
      doc.setFont('helvetica', 'normal');
      doc.text(historial.map(h => h.periodo.nombre + ': ' + h.consolidado.scoreGeneral + '/5').join('   |   '), 14, y);
      y += 10;
    }

    doc.setFont('helvetica', 'bold'); doc.text('Recomendaciones', 14, y); y += 7;
    doc.setFont('helvetica', 'normal');
    const rec = consolidado && consolidado.scoreGeneral < 3.5
      ? 'Se recomienda reforzar las competencias con menor puntaje mediante acompanamiento y capacitacion dirigida.'
      : 'El colaborador mantiene un desempeno favorable; se recomienda continuar con el plan de desarrollo actual.';
    doc.text(doc.splitTextToSize(rec, 180), 14, y);

    doc.save(`informe-individual-${colaborador.nombre.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  }

  function informeRoster(titulo, subtitulo, colaboradores, periodoId, nombreArchivo) {
    const periodo = TH.DB.periodo(periodoId);
    const consolidados = colaboradores.map(c => ({ colaborador: c, consolidado: TH.DB.consolidar(c.id, periodoId) })).filter(c => c.consolidado);
    const promedio = consolidados.length ? TH.round1(TH.promedio(consolidados.map(c => c.consolidado.scoreGeneral))) : 0;

    const doc = nuevoDoc(titulo, subtitulo + ' · ' + periodo.nombre);
    let y = 42;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('Promedio: ' + promedio + '/5', 14, y);
    doc.setFontSize(10); y += 10;

    doc.setFont('helvetica', 'bold'); doc.text('Colaborador', 14, y); doc.text('Cargo', 90, y); doc.text('Nivel', 150, y); doc.text('Resultado', 175, y);
    doc.line(14, y + 2, 196, y + 2);
    doc.setFont('helvetica', 'normal'); y += 9;
    consolidados.forEach(c => {
      doc.text(c.colaborador.nombre, 14, y);
      doc.text(c.colaborador.cargo, 90, y);
      doc.text(TH.TIPO_CARGO_LABEL[c.colaborador.tipoCargo], 150, y);
      doc.text(c.consolidado.scoreGeneral + '/5', 175, y);
      y += 7;
    });

    y += 6; doc.setFont('helvetica', 'bold'); doc.text('Tendencia', 14, y); y += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(subtitulo + ' registra un promedio de ' + promedio + '/5 en ' + periodo.nombre + '.', 14, y);

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
            <div class="field"><label>Período</label><select id="perSel">${TH.DB.periodos().map(p => `<option value="${p.id}" ${p.estado === 'Activo' ? 'selected' : ''}>${p.nombre}</option>`).join('')}</select></div>
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
            <div class="field field--full"><label>Período</label><select id="perSel">${TH.DB.periodos().map(p => `<option value="${p.id}" ${p.estado === 'Activo' ? 'selected' : ''}>${p.nombre}</option>`).join('')}</select></div>
          </div>
          <div class="modal-actions" style="justify-content:flex-start;">
            <button type="button" class="btn btn--primary" id="genBtn">Generar informe en PDF</button>
          </div>
        `;
        content.querySelector('#genBtn').addEventListener('click', () => {
          informeRoster('Informe de equipo', usuario.nombre, subalternos, content.querySelector('#perSel').value, `informe-equipo-${usuario.nombre.replace(/\s+/g, '-').toLowerCase()}.pdf`);
          UI.toast('Informe de equipo generado.');
        });
      }

      if (activo === 'area') {
        content.innerHTML = `
          <p class="section-label">Informe por área (RF-20)</p>
          <div class="form-grid">
            <div class="field"><label>Área</label><select id="areaSel">${areasVisibles.map(a => `<option value="${a}">${a}</option>`).join('')}</select></div>
            <div class="field"><label>Período</label><select id="perSel">${TH.DB.periodos().map(p => `<option value="${p.id}" ${p.estado === 'Activo' ? 'selected' : ''}>${p.nombre}</option>`).join('')}</select></div>
          </div>
          <div class="modal-actions" style="justify-content:flex-start;">
            <button type="button" class="btn btn--primary" id="genBtn">Generar informe en PDF</button>
          </div>
        `;
        content.querySelector('#genBtn').addEventListener('click', () => {
          const area = content.querySelector('#areaSel').value;
          const colaboradores = TH.DB.usuarios().filter(u => u.rolId === 'colaborador' && u.area === area && u.estado === 'Activo');
          informeRoster('Informe por área', area, colaboradores, content.querySelector('#perSel').value, `informe-area-${area.replace(/\s+/g, '-').toLowerCase()}.pdf`);
          UI.toast('Informe de área generado.');
        });
      }

      if (activo === 'general') {
        content.innerHTML = `
          <p class="section-label">Informe general de la organización (RF-21)</p>
          <div class="form-grid">
            <div class="field field--full"><label>Período</label><select id="perSel">${TH.DB.periodos().map(p => `<option value="${p.id}" ${p.estado === 'Activo' ? 'selected' : ''}>${p.nombre}</option>`).join('')}</select></div>
          </div>
          <div class="modal-actions" style="justify-content:flex-start;">
            <button type="button" class="btn btn--primary" id="genBtn">Generar informe en PDF</button>
          </div>
        `;
        content.querySelector('#genBtn').addEventListener('click', () => {
          const periodoId = content.querySelector('#perSel').value;
          const colaboradores = TH.DB.usuarios().filter(u => u.rolId === 'colaborador' && u.estado === 'Activo');
          informeRoster('Informe general de la organización', 'Todos los colaboradores', colaboradores, periodoId, `informe-general-${TH.DB.periodo(periodoId).nombre.replace(/\s+/g, '-').toLowerCase()}.pdf`);
          UI.toast('Informe general generado.');
        });
      }
    }

    pintar();
  };

})();
