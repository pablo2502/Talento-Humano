/* =========================================================================
   MODULES.seguimiento — Evolución del desempeño entre períodos (RF-17, RF-18)
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  function promedioPorItem(colaboradorId, periodoId, tipo) {
    const evs = TH.DB.evaluacionesDe(colaboradorId, periodoId);
    const acc = {};
    evs.forEach(ev => {
      Object.entries(ev.calificaciones[tipo] || {}).forEach(([id, val]) => {
        acc[id] = acc[id] || [];
        acc[id].push(val);
      });
    });
    const out = {};
    Object.entries(acc).forEach(([id, vals]) => { out[id] = TH.round1(TH.promedio(vals)); });
    return out;
  }

  window.Modules.seguimiento = function (root, ctx) {
    const visibles = TH.DB.colaboradoresVisiblesPara(ctx.usuario).filter(u => u.estado === 'Activo' && u.rolId === 'colaborador');
    let colaboradorId = (ctx.params && ctx.params.colaboradorId) || (visibles[0] && visibles[0].id);

    function pintar() {
      if (!colaboradorId) {
        root.innerHTML = `<div class="panel"><div class="empty-state"><div class="empty-state__icon">${THPanel.icon('seguimiento')}</div><h3>Sin colaboradores visibles</h3><p>No hay colaboradores dentro del alcance de tu rol.</p></div></div>`;
        return;
      }

      const colaborador = TH.DB.usuario(colaboradorId);
      const historial = TH.DB.historialDe(colaboradorId).filter(h => h.periodo.estado === 'Cerrado');

      if (!historial.length) {
        root.innerHTML = `
          ${visibles.length > 1 ? selectorHtml() : ''}
          <div class="panel"><div class="empty-state"><div class="empty-state__icon">${THPanel.icon('seguimiento')}</div><h3>Sin historial todavía</h3><p>${colaborador.nombre} aún no tiene períodos cerrados para mostrar evolución.</p></div></div>
        `;
        wireSelector();
        return;
      }

      const primero = historial[0];
      const ultimo = historial[historial.length - 1];

      const compPrimero = promedioPorItem(colaboradorId, primero.periodo.id, 'competencias');
      const compUltimo = promedioPorItem(colaboradorId, ultimo.periodo.id, 'competencias');
      const cambios = Object.keys(compUltimo)
        .filter(id => compPrimero[id] !== undefined)
        .map(id => ({ competencia: TH.DB.competencia(id), delta: TH.round1(compUltimo[id] - compPrimero[id]), actual: compUltimo[id] }))
        .filter(c => c.competencia)
        .sort((a, b) => b.delta - a.delta);

      const crecimiento = cambios.filter(c => c.delta > 0).slice(0, 3);
      const disminucion = cambios.filter(c => c.delta < 0).slice(-3).reverse();

      const objetivoNivel = 80;
      const cumplimiento = ultimo.consolidado.resultadoGeneral >= objetivoNivel;

      root.innerHTML = `
        ${visibles.length > 1 ? selectorHtml() : ''}

        <div class="panel" style="margin-bottom:18px;">
          <p class="section-label">Evolución general — resultado consolidado por período (RF-17)</p>
          <div class="trend-row">
            ${historial.map(h => `
              <div class="trend-bar">
                <span class="trend-bar__value">${h.consolidado.resultadoGeneral}%</span>
                <div class="trend-bar__col" style="height:${Math.max(6, h.consolidado.resultadoGeneral)}%"></div>
                <span class="trend-bar__label">${h.periodo.nombre.replace('20', "'")}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="panel" style="margin-bottom:18px;">
          <p class="section-label">Evolución por dimensión</p>
          <div class="results">
            <div class="result-row"><div class="result-row__label">Competencias — ${ultimo.periodo.nombre}</div><div class="result-row__bar"><div class="result-row__fill" style="width:${ultimo.consolidado.resultadoCompetencias}%"></div></div><div class="result-row__value">${ultimo.consolidado.resultadoCompetencias}%</div></div>
            <div class="result-row"><div class="result-row__label">Comportamiento — ${ultimo.periodo.nombre}</div><div class="result-row__bar"><div class="result-row__fill" style="width:${ultimo.consolidado.resultadoComportamiento}%"></div></div><div class="result-row__value">${ultimo.consolidado.resultadoComportamiento}%</div></div>
          </div>
        </div>

        <div class="stat-grid" style="margin-bottom:18px;">
          <div class="stat-tile" data-accent="${cumplimiento ? 'green' : 'amber'}">
            <span>Cumplimiento de objetivos</span>
            <strong>${cumplimiento ? 'Cumplido' : 'En progreso'}</strong>
            <small>Meta institucional: ${objetivoNivel}% · Resultado actual: ${ultimo.consolidado.resultadoGeneral}%</small>
          </div>
          <div class="stat-tile"><span>Nivel alcanzado</span><strong>${TH.nivelPara(ultimo.consolidado.resultadoGeneral)}</strong></div>
        </div>

        <div class="panel">
          <p class="section-label">Competencias con mayor crecimiento y disminución</p>
          <div class="form-grid">
            <div class="field field--full">
              <label>Mayor crecimiento</label>
              <div class="chip-picker">
                ${crecimiento.length ? crecimiento.map(c => `<span class="pill pill--ok">${c.competencia.nombre} +${c.delta}%</span>`).join('') : '<span class="pill pill--neutral">Sin variaciones positivas relevantes</span>'}
              </div>
            </div>
            <div class="field field--full">
              <label>Mayor disminución</label>
              <div class="chip-picker">
                ${disminucion.length ? disminucion.map(c => `<span class="pill pill--warn">${c.competencia.nombre} ${c.delta}%</span>`).join('') : '<span class="pill pill--neutral">Sin variaciones negativas relevantes</span>'}
              </div>
            </div>
          </div>
          <div class="ia-note">
            <svg viewBox="0 0 24 24"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>
            <span>Comparación entre ${primero.periodo.nombre} y ${ultimo.periodo.nombre}. Consulta el módulo "Recomendaciones IA" para sugerencias de mejora basadas en estos resultados.</span>
          </div>
        </div>
      `;

      wireSelector();
    }

    function selectorHtml() {
      return `
        <div class="filters-bar">
          <div class="field field--grow">
            <label>Colaborador</label>
            <select id="colabSelect">${visibles.map(u => `<option value="${u.id}" ${u.id === colaboradorId ? 'selected' : ''}>${u.nombre} — ${u.cargo}</option>`).join('')}</select>
          </div>
        </div>
      `;
    }

    function wireSelector() {
      const sel = root.querySelector('#colabSelect');
      if (sel) sel.addEventListener('change', e => { colaboradorId = e.target.value; pintar(); });
    }

    pintar();
  };

})();
