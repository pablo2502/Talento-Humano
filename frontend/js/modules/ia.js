/* =========================================================================
   MODULES.ia — Recomendaciones de IA (RF-25)
   Apoyo de análisis: nunca reemplaza los cálculos oficiales del sistema
   (RNF-14, RNF-16).
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  const NIVEL_META = { 'Básico': 65, 'Intermedio': 80, 'Avanzado': 90 };

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

  window.Modules.ia = function (root, ctx) {
    const visibles = TH.DB.colaboradoresVisiblesPara(ctx.usuario).filter(u => u.rolId === 'colaborador' && u.estado === 'Activo');
    let colaboradorId = (ctx.params && ctx.params.colaboradorId) || (visibles[0] && visibles[0].id);

    function pintar() {
      if (!colaboradorId) {
        root.innerHTML = `<div class="panel"><div class="empty-state"><div class="empty-state__icon">${THPanel.icon('ia')}</div><h3>Sin datos disponibles</h3><p>No hay colaboradores dentro del alcance de tu rol para generar recomendaciones.</p></div></div>`;
        return;
      }

      const colaborador = TH.DB.usuario(colaboradorId);
      const perfil = colaborador.perfilId ? TH.DB.perfil(colaborador.perfilId) : null;
      const meta = NIVEL_META[perfil ? perfil.nivelEsperado : 'Intermedio'] || 80;

      const periodoBase = TH.DB.periodos().slice().reverse().find(p => p.estado === 'Cerrado') || TH.DB.periodoActivo();
      const consolidado = TH.DB.consolidar(colaboradorId, periodoBase.id);

      const compProm = promedioPorItem(colaboradorId, periodoBase.id, 'competencias');
      const comportProm = promedioPorItem(colaboradorId, periodoBase.id, 'comportamientos');

      const items = [
        ...Object.entries(compProm).map(([id, valor]) => ({ item: TH.DB.competencia(id), valor, dim: 'Competencia' })),
        ...Object.entries(comportProm).map(([id, valor]) => ({ item: TH.DB.comportamiento(id), valor, dim: 'Comportamiento' }))
      ].filter(x => x.item);

      const clasificados = items.map(x => {
        const brecha = TH.round1(meta - x.valor);
        let tier;
        if (x.valor >= meta) tier = 'fortaleza';
        else if (brecha > 15) tier = 'alta';
        else if (brecha >= 5) tier = 'media';
        else tier = 'baja';
        return Object.assign({ brecha, tier }, x);
      }).sort((a, b) => ({ alta: 0, media: 1, baja: 2, fortaleza: 3 }[a.tier] - { alta: 0, media: 1, baja: 2, fortaleza: 3 }[b.tier]));

      const fortalezas = clasificados.filter(c => c.tier === 'fortaleza').slice(0, 3);
      const oportunidades = clasificados.filter(c => c.tier === 'alta' || c.tier === 'media').slice(0, 3);

      const badgeLabel = { alta: 'Prioridad alta', media: 'Prioridad media', baja: 'Prioridad baja', fortaleza: 'Fortaleza' };

      const resumen = !consolidado
        ? 'Aún no hay resultados consolidados para generar un resumen automático.'
        : consolidado.resultadoGeneral >= 85
          ? `${colaborador.nombre} presenta un desempeño sobresaliente en ${periodoBase.nombre}, con un resultado general de ${consolidado.resultadoGeneral}%, destacándose especialmente en comportamiento.`
          : consolidado.resultadoGeneral >= 70
            ? `${colaborador.nombre} presenta un desempeño positivo en ${periodoBase.nombre} (${consolidado.resultadoGeneral}%), con oportunidades puntuales de mejora en algunas competencias.`
            : `${colaborador.nombre} registra un resultado de ${consolidado.resultadoGeneral}% en ${periodoBase.nombre}, por debajo de la meta esperada; se recomienda un plan de acompañamiento.`;

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
            <div class="stat-tile" data-accent="red"><span>Resultado general</span><strong>${consolidado.resultadoGeneral}%</strong></div>
            <div class="stat-tile"><span>Nivel alcanzado</span><strong>${TH.nivelPara(consolidado.resultadoGeneral)}</strong></div>
            <div class="stat-tile"><span>Meta del perfil</span><strong>${meta}%</strong><small>${perfil ? perfil.nombre : 'General'}</small></div>
          </div>

          <div class="panel">
            <p class="section-label">Fortalezas</p>
            <div class="chip-picker" style="margin-bottom:20px;">
              ${fortalezas.length ? fortalezas.map(f => `<span class="pill pill--ok">${f.item.nombre}</span>`).join('') : '<span class="pill pill--neutral">Aún no hay fortalezas por encima de la meta</span>'}
            </div>

            <p class="section-label">Oportunidades de mejora</p>
            <div class="chip-picker" style="margin-bottom:22px;">
              ${oportunidades.length ? oportunidades.map(o => `<span class="pill pill--warn">${o.item.nombre}</span>`).join('') : '<span class="pill pill--neutral">Sin brechas relevantes</span>'}
            </div>

            <p class="section-label">Recomendaciones</p>
            <div class="reco-list">
              ${clasificados.map(c => `
                <div class="reco-card">
                  <span class="reco-card__badge reco-card__badge--${c.tier}">${badgeLabel[c.tier]}</span>
                  <div class="reco-card__body">
                    <h4>${c.dim}: ${c.item.nombre}</h4>
                    <p>${recomendacionPara(c)}</p>
                    <span class="reco-tag">Resultado ${c.valor}% · Meta ${meta}%</span>
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
      if (c.tier === 'fortaleza') return `Comparte tu forma de trabajar en "${c.item.nombre}" como referencia para el equipo.`;
      if (c.tier === 'alta') return `Se recomienda un plan de acompañamiento dirigido y capacitación específica en "${c.item.nombre}" durante el próximo período.`;
      if (c.tier === 'media') return `Refuerza "${c.item.nombre}" con retroalimentación periódica y práctica dirigida.`;
      return `Mantén el nivel actual en "${c.item.nombre}"; está cerca de la meta esperada.`;
    }

    pintar();
  };

})();
