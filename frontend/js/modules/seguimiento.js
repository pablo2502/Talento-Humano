/* =========================================================================
   MODULES.seguimiento — Evolución del desempeño entre períodos (RF-17, RF-18)
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  // Promedio por indicador (excluyendo SST) a través de todas las
  // evaluaciones de un colaborador en un período, para detectar avances.
  function promedioPorIndicador(colaboradorId, periodoId) {
    const evs = TH.DB.evaluacionesDe(colaboradorId, periodoId).filter(e => e.tipoEvaluador !== 'SST');
    const acc = {};
    evs.forEach(ev => {
      Object.entries(ev.calificaciones.indicadores || {}).forEach(([id, val]) => {
        if (val === 'NO') return;
        acc[id] = acc[id] || [];
        acc[id].push(Number(val));
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

      const indPrimero = promedioPorIndicador(colaboradorId, primero.periodo.id);
      const indUltimo = promedioPorIndicador(colaboradorId, ultimo.periodo.id);
      const cambios = Object.keys(indUltimo)
        .filter(id => indPrimero[id] !== undefined)
        .map(id => {
          const info = TH.DB.indicadorInfo(id);
          return info ? { nombre: info.indicadorNombre, competencia: info.competenciaNombre, delta: TH.round1(indUltimo[id] - indPrimero[id]), actual: indUltimo[id] } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.delta - a.delta);

      const crecimiento = cambios.filter(c => c.delta > 0).slice(0, 3);
      const disminucion = cambios.filter(c => c.delta < 0).slice(-3).reverse();

      const objetivoScore = 4.0; // "Supera" — meta institucional de referencia
      const cumplimiento = ultimo.consolidado.scoreGeneral >= objetivoScore;

      root.innerHTML = `
        ${visibles.length > 1 ? selectorHtml() : ''}

        <div class="panel" style="margin-bottom:18px;">
          <p class="section-label">Evolución general — resultado consolidado por período (RF-17)</p>
          <div class="trend-row">
            ${historial.map(h => `
              <div class="trend-bar">
                <span class="trend-bar__value">${h.consolidado.scoreGeneral}/5</span>
                <div class="trend-bar__col" style="height:${Math.max(6, h.consolidado.pctGeneral)}%"></div>
                <span class="trend-bar__label">${h.periodo.nombre.replace('20', "'")}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="panel" style="margin-bottom:18px;">
          <p class="section-label">Resultado por tipo de evaluador — ${ultimo.periodo.nombre}</p>
          <div class="results">
            ${['JEFE', 'PAR', 'AUTO', 'SUBALTERNO', 'SST'].filter(t => ultimo.consolidado.detalle[t] !== undefined).map(t => `
              <div class="result-row">
                <div class="result-row__label">${TH.TIPOS_EVALUADOR[t]}</div>
                <div class="result-row__bar"><div class="result-row__fill" style="width:${ultimo.consolidado.detalle[t] / 5 * 100}%"></div></div>
                <div class="result-row__value">${ultimo.consolidado.detalle[t]}/5</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="stat-grid" style="margin-bottom:18px;">
          <div class="stat-tile" data-accent="${cumplimiento ? 'green' : 'amber'}">
            <span>Cumplimiento de objetivos</span>
            <strong>${cumplimiento ? 'Cumplido' : 'En progreso'}</strong>
            <small>Meta de referencia: ${objetivoScore}/5 · Resultado actual: ${ultimo.consolidado.scoreGeneral}/5</small>
          </div>
          <div class="stat-tile"><span>Nivel alcanzado</span><strong>${ultimo.consolidado.descriptor}</strong></div>
        </div>

        <div class="panel">
          <p class="section-label">Indicadores con mayor crecimiento y disminución</p>
          <div class="form-grid">
            <div class="field field--full">
              <label>Mayor crecimiento</label>
              <div class="chip-picker">
                ${crecimiento.length ? crecimiento.map(c => `<span class="pill pill--ok">${c.nombre} +${c.delta}</span>`).join('') : '<span class="pill pill--neutral">Sin variaciones positivas relevantes</span>'}
              </div>
            </div>
            <div class="field field--full">
              <label>Mayor disminución</label>
              <div class="chip-picker">
                ${disminucion.length ? disminucion.map(c => `<span class="pill pill--warn">${c.nombre} ${c.delta}</span>`).join('') : '<span class="pill pill--neutral">Sin variaciones negativas relevantes</span>'}
              </div>
            </div>
          </div>
          <div class="ia-note">
            <svg viewBox="0 0 24 24"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>
            <span>Comparación entre ${primero.periodo.nombre} y ${ultimo.periodo.nombre} (escala 1-5). Consulta el módulo "Recomendaciones IA" para sugerencias de mejora basadas en estos resultados.</span>
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
