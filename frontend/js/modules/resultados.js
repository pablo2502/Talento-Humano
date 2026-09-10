/* =========================================================================
   MODULES.resultados — Consulta de resultados (RF-14, RF-15, RF-16)
   Cada usuario consulta resultados según el alcance de su rol: un
   colaborador ve los suyos (y los de su equipo, si tiene personas a
   cargo); el administrador ve todos.
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

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

        <div class="panel" style="margin-bottom:18px;">
          <p class="section-label">${colaborador.nombre} · ${colaborador.cargo} · Nivel ${TH.TIPO_CARGO_LABEL[colaborador.tipoCargo]}</p>
        </div>

        ${evaluaciones.length === 0 ? `
          <div class="panel"><div class="empty-state">
            <div class="empty-state__icon">${THPanel.icon('resultados')}</div>
            <h3>Sin evaluaciones registradas</h3>
            <p>${colaborador.nombre} no tiene evaluaciones 360° en ${periodo.nombre}.</p>
          </div></div>
        ` : `
          <div class="panel" style="margin-bottom:18px;">
            <p class="section-label">Resultado por evaluador — RF-13: cada evaluación se conserva por separado</p>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Evaluador</th><th>Tipo</th><th>Estado</th><th>Institucional</th><th>Específico</th><th>Resultado</th></tr></thead>
                <tbody>
                  ${evaluaciones.map(ev => {
                    const evaluador = TH.DB.usuario(ev.evaluadorId);
                    const r = TH.DB.resultado(ev);
                    return `
                      <tr>
                        <td>${evaluador ? evaluador.nombre : '—'}${ev.tipoEvaluador === 'AUTO' ? ' <span class="cell-sub">(autoevaluación)</span>' : ''}</td>
                        <td>${TH.TIPOS_EVALUADOR[ev.tipoEvaluador]}</td>
                        <td><span class="pill ${['Consolidada', 'Cerrada', 'Finalizada'].includes(ev.estado) ? 'pill--ok' : (ev.estado === 'En proceso' ? 'pill--amber' : 'pill--pend')}">${ev.estado}</span></td>
                        <td>${r && r.scoreInstitucional !== null ? r.scoreInstitucional + '/5' : '—'}</td>
                        <td>${r && r.scoreEspecifico !== null ? r.scoreEspecifico + '/5' : '—'}</td>
                        <td><strong>${r ? r.score + '/5' : '—'}</strong></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          ${consolidado ? `
            <div class="panel">
              <p class="section-label">Resultado consolidado (RF-15)</p>
              <p style="color:var(--ink-soft);font-size:.8rem;margin:-6px 0 16px;">${consolidado.reglaConsolidacion}</p>
              <div class="summary-chips" style="margin-bottom:20px;">
                <div class="summary-chip"><span>Resultado general</span><strong>${consolidado.scoreGeneral}/5</strong></div>
                <div class="summary-chip"><span>Equivalente</span><strong>${consolidado.pctGeneral}%</strong></div>
                <div class="summary-chip"><span>Nivel alcanzado</span><strong>${consolidado.descriptor}</strong></div>
                <div class="summary-chip"><span>Evaluaciones</span><strong>${consolidado.evaluadoresCompletos}/${consolidado.evaluadoresAsignados} completadas</strong></div>
              </div>
              <div class="results">
                ${['JEFE', 'PAR', 'AUTO', 'SUBALTERNO', 'SST'].filter(t => consolidado.detalle[t] !== undefined).map(t => `
                  <div class="result-row">
                    <div class="result-row__label">${TH.TIPOS_EVALUADOR[t]}</div>
                    <div class="result-row__bar"><div class="result-row__fill" style="width:${consolidado.detalle[t] / 5 * 100}%"></div></div>
                    <div class="result-row__value">${consolidado.detalle[t]}/5</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : `<div class="panel"><p style="color:var(--ink-soft);font-size:.87rem;margin:0;">Aún no hay suficientes evaluaciones calificadas para consolidar el resultado de este período.</p></div>`}
        `}
      `;

      const colabSelect = root.querySelector('#colabSelect');
      if (colabSelect) colabSelect.addEventListener('change', e => { colaboradorId = e.target.value; pintar(); });
      root.querySelector('#periodoSelect').addEventListener('change', e => { periodoId = e.target.value; pintar(); });
    }

    pintar();
  };

})();
