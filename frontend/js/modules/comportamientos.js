/* =========================================================================
   MODULES.comportamientos — Comportamientos observables (RF-06)
   Referencia de solo lectura: cada indicador tiene una redacción distinta
   del comportamiento observable según quién evalúa (Autoevaluación, Jefe,
   Par, Subalterno); la competencia de SST usa una redacción según el nivel
   de cargo de la persona evaluada en lugar de por actor.
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  window.Modules.comportamientos = function (root, ctx) {
    const competencias = TH.DB.competenciasTodas();
    let competenciaId = competencias[0] ? competencias[0].id : null;

    function pintar() {
      const competencia = TH.DB.competenciaPorId(competenciaId);

      root.innerHTML = `
        <div class="filters-bar">
          <div class="field field--grow">
            <label>Competencia</label>
            <select id="compSelect">
              ${competencias.map(c => `<option value="${c.id}" ${c.id === competenciaId ? 'selected' : ''}>${c.nombre} (${c.tipo === 'sst' ? 'SST' : TH.TIPO_CARGO_LABEL[c.tipo] || 'Institucional'})</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="panel">
          <p class="section-label">${competencia.nombre}</p>
          <div class="criteria">
            ${competencia.indicadores.map(ind => {
              if (competencia.tipo === 'sst') {
                return `
                  <div class="criterion">
                    <div class="criterion__top"><h4>${ind.nombre}</h4></div>
                    <div class="form-grid">
                      <div class="field field--full"><label>Cargos Estratégicos y Tácticos</label><p style="margin:4px 0 0;font-size:.85rem;color:var(--navy-900);">${ind.comportamientos.estrategico_tactico}</p></div>
                      <div class="field field--full"><label>Cargos de Apoyo</label><p style="margin:4px 0 0;font-size:.85rem;color:var(--navy-900);">${ind.comportamientos.apoyo}</p></div>
                    </div>
                  </div>
                `;
              }
              return `
                <div class="criterion">
                  <div class="criterion__top"><h4>${ind.nombre}</h4></div>
                  <div class="form-grid">
                    <div class="field field--full"><label>${TH.TIPOS_EVALUADOR.AUTO}</label><p style="margin:4px 0 0;font-size:.85rem;color:var(--navy-900);">${ind.comportamientos.auto}</p></div>
                    <div class="field field--full"><label>${TH.TIPOS_EVALUADOR.JEFE}</label><p style="margin:4px 0 0;font-size:.85rem;color:var(--navy-900);">${ind.comportamientos.jefe}</p></div>
                    <div class="field field--full"><label>${TH.TIPOS_EVALUADOR.PAR}</label><p style="margin:4px 0 0;font-size:.85rem;color:var(--navy-900);">${ind.comportamientos.par}</p></div>
                    <div class="field field--full"><label>${TH.TIPOS_EVALUADOR.SUBALTERNO}</label><p style="margin:4px 0 0;font-size:.85rem;color:var(--navy-900);">${ind.comportamientos.subalterno}</p></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      root.querySelector('#compSelect').addEventListener('change', e => { competenciaId = e.target.value; pintar(); });
    }

    pintar();
  };

})();
