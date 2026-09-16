/* =========================================================================
   MODULES.ia — Recomendaciones de IA (RF-25)
   Apoyo de análisis sobre las competencias institucionales y específicas
   del nivel de cargo (SST se gestiona aparte, como ítem transversal).
   Nunca reemplaza los cálculos oficiales del sistema (RNF-14, RNF-16).
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  const META = 4.0; // "Supera" — referencia usada para priorizar recomendaciones

  function promedioPorCompetencia(colaboradorId, periodoId, tipoCargo) {
    const evs = TH.DB.evaluacionesDe(colaboradorId, periodoId).filter(e => e.tipoEvaluador !== 'SST');
    const acc = {}; // competenciaId -> [valores]
    evs.forEach(ev => {
      Object.entries(ev.calificaciones.indicadores || {}).forEach(([id, val]) => {
        if (val === 'NO') return;
        const info = TH.DB.indicadorInfo(id);
        if (!info) return;
        acc[info.competenciaId] = acc[info.competenciaId] || [];
        acc[info.competenciaId].push(Number(val));
      });
    });
    return TH.DB.competenciasAplicables(tipoCargo).map(c => {
      const vals = acc[c.id] || [];
      return { competencia: c, valor: vals.length ? TH.round1(TH.promedio(vals)) : null };
    }).filter(x => x.valor !== null);
  }

  window.Modules.ia = function (root, ctx) {
    const visibles = TH.DB.colaboradoresVisiblesPara(ctx.usuario).filter(u => u.rolId === 'colaborador' && u.estado === 'Activo');
    let colaboradorId = (ctx.params && ctx.params.colaboradorId) || (visibles[0] && visibles[0].id);

    function pintar() {
      if (!colaboradorId) {
        root.innerHTML = `<div class="panel"><div class="empty-state"><div class="empty-state__icon">${THPanel.icon('ia')}</div><h3>Sin datos disponibles</h3><p>No hay colaboradores dentro del alcance de tu rol para generar recomendaciones.</p></div></div>`;
        return;
      }

      const colaborador = TH.DB.usuario(colaboradorId);
      const periodoBase = TH.DB.periodosPorTipo('competencias').slice().reverse().find(p => p.estado === 'Cerrado') || TH.DB.periodoActivo();
      const consolidado = TH.DB.consolidar(colaboradorId, periodoBase.id);
      const items = promedioPorCompetencia(colaboradorId, periodoBase.id, colaborador.tipoCargo);

      const clasificados = items.map(x => {
        const brecha = TH.round1(META - x.valor);
        let tier;
        if (x.valor >= META) tier = 'fortaleza';
        else if (brecha > 1.2) tier = 'alta';
        else if (brecha >= 0.4) tier = 'media';
        else tier = 'baja';
        return Object.assign({ brecha, tier }, x);
      }).sort((a, b) => ({ alta: 0, media: 1, baja: 2, fortaleza: 3 }[a.tier] - { alta: 0, media: 1, baja: 2, fortaleza: 3 }[b.tier]));

      const fortalezas = clasificados.filter(c => c.tier === 'fortaleza').slice(0, 3);
      const oportunidades = clasificados.filter(c => c.tier === 'alta' || c.tier === 'media').slice(0, 3);
      const badgeLabel = { alta: 'Prioridad alta', media: 'Prioridad media', baja: 'Prioridad baja', fortaleza: 'Fortaleza' };

      const resumen = !consolidado
        ? 'Aún no hay resultados consolidados para generar un resumen automático.'
        : consolidado.scoreGeneral >= 4.2
          ? `${colaborador.nombre} presenta un desempeño sobresaliente en ${periodoBase.nombre}, con un resultado general de ${consolidado.scoreGeneral}/5 (${consolidado.descriptor}).`
          : consolidado.scoreGeneral >= 3.0
            ? `${colaborador.nombre} presenta un desempeño positivo en ${periodoBase.nombre} (${consolidado.scoreGeneral}/5, ${consolidado.descriptor}), con oportunidades puntuales de mejora en algunas competencias.`
            : `${colaborador.nombre} registra un resultado de ${consolidado.scoreGeneral}/5 (${consolidado.descriptor}) en ${periodoBase.nombre}, por debajo de la meta esperada; se recomienda un plan de acompañamiento.`;

      root.innerHTML = `
        ${visibles.length > 1 ? `
          <div class="filters-bar">
            <div class="field field--grow">
              <label>Colaborador</label>
              <select id="colabSelect">${visibles.map(u => `<option value="${u.id}" ${u.id === colaboradorId ? 'selected' : ''}>${u.nombre} — ${u.cargo}</option>`).join('')}</select>
            </div>
          </div>
        ` : ''}

        <div class="panel" style="margin-bottom:18px;">
          <p class="section-label">Resumen automático — ${periodoBase.nombre}</p>
          <p style="font-size:.9rem;line-height:1.6;margin:0;">${resumen}</p>
        </div>

        ${consolidado ? `
          <div class="stat-grid" style="margin-bottom:18px;">
            <div class="stat-tile" data-accent="red"><span>Resultado general</span><strong>${consolidado.scoreGeneral}/5</strong><small>${consolidado.pctGeneral}%</small></div>
            <div class="stat-tile"><span>Nivel alcanzado</span><strong>${consolidado.descriptor}</strong></div>
            <div class="stat-tile"><span>Meta de referencia</span><strong>${META}/5</strong><small>Nivel "Supera"</small></div>
          </div>

          <div class="panel">
            <p class="section-label">Fortalezas</p>
            <div class="chip-picker" style="margin-bottom:20px;">
              ${fortalezas.length ? fortalezas.map(f => `<span class="pill pill--ok">${f.competencia.nombre}</span>`).join('') : '<span class="pill pill--neutral">Aún no hay competencias por encima de la meta</span>'}
            </div>

            <p class="section-label">Oportunidades de mejora</p>
            <div class="chip-picker" style="margin-bottom:22px;">
              ${oportunidades.length ? oportunidades.map(o => `<span class="pill pill--warn">${o.competencia.nombre}</span>`).join('') : '<span class="pill pill--neutral">Sin brechas relevantes</span>'}
            </div>

            <p class="section-label">Recomendaciones</p>
            <div class="reco-list">
              ${clasificados.map(c => `
                <div class="reco-card">
                  <span class="reco-card__badge reco-card__badge--${c.tier}">${badgeLabel[c.tier]}</span>
                  <div class="reco-card__body">
                    <h4>${c.competencia.nombre}</h4>
                    <p>${recomendacionPara(c)}</p>
                    <span class="reco-tag">Resultado ${c.valor}/5 · Meta ${META}/5</span>
                  </div>
                </div>
              `).join('')}
            </div>

            <div class="ia-note">
              <svg viewBox="0 0 24 24"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>
              <span>Estas recomendaciones son generadas por IA como apoyo al análisis. Los resultados oficiales siempre se calculan con las reglas fijas del sistema (RNF-14) y el proceso de evaluación continúa funcionando aunque la IA no esté disponible (RNF-16).</span>
            </div>
          </div>
        ` : `<div class="panel"><p style="color:var(--ink-soft);font-size:.87rem;margin:0;">No hay evaluaciones calificadas en ${periodoBase.nombre} para generar recomendaciones.</p></div>`}
      `;

      const sel = root.querySelector('#colabSelect');
      if (sel) sel.addEventListener('change', e => { colaboradorId = e.target.value; pintar(); });
    }

    function recomendacionPara(c) {
      if (c.tier === 'fortaleza') return `Comparte tu forma de trabajar en "${c.competencia.nombre}" como referencia para el equipo.`;
      if (c.tier === 'alta') return `Se recomienda un plan de acompañamiento dirigido y capacitación específica en "${c.competencia.nombre}" durante el próximo período.`;
      if (c.tier === 'media') return `Refuerza "${c.competencia.nombre}" con retroalimentación periódica y práctica dirigida.`;
      return `Mantén el nivel actual en "${c.competencia.nombre}"; está cerca de la meta esperada.`;
    }

    pintar();
  };

})();
