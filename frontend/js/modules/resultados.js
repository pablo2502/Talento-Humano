/* =========================================================================
   MODULES.resultados — Consulta de resultados (RF-14, RF-15, RF-16)
   Cada usuario consulta resultados según el alcance de su rol.
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  const TIPO_LABEL = { JEFE: 'Jefe inmediato', GERENTE: 'Gerente', CLIENTE: 'Cliente / externo' };

  window.Modules.resultados = function (root, ctx) {
    const visibles = TH.DB.colaboradoresVisiblesPara(ctx.usuario).filter(u => u.estado === 'Activo');
    let colaboradorId = (ctx.params && ctx.params.colaboradorId) || (visibles[0] && visibles[0].id);
    let periodoId = TH.DB.periodoActivo().id;

    function pintar() {
      if (!colaboradorId) {
        root.innerHTML = `<div class="panel"><div class="empty-state"><div class="empty-state__icon">${THPanel.icon('resultados')}</div><h3>Sin colaboradores visibles</h3><p>No hay colaboradores dentro del alcance de tu rol todavía.</p></div></div>`;
        return;
      }

      const colaborador = TH.DB.usuario(colaboradorId);
      const periodo = TH.DB.periodo(periodoId);
      const evaluaciones = TH.DB.evaluacionesDe(colaboradorId, periodoId);
      const consolidado = TH.DB.consolidar(colaboradorId, periodoId);

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
            <select id="periodoSelect">${TH.DB.periodos().map(p => `<option value="${p.id}" ${p.id === periodoId ? 'selected' : ''}>${p.nombre}${p.estado === 'Activo' ? ' · Activo' : ''}</option>`).join('')}</select>
          </div>
        </div>

        ${evaluaciones.length === 0 ? `
          <div class="panel"><div class="empty-state">
            <div class="empty-state__icon">${THPanel.icon('resultados')}</div>
            <h3>Sin evaluaciones registradas</h3>
            <p>${colaborador.nombre} no tiene evaluaciones asignadas en ${periodo.nombre}.</p>
          </div></div>
        ` : `
          <div class="panel" style="margin-bottom:18px;">
            <p class="section-label">Resultado por evaluador — RF-13: cada evaluación se conserva por separado</p>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Evaluador</th><th>Tipo</th><th>Estado</th><th>Competencias</th><th>Comportamiento</th><th>General</th></tr></thead>
                <tbody>
                  ${evaluaciones.map(ev => {
                    const evaluador = TH.DB.usuario(ev.evaluadorId);
                    const r = TH.DB.resultado(ev);
                    const tieneAlgo = Object.keys(ev.calificaciones.competencias).length > 0;
                    return `
                      <tr>
                        <td>${evaluador ? evaluador.nombre : '—'}</td>
                        <td>${TIPO_LABEL[ev.tipoEvaluador] || ev.tipoEvaluador}</td>
                        <td><span class="pill ${['Consolidada', 'Cerrada', 'Finalizada'].includes(ev.estado) ? 'pill--ok' : (ev.estado === 'En proceso' ? 'pill--amber' : 'pill--pend')}">${ev.estado}</span></td>
                        <td>${tieneAlgo ? r.resultadoCompetencias + '%' : '—'}</td>
                        <td>${tieneAlgo ? r.resultadoComportamiento + '%' : '—'}</td>
                        <td><strong>${tieneAlgo ? r.resultadoGeneral + '%' : '—'}</strong></td>
                      </tr>
                    `;
                  }).join('')}
                  ${consolidado ? `
                    <tr style="background:var(--fog);">
                      <td colspan="3"><strong>Promedio consolidado</strong></td>
                      <td><strong>${consolidado.resultadoCompetencias}%</strong></td>
                      <td><strong>${consolidado.resultadoComportamiento}%</strong></td>
                      <td><strong>${consolidado.resultadoGeneral}%</strong></td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
            </div>
          </div>

          ${consolidado ? `
            <div class="panel">
              <p class="section-label">Resultado consolidado (RF-15) — regla: ${consolidado.reglaConsolidacion}</p>
              <div class="summary-chips">
                <div class="summary-chip"><span>Resultado general</span><strong>${consolidado.resultadoGeneral}%</strong></div>
                <div class="summary-chip"><span>Nivel alcanzado</span><strong>${TH.nivelPara(consolidado.resultadoGeneral)}</strong></div>
                <div class="summary-chip"><span>Evaluadores</span><strong>${consolidado.completas}/${consolidado.evaluadores} completados</strong></div>
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

})();
