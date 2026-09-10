/* =========================================================================
   MODULES.competencias — Catálogo de competencias 360° (RF-05)
   Diccionario real institucional: competencias comunes a todos los cargos,
   competencias específicas por nivel (Estratégico/Táctico/Apoyo) y la
   competencia transversal de SST. Catálogo de solo lectura: es el marco
   metodológico oficial de la evaluación 360°.
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  const TABS = [
    { id: 'institucional', label: 'Institucionales' },
    { id: 'estrategico', label: 'Estratégico' },
    { id: 'tactico', label: 'Táctico' },
    { id: 'apoyo', label: 'Apoyo' },
    { id: 'sst', label: 'SST' }
  ];

  window.Modules.competencias = function (root, ctx) {
    let activo = 'institucional';

    function pintar() {
      const items = TH.DB.competenciasTodas().filter(c => c.tipo === activo);

      root.innerHTML = `
        <div class="tabs">
          ${TABS.map(t => `<button type="button" class="tab-btn" data-tab="${t.id}" aria-selected="${t.id === activo}">${t.label}</button>`).join('')}
        </div>

        <div class="modules-grid">
          ${items.map(c => `
            <div class="card">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;">
                <div>
                  <h3 style="font-size:1rem;">${c.nombre}</h3>
                  <p style="color:var(--ink-soft);font-size:.76rem;margin:2px 0 0;">${c.codigo}</p>
                </div>
              </div>
              <p style="color:var(--ink-soft);font-size:.83rem;line-height:1.55;margin:0 0 12px;">${c.descripcion}</p>
              <p class="section-label" style="margin-bottom:6px;">Indicadores (${c.indicadores.length})</p>
              <div class="chip-picker">
                ${c.indicadores.map(i => `<span class="chip chip--static">${i.nombre}</span>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;

      root.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => { activo = btn.dataset.tab; pintar(); }));
    }

    pintar();
  };

})();
