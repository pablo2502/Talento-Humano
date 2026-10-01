/* =========================================================================
   MODULES.* — DESEMPEÑO POR OBJETIVOS (evaluación 1 a 1: jefe evalúa
   colaborador, con criterios ponderados que suman 100% y un avance por
   criterio que se acumula hasta el 100%). Módulo separado de Competencias
   360°, con su propia Asignación, Períodos, Resultados, Informes y
   Recomendaciones — ver panel.js para la navegación.

   Archivo agrupa:
   - Modules.periodosDesempeno   (admin) períodos mensuales de desempeño
   - Modules.asignacionDesempeno (admin) quién evalúa a quién, 1 a 1
   - Modules.objetivos           (admin) carga de objetivos: uno por uno
                                  o en bloque por Excel (a nivel general)
   - Modules.evaluacionDesempeno (evaluador) registra el avance por criterio
   - Modules.resultadosDesempeno (todos) resultado por colaborador/período
   - Modules.informesDesempeno   (todos) informes en PDF
   - Modules.iaDesempeno         (todos) recomendaciones sobre desempeño
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  const TIPO = 'desempeno';

  function estadoPill(estado) {
    const map = { 'Pendiente': 'pill--pend', 'Finalizada': 'pill--ok' };
    return `<span class="pill ${map[estado] || 'pill--neutral'}">${estado}</span>`;
  }

  function barraResultado(pct) {
    return `
      <div class="result-row">
        <div class="result-row__bar"><div class="result-row__fill" style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>
        <div class="result-row__value">${pct}%</div>
      </div>
    `;
  }

  function claseAvance(pct) {
    if (pct >= 90) return 'high';
    if (pct >= 70) return 'mid';
    return 'low';
  }

  /* =======================================================================
     PERÍODOS DE DESEMPEÑO — mensuales, análogos a "Períodos" de Competencias
     pero con su propio ciclo activo/cerrado.
  ======================================================================= */

  window.Modules.periodosDesempeno = function (root) {
    function pintar() {
      const periodos = TH.DB.periodosPorTipo(TIPO);

      root.innerHTML = `
        <div class="view__head">
          <div></div>
          <div class="view__head-actions">
            <button type="button" class="btn btn--primary" id="newBtn">+ Nuevo período</button>
          </div>
        </div>

        <div class="panel">
          <p class="section-label">Períodos de Desempeño — un período puede durar, por ejemplo, un mes</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Nombre</th><th>Fecha inicio</th><th>Fecha fin</th><th>Estado</th><th>Objetivos cargados</th><th></th></tr></thead>
              <tbody>
                ${periodos.map(p => {
                  const n = TH.DB.objetivos().filter(o => o.periodoId === p.id).length;
                  return `
                    <tr>
                      <td>${p.nombre}</td>
                      <td>${UI.formatFecha(p.fechaInicio)}</td>
                      <td>${UI.formatFecha(p.fechaFin)}</td>
                      <td><span class="pill ${p.estado === 'Activo' ? 'pill--ok' : 'pill--neutral'}">${p.estado}</span></td>
                      <td>${n}</td>
                      <td class="actions-cell">
                        ${p.estado === 'Cerrado'
                          ? `<button type="button" class="btn btn--ghost btn--sm" data-activar="${p.id}">Activar</button>`
                          : `<button type="button" class="btn btn--ghost btn--sm" data-cerrar="${p.id}">Cerrar</button>`}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      root.querySelector('#newBtn').addEventListener('click', abrirFormulario);

      root.querySelectorAll('[data-activar]').forEach(b => b.addEventListener('click', () => {
        const actual = TH.DB.periodoActivo(TIPO);
        const activar = () => {
          TH.DB.periodosPorTipo(TIPO).forEach(p => { if (p.estado === 'Activo') TH.DB.actualizar('periodos', p.id, { estado: 'Cerrado' }); });
          TH.DB.actualizar('periodos', b.dataset.activar, { estado: 'Activo' });
          const generadas = TH.DB.generarAsignacionesDesempenoPeriodo(b.dataset.activar);
          UI.toast(generadas > 0 ? `Período activado. Se asignaron ${generadas} evaluadores de desempeño por defecto (jefe inmediato).` : 'Período activado.');
          pintar();
        };
        if (actual) {
          UI.confirm('Cambiar período activo', `El período "${actual.nombre}" se cerrará automáticamente al activar este nuevo período. ¿Deseas continuar?`, activar);
        } else {
          activar();
        }
      }));

      root.querySelectorAll('[data-cerrar]').forEach(b => b.addEventListener('click', () => {
        UI.confirm('Cerrar período', 'Al cerrar el período, sus resultados quedan fijos para consulta e historial. Los objetivos que no se hayan finalizado quedarán pendientes sin poder completarse. ¿Deseas continuar?', () => {
          const periodoId = b.dataset.cerrar;
          TH.DB.actualizar('periodos', periodoId, { estado: 'Cerrado' });
          UI.toast('Período cerrado.');
          pintar();
        });
      }));
    }

    function abrirFormulario() {
      UI.openModal(`
        <h2>Nuevo período de Desempeño</h2>
        <p>Puede durar lo que necesites — por ejemplo, un mes. Se crea en estado "Cerrado"; actívalo desde la lista cuando quieras iniciar el ciclo.</p>
        <div class="form-grid">
          <div class="field field--full"><label>Nombre</label><input id="fNombre" placeholder="Ej: Desempeño · Octubre 2026"></div>
          <div class="field"><label>Fecha inicio</label><input id="fInicio" type="date"></div>
          <div class="field"><label>Fecha fin</label><input id="fFin" type="date"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn--ghost" data-modal-close>Cancelar</button>
          <button type="button" class="btn btn--primary" id="saveBtn">Crear período</button>
        </div>
      `, { onOpen: box => {
        box.querySelector('#saveBtn').addEventListener('click', () => {
          const data = {
            nombre: box.querySelector('#fNombre').value.trim(),
            fechaInicio: box.querySelector('#fInicio').value,
            fechaFin: box.querySelector('#fFin').value,
            estado: 'Cerrado', tipo: TIPO
          };
          if (!data.nombre || !data.fechaInicio || !data.fechaFin) { UI.toast('Completa todos los campos.'); return; }
          TH.DB.crear('periodos', data, 'per-des');
          UI.toast('Período de Desempeño creado.');
          UI.closeModal();
          pintar();
        });
      } });
    }

    pintar();
  };

  /* =======================================================================
     ASIGNACIÓN DE DESEMPEÑO — quién evalúa a quién, 1 a 1 (por defecto el
     jefe inmediato, editable a cualquier evaluador activo).
  ======================================================================= */

  window.Modules.asignacionDesempeno = function (root) {
    let periodoId = (TH.DB.periodoActivo(TIPO) || TH.DB.periodosPorTipo(TIPO)[0] || {}).id;

    function pintar() {
      if (!periodoId) {
        root.innerHTML = `<div class="panel"><div class="empty-state"><h3>Sin períodos de Desempeño</h3><p>Crea un período en "Períodos" antes de asignar evaluadores.</p></div></div>`;
        return;
      }
      const periodo = TH.DB.periodo(periodoId);
      const colaboradores = TH.DB.usuarios().filter(u => u.rolId === 'colaborador' && u.estado === 'Activo');
      const periodoCerrado = periodo.estado === 'Cerrado';

      root.innerHTML = `
        <div class="filters-bar">
          <div class="field field--grow">
            <label>Período</label>
            <select id="periodoSelect">${TH.DB.periodosPorTipo(TIPO).map(p => `<option value="${p.id}" ${p.id === periodoId ? 'selected' : ''}>${p.nombre}${p.estado === 'Activo' ? ' · Activo' : ''}</option>`).join('')}</select>
          </div>
          <button type="button" class="btn btn--dark" id="generarBtn" ${periodoCerrado ? 'disabled' : ''}>Asignar jefe inmediato a quien falte</button>
        </div>

        <div class="panel">
          <p class="section-label">Evaluación de Desempeño 1 a 1 — ${periodo.nombre}</p>
          <p style="color:var(--ink-soft);font-size:.82rem;margin:-6px 0 16px;">Por defecto cada colaborador es evaluado por su jefe inmediato; puedes reasignar el evaluador manualmente para cualquier caso (por ejemplo, evaluaciones cruzadas o de comité).</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Colaborador</th><th>Cargo</th><th>Evaluador de desempeño</th><th>Objetivos</th></tr></thead>
              <tbody>
                ${colaboradores.map(c => {
                  const asignacion = TH.DB.asignacionDesempenoDe(c.id, periodoId);
                  const objetivo = TH.DB.objetivoDe(c.id, periodoId);
                  return `
                    <tr>
                      <td>${c.nombre}</td>
                      <td>${c.cargo}<span class="cell-sub">${TH.TIPO_CARGO_LABEL[c.tipoCargo]}</span></td>
                      <td>
                        <select data-asignar="${c.id}" ${periodoCerrado ? 'disabled' : ''} style="min-width:220px;">
                          <option value="">— Sin asignar —</option>
                          ${TH.DB.usuarios().filter(u => u.estado === 'Activo' && u.id !== c.id).map(u => `<option value="${u.id}" ${asignacion && asignacion.evaluadorId === u.id ? 'selected' : ''}>${u.nombre} — ${u.cargo}</option>`).join('')}
                        </select>
                      </td>
                      <td>${objetivo ? estadoPill(objetivo.estado) + ' <span class="cell-sub">' + objetivo.criterios.length + ' criterio(s)</span>' : '<span class="pill pill--neutral">Sin cargar</span>'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      root.querySelector('#periodoSelect').addEventListener('change', e => { periodoId = e.target.value; pintar(); });

      const generarBtn = root.querySelector('#generarBtn');
      if (!periodoCerrado) generarBtn.addEventListener('click', () => {
        const n = TH.DB.generarAsignacionesDesempenoPeriodo(periodoId);
        UI.toast(n > 0 ? `Se asignó el jefe inmediato a ${n} colaborador(es) sin evaluador.` : 'Todos los colaboradores ya tienen evaluador asignado.');
        pintar();
      });

      root.querySelectorAll('[data-asignar]').forEach(sel => sel.addEventListener('change', () => {
        const colaboradorId = sel.dataset.asignar;
        if (!sel.value) {
          const asignacion = TH.DB.asignacionDesempenoDe(colaboradorId, periodoId);
          if (asignacion) TH.DB.eliminarAsignacionDesempeno(asignacion.id);
          UI.toast('Evaluador de desempeño quitado.');
        } else {
          TH.DB.asignarDesempeno(periodoId, colaboradorId, sel.value);
          UI.toast('Evaluador de desempeño asignado.');
        }
      }));
    }

    pintar();
  };

  /* =======================================================================
     OBJETIVOS — carga de criterios ponderados: uno por uno, o en bloque
     por Excel "a nivel general" (todos los evaluadores y colaboradores en
     un mismo archivo, una fila por criterio).
  ======================================================================= */

  window.Modules.objetivos = function (root) {
    let tab = 'manual';
    let periodoId = (TH.DB.periodoActivo(TIPO) || TH.DB.periodosPorTipo(TIPO)[0] || {}).id;
    let colaboradorId = null;
    let filasEdicion = [];

    function colaboradoresConAsignacion() {
      return TH.DB.usuarios().filter(u => u.rolId === 'colaborador' && u.estado === 'Activo');
    }

    function cargarFilasPara(colabId) {
      const objetivo = colabId ? TH.DB.objetivoDe(colabId, periodoId) : null;
      filasEdicion = objetivo ? objetivo.criterios.map(c => Object.assign({}, c)) : [];
      if (!filasEdicion.length) filasEdicion = [{ id: null, nombre: '', peso: 0, avance: 0 }];
    }

    function pintar() {
      root.innerHTML = `
        <div class="tabs">
          <button type="button" class="tab-btn" data-tab="manual" aria-selected="${tab === 'manual'}">Cargar uno por uno</button>
          <button type="button" class="tab-btn" data-tab="excel" aria-selected="${tab === 'excel'}">Carga masiva por Excel</button>
        </div>
        <div class="panel" id="tabContent"></div>
      `;
      root.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; pintar(); }));

      if (tab === 'manual') pintarManual(root.querySelector('#tabContent'));
      else pintarExcel(root.querySelector('#tabContent'));
    }

    function sumaPesos() {
      return filasEdicion.reduce((s, f) => s + (Number(f.peso) || 0), 0);
    }

    function pintarManual(content) {
      if (!periodoId) { content.innerHTML = `<p>Crea primero un período de Desempeño.</p>`; return; }
      if (!colaboradorId) colaboradorId = (colaboradoresConAsignacion()[0] || {}).id;
      if (!filasEdicion.length) cargarFilasPara(colaboradorId);

      const periodo = TH.DB.periodo(periodoId);
      const suma = sumaPesos();

      content.innerHTML = `
        <p class="section-label">Cargar objetivos de un colaborador (RF análogo a competencias, pero por metas)</p>
        <div class="form-grid" style="margin-bottom:18px;">
          <div class="field">
            <label>Período</label>
            <select id="perSel">${TH.DB.periodosPorTipo(TIPO).map(p => `<option value="${p.id}" ${p.id === periodoId ? 'selected' : ''}>${p.nombre}</option>`).join('')}</select>
          </div>
          <div class="field field--grow">
            <label>Colaborador</label>
            <select id="colabSel">${colaboradoresConAsignacion().map(u => `<option value="${u.id}" ${u.id === colaboradorId ? 'selected' : ''}>${u.nombre} — ${u.cargo}</option>`).join('')}</select>
          </div>
        </div>

        <div class="criteria" id="criteriosWrap">
          ${filasEdicion.map((f, i) => `
            <div class="criterion" data-idx="${i}">
              <div class="form-grid">
                <div class="field field--full"><label>Criterio / meta</label><input type="text" data-campo="nombre" value="${UI.escapeHtml(f.nombre)}" placeholder="Ej: Cumplimiento del plan de trabajo"></div>
                <div class="field"><label>Peso (%)</label><input type="number" min="0" max="100" data-campo="peso" value="${f.peso}"></div>
                <div class="field"><label>Avance actual (%)</label><input type="number" min="0" max="100" data-campo="avance" value="${f.avance}"></div>
              </div>
              <div class="modal-actions" style="justify-content:flex-start;margin-top:8px;">
                <button type="button" class="btn btn--ghost btn--sm" data-quitar="${i}">Quitar criterio</button>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="modal-actions" style="justify-content:space-between;margin-top:16px;">
          <button type="button" class="btn btn--ghost" id="addCriterioBtn">+ Agregar criterio</button>
          <span class="pill ${Math.abs(suma - 100) < 0.05 ? 'pill--ok' : 'pill--warn'}">Suma de pesos: ${suma}% ${Math.abs(suma - 100) < 0.05 ? '' : '(debe sumar 100%)'}</span>
        </div>

        <div class="modal-actions" style="justify-content:flex-start;margin-top:10px;">
          <button type="button" class="btn btn--primary" id="saveBtn">Guardar objetivos de ${periodo.nombre}</button>
        </div>
      `;

      content.querySelector('#perSel').addEventListener('change', e => { periodoId = e.target.value; cargarFilasPara(colaboradorId); pintar(); });
      content.querySelector('#colabSel').addEventListener('change', e => { colaboradorId = e.target.value; cargarFilasPara(colaboradorId); pintar(); });

      content.querySelectorAll('[data-campo]').forEach(input => input.addEventListener('input', () => {
        const idx = Number(input.closest('[data-idx]').dataset.idx);
        const campo = input.dataset.campo;
        filasEdicion[idx][campo] = campo === 'nombre' ? input.value : Number(input.value);
        if (campo !== 'nombre') {
          content.querySelector('.pill').outerHTML = `<span class="pill ${Math.abs(sumaPesos() - 100) < 0.05 ? 'pill--ok' : 'pill--warn'}">Suma de pesos: ${sumaPesos()}% ${Math.abs(sumaPesos() - 100) < 0.05 ? '' : '(debe sumar 100%)'}</span>`;
        }
      }));

      content.querySelectorAll('[data-quitar]').forEach(b => b.addEventListener('click', () => {
        filasEdicion.splice(Number(b.dataset.quitar), 1);
        if (!filasEdicion.length) filasEdicion.push({ id: null, nombre: '', peso: 0, avance: 0 });
        pintarManual(content);
      }));

      content.querySelector('#addCriterioBtn').addEventListener('click', () => {
        filasEdicion.push({ id: null, nombre: '', peso: 0, avance: 0 });
        pintarManual(content);
      });

      content.querySelector('#saveBtn').addEventListener('click', () => {
        const criterios = filasEdicion.filter(f => f.nombre && f.nombre.trim());
        if (!criterios.length) { UI.toast('Agrega al menos un criterio con nombre.'); return; }
        const asignacion = TH.DB.asignacionDesempenoDe(colaboradorId, periodoId);
        const jefe = TH.DB.jefeDe(colaboradorId);
        const evaluadorId = (asignacion && asignacion.evaluadorId) || (jefe && jefe.id);
        if (!evaluadorId) { UI.toast('Este colaborador no tiene evaluador de desempeño asignado. Asígnalo primero en "Asignación de Desempeño".'); return; }
        if (!asignacion) TH.DB.asignarDesempeno(periodoId, colaboradorId, evaluadorId);
        TH.DB.guardarObjetivo({ periodoId, colaboradorId, evaluadorId, criterios });
        UI.toast('Objetivos guardados.' + (Math.abs(sumaPesos() - 100) < 0.05 ? '' : ' Recuerda que los pesos deberían sumar 100%.'));
        cargarFilasPara(colaboradorId);
        pintar();
      });
    }

    function pintarExcel(content) {
      content.innerHTML = `
        <p class="section-label">Carga masiva por Excel (a nivel general)</p>
        <p style="color:var(--ink-soft);font-size:.85rem;line-height:1.6;">
          Sube un archivo con <strong>una fila por criterio</strong>: correo del evaluador, correo del colaborador, nombre del criterio, peso (%) y avance (%) actual. Puedes incluir a todos los evaluadores y colaboradores de la organización en un mismo archivo; si una fila no trae columna "Período", se usa el período elegido abajo.
        </p>
        <div class="form-grid" style="margin-bottom:16px;">
          <div class="field field--full">
            <label>Período por defecto (para filas sin columna "Período")</label>
            <select id="perSelExcel">${TH.DB.periodosPorTipo(TIPO).map(p => `<option value="${p.id}" ${p.id === periodoId ? 'selected' : ''}>${p.nombre}</option>`).join('')}</select>
          </div>
        </div>
        <div class="modal-actions" style="justify-content:flex-start;gap:12px;">
          <button type="button" class="btn btn--ghost" id="plantillaBtn">Descargar plantilla Excel</button>
          <label class="btn btn--primary" for="excelInput" style="cursor:pointer;">Subir archivo Excel</label>
          <input type="file" id="excelInput" accept=".xlsx,.xls,.csv" style="display:none;">
        </div>
        <div id="resumenImport" style="margin-top:18px;"></div>
      `;

      content.querySelector('#perSelExcel').addEventListener('change', e => { periodoId = e.target.value; });

      content.querySelector('#plantillaBtn').addEventListener('click', () => {
        const encabezados = ['Periodo', 'Evaluador (correo)', 'Colaborador (correo)', 'Criterio', 'Peso (%)', 'Avance (%)'];
        const ejemplo = TH.DB.usuarios().find(u => u.rolId === 'colaborador' && u.jefeId);
        const jefeEjemplo = ejemplo ? TH.DB.usuario(ejemplo.jefeId) : null;
        const filas = ejemplo && jefeEjemplo ? [
          [TH.DB.periodo(periodoId).nombre, jefeEjemplo.correo, ejemplo.correo, 'Cumplimiento del plan de trabajo', 40, 0],
          [TH.DB.periodo(periodoId).nombre, jefeEjemplo.correo, ejemplo.correo, 'Calidad de los entregables', 35, 0],
          [TH.DB.periodo(periodoId).nombre, jefeEjemplo.correo, ejemplo.correo, 'Trabajo en equipo y comunicación', 25, 0]
        ] : [];
        const ws = XLSX.utils.aoa_to_sheet([encabezados].concat(filas));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Objetivos');
        XLSX.writeFile(wb, 'plantilla-objetivos-desempeno.xlsx');
      });

      content.querySelector('#excelInput').addEventListener('change', event => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
          try {
            const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const hoja = wb.Sheets[wb.SheetNames[0]];
            const filasCrudas = XLSX.utils.sheet_to_json(hoja, { defval: '' });
            const filas = filasCrudas.map(f => ({
              periodoNombre: f['Periodo'] || f['Período'] || '',
              evaluadorCorreo: f['Evaluador (correo)'] || f['Evaluador'] || '',
              colaboradorCorreo: f['Colaborador (correo)'] || f['Colaborador'] || '',
              criterio: f['Criterio'] || '',
              peso: f['Peso (%)'] !== undefined ? f['Peso (%)'] : f['Peso'],
              avance: f['Avance (%)'] !== undefined ? f['Avance (%)'] : f['Avance']
            }));
            const resultado = TH.DB.importarObjetivosExcel(periodoId, filas);
            mostrarResumen(resultado);
          } catch (err) {
            console.error(err);
            UI.toast('No se pudo leer el archivo. Verifica que sea un Excel (.xlsx) válido.');
          }
          event.target.value = '';
        };
        reader.readAsArrayBuffer(file);
      });

      function mostrarResumen(r) {
        const resumen = content.querySelector('#resumenImport');
        resumen.innerHTML = `
          <div class="summary-chips" style="margin-bottom:14px;">
            <div class="summary-chip"><span>Colaboradores procesados</span><strong>${r.total}</strong></div>
            <div class="summary-chip"><span>Objetivos creados</span><strong>${r.creados}</strong></div>
            <div class="summary-chip"><span>Objetivos actualizados</span><strong>${r.actualizados}</strong></div>
            <div class="summary-chip"><span>Errores</span><strong>${r.errores.length}</strong></div>
          </div>
          ${r.errores.length ? `<div class="chip-picker">${r.errores.map(e => `<span class="pill pill--warn">${UI.escapeHtml(e)}</span>`).join('')}</div>` : '<p style="color:var(--ink-soft);font-size:.85rem;">Sin errores.</p>'}
        `;
        UI.toast(`Carga procesada: ${r.creados} creados, ${r.actualizados} actualizados, ${r.errores.length} error(es).`);
      }
    }

    pintar();
  };

  /* =======================================================================
     EVALUAR DESEMPEÑO — el evaluador (normalmente el jefe) registra el
     avance de cada criterio del colaborador que le fue asignado.
  ======================================================================= */

  window.Modules.evaluacionDesempeno = function (root, ctx) {
    let periodoId = (TH.DB.periodoActivo(TIPO) || TH.DB.periodosPorTipo(TIPO)[0] || {}).id;

    function pintarLista() {
      if (!periodoId) { root.innerHTML = `<div class="panel"><p>No hay períodos de Desempeño configurados.</p></div>`; return; }
      const periodo = TH.DB.periodo(periodoId);
      const asignaciones = TH.DB.asignacionesDesempenoDe(periodoId).filter(a => a.evaluadorId === ctx.usuario.id);

      root.innerHTML = `
        <div class="filters-bar">
          <div class="field">
            <label>Período</label>
            <select id="periodoSelect">${TH.DB.periodosPorTipo(TIPO).map(p => `<option value="${p.id}" ${p.id === periodoId ? 'selected' : ''}>${p.nombre}${p.estado === 'Activo' ? ' · Activo' : ''}</option>`).join('')}</select>
          </div>
        </div>
        <div class="panel">
          ${asignaciones.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state__icon">${THPanel.icon('evaluaciones')}</div>
              <h3>No tienes personas asignadas para evaluar</h3>
              <p>No tienes colaboradores asignados en la Evaluación de Desempeño de ${periodo.nombre}.</p>
            </div>
          ` : `
            <div class="table-wrap">
              <table>
                <thead><tr><th>Colaborador</th><th>Objetivos</th><th>Estado</th><th>Resultado</th><th></th></tr></thead>
                <tbody>
                  ${asignaciones.map(a => {
                    const colaborador = TH.DB.usuario(a.colaboradorId);
                    const objetivo = TH.DB.objetivoDe(a.colaboradorId, periodoId);
                    const r = objetivo ? TH.calcResultadoObjetivo(objetivo) : null;
                    return `
                      <tr>
                        <td>${colaborador.nombre}<span class="cell-sub">${colaborador.cargo}</span></td>
                        <td>${objetivo ? objetivo.criterios.length + ' criterio(s)' : '<span class="pill pill--neutral">Sin objetivos cargados</span>'}</td>
                        <td>${objetivo ? estadoPill(objetivo.estado) : '—'}</td>
                        <td>${r ? r.pctLogrado + '%' : '—'}</td>
                        <td>${objetivo ? `<button type="button" class="btn btn--primary btn--sm" data-open="${objetivo.id}">${objetivo.estado === 'Finalizada' ? 'Ver' : 'Evaluar'}</button>` : '<span class="cell-sub">Pide a Administración que cargue sus objetivos</span>'}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `;

      root.querySelector('#periodoSelect').addEventListener('change', e => { periodoId = e.target.value; pintarLista(); });
      root.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => pintarFormulario(b.dataset.open)));
    }

    function pintarFormulario(objetivoId) {
      const obj = TH.DB.objetivo(objetivoId);
      const colaborador = TH.DB.usuario(obj.colaboradorId);
      const periodo = TH.DB.periodo(obj.periodoId);
      const soloLectura = obj.estado === 'Finalizada';

      function totalesHtml() {
        const r = TH.calcResultadoObjetivo(obj);
        return `
          <div class="summary-chips">
            <div class="summary-chip"><span>Resultado ponderado</span><strong id="totPct">${r.pctLogrado}%</strong></div>
            <div class="summary-chip"><span>Descriptor</span><strong id="totDescriptor">${r.descriptor}</strong></div>
            <div class="summary-chip"><span>Criterios al 100%</span><strong id="totCal">${r.criteriosCompletos} / ${r.totalCriterios}</strong></div>
            <div class="summary-chip"><span>Suma de pesos</span><strong>${r.pesoTotal}%</strong></div>
          </div>
        `;
      }

      root.innerHTML = `
        <div class="view__head">
          <div class="view__head-title" style="display:flex;align-items:center;gap:12px;">
            <button type="button" class="icon-btn" id="backBtn" aria-label="Volver"><svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg></button>
            <div>
              <h2 style="font-size:1.1rem;">${colaborador.nombre} <span style="color:var(--ink-soft);font-weight:400;font-size:.85rem;">· ${colaborador.cargo}</span></h2>
              <p style="margin:2px 0 0;color:var(--ink-soft);font-size:.85rem;">${periodo.nombre} · Evaluación de Desempeño por objetivos</p>
            </div>
          </div>
        </div>

        <div class="panel">
          <p class="section-label">Avance por objetivo (se acumula hasta el 100%; el resultado pondera cada uno según su peso)</p>
          <div class="obj-list" style="margin-bottom:22px;">
            ${obj.criterios.map(c => `
              <div class="obj-card">
                <div class="obj-card__head">
                  <h4 class="obj-card__title">${c.nombre}</h4>
                  <span class="pill pill--neutral obj-card__badge">Seguimiento</span>
                </div>
                <div class="obj-card__meta">
                  <div class="obj-card__stat"><span>Meta</span><strong>100%</strong></div>
                  <div class="obj-card__stat"><span>Peso</span><strong>${c.peso}%</strong></div>
                  <div class="obj-card__stat"><span>Avance</span><strong data-avance-label="${c.id}">${c.avance}%</strong></div>
                </div>
                <div class="obj-card__progress">
                  <input type="range" min="0" max="100" step="5" value="${c.avance}" data-avance="${c.id}" ${soloLectura ? 'disabled' : ''}>
                  <div class="obj-card__bar"><div class="obj-card__fill obj-card__fill--${claseAvance(c.avance)}" data-avance-fill="${c.id}" style="width:${c.avance}%"></div></div>
                  <span class="obj-card__pct" data-avance-pct="${c.id}">${c.avance}%</span>
                </div>
                <div class="obj-card__justificacion" data-justificacion-wrap="${c.id}" ${c.avance < 70 ? '' : 'hidden'}>
                  <label>Justificación (obligatoria por baja calificación &lt;70%)</label>
                  <textarea rows="2" data-justificacion="${c.id}" placeholder="Explica brevemente por qué este criterio no alcanzó el avance esperado..." ${soloLectura ? 'disabled' : ''}>${UI.escapeHtml(c.justificacion || '')}</textarea>
                </div>
              </div>
            `).join('')}
          </div>

          <div id="totalesWrap" style="margin-top:4px;padding-top:22px;border-top:1px solid var(--line);">
            ${totalesHtml()}
            <div class="obj-general ${TH.calcResultadoObjetivo(obj).pctLogrado < 70 ? 'obj-general--low' : ''}" id="avanceGeneralBand">Avance General ${TH.calcResultadoObjetivo(obj).pctLogrado}%</div>
          </div>

          <div class="modal-actions" style="justify-content:flex-start;margin-top:22px;">
            ${!soloLectura ? `<button type="button" class="btn btn--primary" id="finalizarBtn">Finalizar evaluación</button>` : `<span class="pill pill--ok">Evaluación ${obj.estado.toLowerCase()}</span>`}
          </div>
        </div>
      `;

      root.querySelector('#backBtn').addEventListener('click', pintarLista);

      root.querySelectorAll('[data-avance]').forEach(input => input.addEventListener('input', () => {
        const criterioId = input.dataset.avance;
        const valor = Number(input.value);
        TH.DB.actualizarAvanceCriterio(obj.id, criterioId, valor);
        root.querySelector(`[data-avance-label="${criterioId}"]`).textContent = valor + '%';
        root.querySelector(`[data-avance-pct="${criterioId}"]`).textContent = valor + '%';
        const fill = root.querySelector(`[data-avance-fill="${criterioId}"]`);
        fill.style.width = valor + '%';
        fill.className = `obj-card__fill obj-card__fill--${claseAvance(valor)}`;
        const wrap = root.querySelector(`[data-justificacion-wrap="${criterioId}"]`);
        if (wrap) wrap.hidden = valor >= 70;
        const r = TH.calcResultadoObjetivo(obj);
        root.querySelector('#totPct').textContent = r.pctLogrado + '%';
        root.querySelector('#totDescriptor').textContent = r.descriptor;
        root.querySelector('#totCal').textContent = r.criteriosCompletos + ' / ' + r.totalCriterios;
        const band = root.querySelector('#avanceGeneralBand');
        band.textContent = `Avance General ${r.pctLogrado}%`;
        band.className = `obj-general ${r.pctLogrado < 70 ? 'obj-general--low' : ''}`;
      }));

      root.querySelectorAll('[data-justificacion]').forEach(textarea => textarea.addEventListener('input', () => {
        TH.DB.actualizarJustificacionCriterio(obj.id, textarea.dataset.justificacion, textarea.value);
      }));

      const finalizarBtn = root.querySelector('#finalizarBtn');
      if (finalizarBtn) finalizarBtn.addEventListener('click', () => {
        const sinJustificar = obj.criterios.find(c => c.avance < 70 && !(c.justificacion || '').trim());
        if (sinJustificar) {
          UI.toast(`Agrega una justificación para "${sinJustificar.nombre}" antes de finalizar (avance por debajo del 70%).`);
          return;
        }
        const res = TH.DB.avanzarEstadoObjetivo(obj.id, 'Finalizada');
        if (!res.ok) { UI.toast(res.error); return; }
        TH.DB.notificar(colaborador.id, 'Evaluación de desempeño finalizada', `${ctx.usuario.nombre} finalizó tu evaluación de desempeño del período ${periodo.nombre}.`);
        UI.toast('Evaluación de desempeño finalizada correctamente.');
        pintarLista();
        THPanel.refreshBadges();
      });
    }

    pintarLista();
  };

  /* =======================================================================
     RESULTADOS DE DESEMPEÑO
  ======================================================================= */

  window.Modules.resultadosDesempeno = function (root, ctx) {
    const visibles = TH.DB.colaboradoresVisiblesPara(ctx.usuario).filter(u => u.estado === 'Activo');
    let colaboradorId = (ctx.params && ctx.params.colaboradorId) || (visibles[0] && visibles[0].id);
    let periodoId = (TH.DB.periodoActivo(TIPO) || TH.DB.periodosPorTipo(TIPO)[0] || {}).id;

    function pintar() {
      if (!colaboradorId || !periodoId) {
        root.innerHTML = `<div class="panel"><div class="empty-state"><h3>Sin datos disponibles</h3><p>No hay colaboradores o períodos de Desempeño dentro del alcance de tu rol todavía.</p></div></div>`;
        return;
      }
      const colaborador = TH.DB.usuario(colaboradorId);
      const periodo = TH.DB.periodo(periodoId);
      const objetivo = TH.DB.objetivoDe(colaboradorId, periodoId);
      const r = objetivo ? TH.calcResultadoObjetivo(objetivo) : null;
      const evaluador = objetivo ? TH.DB.usuario(objetivo.evaluadorId) : null;
      const historial = TH.DB.historialDesempenoDe(colaboradorId).filter(h => h.periodo.estado === 'Cerrado');

      root.innerHTML = `
        <div class="filters-bar">
          ${visibles.length > 1 ? `
            <div class="field field--grow">
              <label>Colaborador</label>
              <select id="colabSelect">${visibles.map(u => `<option value="${u.id}" ${u.id === colaboradorId ? 'selected' : ''}>${u.nombre} — ${u.cargo}</option>`).join('')}</select>
            </div>
          ` : ''}
          <div class="field">
            <label>Período</label>
            <select id="periodoSelect">${TH.DB.periodosPorTipo(TIPO).map(p => `<option value="${p.id}" ${p.id === periodoId ? 'selected' : ''}>${p.nombre}${p.estado === 'Activo' ? ' · Activo' : ''}</option>`).join('')}</select>
          </div>
        </div>

        <div class="panel" style="margin-bottom:18px;">
          <p class="section-label">${colaborador.nombre} · ${colaborador.cargo} — evaluado por ${evaluador ? evaluador.nombre : '—'}</p>
        </div>

        ${!objetivo ? `
          <div class="panel"><div class="empty-state">
            <div class="empty-state__icon">${THPanel.icon('resultados')}</div>
            <h3>Sin objetivos cargados</h3>
            <p>${colaborador.nombre} no tiene objetivos de desempeño cargados en ${periodo.nombre}.</p>
          </div></div>
        ` : `
          <div class="panel" style="margin-bottom:18px;">
            <p class="section-label">Resultado por objetivo</p>
            <div class="obj-list">
              ${objetivo.criterios.map(c => `
                <div class="obj-card">
                  <div class="obj-card__head">
                    <h4 class="obj-card__title">${c.nombre}</h4>
                    <span class="pill pill--neutral obj-card__badge">Seguimiento</span>
                  </div>
                  <div class="obj-card__meta">
                    <div class="obj-card__stat"><span>Meta</span><strong>100%</strong></div>
                    <div class="obj-card__stat"><span>Peso</span><strong>${c.peso}%</strong></div>
                    <div class="obj-card__stat"><span>Avance</span><strong>${c.avance}%</strong></div>
                  </div>
                  <div class="obj-card__progress">
                    <div class="obj-card__bar" style="flex:1;"><div class="obj-card__fill obj-card__fill--${claseAvance(c.avance)}" style="width:${c.avance}%"></div></div>
                    <span class="obj-card__pct">${c.avance}%</span>
                  </div>
                  ${c.avance < 70 && c.justificacion ? `
                    <div class="obj-card__justificacion">
                      <label>Justificación</label>
                      <p style="margin:0;font-size:.82rem;color:var(--navy-900);">${UI.escapeHtml(c.justificacion)}</p>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
            <div class="obj-general ${r.pctLogrado < 70 ? 'obj-general--low' : ''}">Avance General ${r.pctLogrado}%</div>
          </div>

          <div class="panel">
            <p class="section-label">Resultado ponderado del período</p>
            <div class="summary-chips" style="margin-bottom:10px;">
              <div class="summary-chip"><span>Resultado</span><strong>${r.pctLogrado}%</strong></div>
              <div class="summary-chip"><span>Nivel alcanzado</span><strong>${r.descriptor}</strong></div>
              <div class="summary-chip"><span>Estado</span><strong>${objetivo.estado}</strong></div>
              <div class="summary-chip"><span>Criterios al 100%</span><strong>${r.criteriosCompletos}/${r.totalCriterios}</strong></div>
            </div>
            ${!r.pesoOk ? `<p style="color:var(--amber-600,#b45309);font-size:.8rem;margin:6px 0 0;">Los pesos de los criterios suman ${r.pesoTotal}% (deberían sumar 100%).</p>` : ''}
          </div>

          ${historial.length ? `
            <div class="panel" style="margin-top:18px;">
              <p class="section-label">Histórico de resultados cerrados</p>
              <div class="trend-row">
                ${historial.map(h => `
                  <div class="trend-bar">
                    <span class="trend-bar__value">${h.resultado.pctLogrado}%</span>
                    <div class="trend-bar__col" style="height:${Math.max(6, h.resultado.pctLogrado)}%"></div>
                    <span class="trend-bar__label">${h.periodo.nombre.replace('Desempeño · ', '')}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        `}
      `;

      const colabSelect = root.querySelector('#colabSelect');
      if (colabSelect) colabSelect.addEventListener('change', e => { colaboradorId = e.target.value; pintar(); });
      root.querySelector('#periodoSelect').addEventListener('change', e => { periodoId = e.target.value; pintar(); });
    }

    pintar();
  };

  /* =======================================================================
     INFORMES DE DESEMPEÑO (PDF) — misma plantilla que Competencias 360°
     (ver js/pdf-plantilla.js): encabezado con logo, franja de datos,
     tabla de criterios y pie de página. Lo que cambia es el contenido:
     aquí se listan criterios/peso/avance en vez de competencias.
  ======================================================================= */

  function informeIndividualDesempeno(colaboradorId, periodoId) {
    const P = window.PdfPlantilla;
    const colaborador = TH.DB.usuario(colaboradorId);
    const periodo = TH.DB.periodo(periodoId);
    const objetivo = TH.DB.objetivoDe(colaboradorId, periodoId);
    const evaluador = objetivo ? TH.DB.usuario(objetivo.evaluadorId) : null;
    const r = objetivo ? TH.calcResultadoObjetivo(objetivo) : null;

    const { doc, y: y0 } = P.nuevoDoc('Informe individual de desempeño por objetivos', 'Evaluación por objetivos · ' + periodo.nombre);

    const campos = [
      { etiqueta: 'Colaborador', valor: colaborador.nombre },
      { etiqueta: 'Cargo', valor: colaborador.cargo },
      { etiqueta: 'Evaluador', valor: evaluador ? evaluador.nombre : 'Sin asignar' },
      { etiqueta: 'Periodo', valor: periodo.nombre },
      { etiqueta: 'Nivel', valor: r ? r.descriptor : 'Sin datos' }
    ];
    let y = P.dibujarCampos(doc, campos, y0);

    if (!objetivo) {
      P.dibujarParrafo(doc, 'Este colaborador no tiene objetivos cargados en este periodo.', y + 4, { italic: true });
    } else {
      const tabla = P.dibujarTabla(doc, {
        y: y + 5,
        columnas: [
          { titulo: 'Criterio', ancho: 122, align: 'left' },
          { titulo: 'Peso', ancho: 30, align: 'right' },
          { titulo: 'Avance', ancho: 30, align: 'right', bold: true }
        ],
        filas: objetivo.criterios.map(c => [c.nombre, c.peso + '%', c.avance + '%']),
        caja: true
      });
      y = tabla.next;

      y = P.dibujarSeccion(doc, 'Resultado ponderado: ' + r.pctLogrado + '% · Nivel: ' + r.descriptor, y - 6);
      const rec = r.pctLogrado < 60
        ? 'Se recomienda un plan de acompañamiento para cerrar la brecha frente a las metas definidas.'
        : 'El colaborador avanza de forma favorable frente a sus objetivos del periodo.';
      y = P.dibujarParrafo(doc, rec, y);

      const bajaCalificacion = objetivo.criterios.filter(c => c.avance < 70 && c.justificacion);
      if (bajaCalificacion.length) {
        y = P.dibujarSeccion(doc, 'Justificación de objetivos con baja calificación', y);
        bajaCalificacion.forEach(c => {
          y = P.dibujarParrafo(doc, `"${c.nombre}" (${c.avance}%): ${c.justificacion}`, y);
        });
      }
    }

    P.dibujarPie(doc);
    doc.save(`informe-desempeno-${colaborador.nombre.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  }

  function informeGeneralDesempeno(periodoId) {
    const P = window.PdfPlantilla;
    const periodo = TH.DB.periodo(periodoId);
    const objetivos = TH.DB.objetivos().filter(o => o.periodoId === periodoId);
    const filas = objetivos.map(o => ({ colaborador: TH.DB.usuario(o.colaboradorId), resultado: TH.calcResultadoObjetivo(o) })).filter(f => f.colaborador);
    const promedio = filas.length ? TH.round1(TH.promedio(filas.map(f => f.resultado.pctLogrado))) : null;

    const { doc, y: y0 } = P.nuevoDoc('Informe general de desempeño por objetivos', 'Evaluación por objetivos · ' + periodo.nombre);

    const campos = [
      { etiqueta: 'Organización', valor: 'Todos los colaboradores' },
      { etiqueta: 'Colaboradores evaluados', valor: String(filas.length) },
      { etiqueta: 'Periodo', valor: periodo.nombre },
      { etiqueta: 'Promedio general', valor: promedio !== null ? promedio + '%' : 'Sin datos' }
    ];
    let y = P.dibujarCampos(doc, campos, y0);

    P.dibujarTabla(doc, {
      y: y + 5,
      columnas: [
        { titulo: 'Colaborador', ancho: 86, align: 'left' },
        { titulo: 'Cargo', ancho: 66, align: 'left' },
        { titulo: 'Resultado', ancho: 30, align: 'right', bold: true }
      ],
      filas: filas.map(f => [f.colaborador.nombre, f.colaborador.cargo, f.resultado.pctLogrado + '%']),
      caja: true
    });

    P.dibujarPie(doc);
    doc.save(`informe-general-desempeno-${periodo.nombre.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  }

  window.Modules.informesDesempeno = function (root, ctx) {
    const esAdmin = ctx.usuario.rolId === 'admin';
    const visibles = TH.DB.colaboradoresVisiblesPara(ctx.usuario).filter(u => u.estado === 'Activo');

    const tabs = [{ id: 'individual', label: 'Individual' }];
    if (esAdmin) tabs.push({ id: 'general', label: 'General' });
    let activo = 'individual';

    function pintar() {
      root.innerHTML = `
        <div class="tabs">${tabs.map(t => `<button type="button" class="tab-btn" data-tab="${t.id}" aria-selected="${t.id === activo}">${t.label}</button>`).join('')}</div>
        <div class="panel" id="tabContent"></div>
      `;
      root.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => { activo = b.dataset.tab; pintar(); }));
      const content = root.querySelector('#tabContent');

      if (activo === 'individual') {
        content.innerHTML = `
          <p class="section-label">Informe individual de desempeño por objetivos</p>
          <div class="form-grid">
            <div class="field"><label>Colaborador</label><select id="colabSel">${visibles.map(u => `<option value="${u.id}">${u.nombre} — ${u.cargo}</option>`).join('')}</select></div>
            <div class="field"><label>Período</label><select id="perSel">${TH.DB.periodosPorTipo(TIPO).map(p => `<option value="${p.id}" ${p.estado === 'Activo' ? 'selected' : ''}>${p.nombre}</option>`).join('')}</select></div>
          </div>
          <div class="modal-actions" style="justify-content:flex-start;">
            <button type="button" class="btn btn--primary" id="genBtn">Generar informe en PDF</button>
          </div>
        `;
        content.querySelector('#genBtn').addEventListener('click', () => {
          informeIndividualDesempeno(content.querySelector('#colabSel').value, content.querySelector('#perSel').value);
          UI.toast('Informe de desempeño generado.');
        });
      }

      if (activo === 'general') {
        content.innerHTML = `
          <p class="section-label">Informe general de Desempeño</p>
          <div class="form-grid">
            <div class="field field--full"><label>Período</label><select id="perSel">${TH.DB.periodosPorTipo(TIPO).map(p => `<option value="${p.id}" ${p.estado === 'Activo' ? 'selected' : ''}>${p.nombre}</option>`).join('')}</select></div>
          </div>
          <div class="modal-actions" style="justify-content:flex-start;">
            <button type="button" class="btn btn--primary" id="genBtn">Generar informe en PDF</button>
          </div>
        `;
        content.querySelector('#genBtn').addEventListener('click', () => {
          informeGeneralDesempeno(content.querySelector('#perSel').value);
          UI.toast('Informe general de desempeño generado.');
        });
      }
    }

    pintar();
  };

  /* =======================================================================
     RECOMENDACIONES DE DESEMPEÑO
  ======================================================================= */

  window.Modules.iaDesempeno = function (root, ctx) {
    const visibles = TH.DB.colaboradoresVisiblesPara(ctx.usuario).filter(u => u.rolId === 'colaborador' && u.estado === 'Activo');
    let colaboradorId = (ctx.params && ctx.params.colaboradorId) || (visibles[0] && visibles[0].id);

    function pintar() {
      if (!colaboradorId) {
        root.innerHTML = `<div class="panel"><div class="empty-state"><h3>Sin datos disponibles</h3><p>No hay colaboradores dentro del alcance de tu rol.</p></div></div>`;
        return;
      }
      const colaborador = TH.DB.usuario(colaboradorId);
      const periodoBase = TH.DB.periodosPorTipo(TIPO).slice().reverse().find(p => p.estado === 'Cerrado') || TH.DB.periodoActivo(TIPO);
      const objetivo = periodoBase ? TH.DB.objetivoDe(colaboradorId, periodoBase.id) : null;
      const r = objetivo ? TH.calcResultadoObjetivo(objetivo) : null;

      const clasificados = (objetivo ? objetivo.criterios : []).map(c => {
        let tier;
        if (c.avance >= 90) tier = 'fortaleza';
        else if (c.avance < 40) tier = 'alta';
        else if (c.avance < 70) tier = 'media';
        else tier = 'baja';
        return Object.assign({ tier }, c);
      }).sort((a, b) => ({ alta: 0, media: 1, baja: 2, fortaleza: 3 }[a.tier] - { alta: 0, media: 1, baja: 2, fortaleza: 3 }[b.tier]));

      const badgeLabel = { alta: 'Prioridad alta', media: 'Prioridad media', baja: 'Prioridad baja', fortaleza: 'Fortaleza' };
      const resumen = !r
        ? 'Aún no hay objetivos cargados o cerrados para generar un resumen automático.'
        : r.pctLogrado >= 90
          ? `${colaborador.nombre} presenta un desempeño sobresaliente en ${periodoBase.nombre}, con ${r.pctLogrado}% de cumplimiento ponderado de sus objetivos.`
          : r.pctLogrado >= 60
            ? `${colaborador.nombre} avanza de forma favorable en ${periodoBase.nombre} (${r.pctLogrado}% de cumplimiento), con oportunidades puntuales en algunos criterios.`
            : `${colaborador.nombre} registra ${r.pctLogrado}% de cumplimiento en ${periodoBase.nombre}, por debajo de lo esperado; se recomienda un plan de acompañamiento.`;

      root.innerHTML = `
        ${visibles.length > 1 ? `
          <div class="filters-bar">
            <div class="field field--grow"><label>Colaborador</label><select id="colabSelect">${visibles.map(u => `<option value="${u.id}" ${u.id === colaboradorId ? 'selected' : ''}>${u.nombre} — ${u.cargo}</option>`).join('')}</select></div>
          </div>
        ` : ''}

        <div class="panel" style="margin-bottom:18px;">
          <p class="section-label">Resumen automático — ${periodoBase ? periodoBase.nombre : '—'}</p>
          <p style="font-size:.9rem;line-height:1.6;margin:0;">${resumen}</p>
        </div>

        ${r ? `
          <div class="panel">
            <p class="section-label">Criterios por prioridad</p>
            <div class="reco-list">
              ${clasificados.map(c => `
                <div class="reco-card">
                  <span class="reco-card__badge reco-card__badge--${c.tier}">${badgeLabel[c.tier]}</span>
                  <div class="reco-card__body">
                    <h4>${c.nombre}</h4>
                    <p>${c.tier === 'fortaleza' ? 'Meta prácticamente cumplida; comparte cómo lo logró como referencia.' : c.tier === 'alta' ? 'Brecha importante frente a la meta: se recomienda un plan de acompañamiento dirigido.' : c.tier === 'media' ? 'Avance parcial: conviene reforzar con seguimiento periódico.' : 'Cerca de la meta; mantener el ritmo actual.'}</p>
                    ${c.avance < 70 && c.justificacion ? `<p style="margin-top:6px;"><strong>Justificación registrada:</strong> ${UI.escapeHtml(c.justificacion)}</p>` : ''}
                    <span class="reco-tag">Avance ${c.avance}% · Peso ${c.peso}%</span>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="ia-note">
              <svg viewBox="0 0 24 24"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>
              <span>Estas recomendaciones son generadas por IA como apoyo al análisis; el resultado oficial siempre se calcula con el peso y avance registrados en cada criterio.</span>
            </div>
          </div>
        ` : `<div class="panel"><p style="color:var(--ink-soft);font-size:.87rem;margin:0;">No hay objetivos cerrados para generar recomendaciones todavía.</p></div>`}
      `;

      const sel = root.querySelector('#colabSelect');
      if (sel) sel.addEventListener('change', e => { colaboradorId = e.target.value; pintar(); });
    }

    pintar();
  };

})();
