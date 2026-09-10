/* =========================================================================
   MODULES.evaluadores — Asignación 360° (RF-09, RF-10, RF-28)
   Las evaluaciones se generan automáticamente a partir de la estructura
   organizacional al activar un período: Autoevaluación siempre, Jefe si
   existe, un registro por cada Par, uno por cada Subalterno directo
   (condicionado a que existan) y un ítem de SST evaluado por el jefe.
   Este módulo es de consulta; para reasignar a alguien, edita su jefe
   inmediato en el módulo Usuarios y vuelve a generar el período.
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  const TIPOS = ['AUTO', 'JEFE', 'PAR', 'SUBALTERNO', 'SST'];

  window.Modules.evaluadores = function (root, ctx) {
    let periodoId = TH.DB.periodoActivo().id;

    function pintar() {
      const periodo = TH.DB.periodo(periodoId);
      const colaboradores = TH.DB.usuarios().filter(u => u.rolId === 'colaborador' && u.estado === 'Activo');
      const evaluacionesPeriodo = TH.DB.evaluaciones().filter(e => e.periodoId === periodoId);

      root.innerHTML = `
        <div class="filters-bar">
          <div class="field field--grow">
            <label>Período</label>
            <select id="periodoSelect">
              ${TH.DB.periodos().map(p => `<option value="${p.id}" ${p.id === periodoId ? 'selected' : ''}>${p.nombre}${p.estado === 'Activo' ? ' · Activo' : ''}</option>`).join('')}
            </select>
          </div>
          ${evaluacionesPeriodo.length === 0 ? `<button type="button" class="btn btn--dark" id="generarBtn">Generar evaluaciones 360°</button>` : ''}
        </div>

        <div class="panel">
          <p class="section-label">Evaluaciones 360° generadas para ${periodo.nombre} (RF-09, RF-28)</p>
          ${evaluacionesPeriodo.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state__icon">${THPanel.icon('evaluadores')}</div>
              <h3>Sin evaluaciones generadas</h3>
              <p>Este período aún no tiene evaluaciones 360°. Actívalo desde "Períodos" o genera el conjunto manualmente aquí.</p>
            </div>
          ` : `
            <div class="table-wrap">
              <table>
                <thead><tr><th>Colaborador</th><th>Nivel</th><th>Auto</th><th>Jefe</th><th>Par</th><th>Subalterno</th><th>SST</th></tr></thead>
                <tbody>
                  ${colaboradores.map(c => {
                    const evs = evaluacionesPeriodo.filter(e => e.colaboradorId === c.id);
                    const cell = tipo => {
                      const propias = evs.filter(e => e.tipoEvaluador === tipo);
                      if (!propias.length) return '<span class="pill pill--neutral">No aplica</span>';
                      return propias.map(e => {
                        const evaluador = TH.DB.usuario(e.evaluadorId);
                        return `${evaluador ? evaluador.nombre : '—'} <span class="cell-sub">${e.estado}</span>`;
                      }).join('<br>');
                    };
                    return `
                      <tr>
                        <td>${c.nombre}<span class="cell-sub">${c.cargo}</span></td>
                        <td>${TH.TIPO_CARGO_LABEL[c.tipoCargo]}</td>
                        <td>${cell('AUTO')}</td>
                        <td>${cell('JEFE')}</td>
                        <td>${cell('PAR')}</td>
                        <td>${cell('SUBALTERNO')}</td>
                        <td>${cell('SST')}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `;

      root.querySelector('#periodoSelect').addEventListener('change', e => { periodoId = e.target.value; pintar(); });

      const generarBtn = root.querySelector('#generarBtn');
      if (generarBtn) generarBtn.addEventListener('click', () => {
        const n = TH.DB.generarEvaluacionesPeriodo(periodoId);
        UI.toast(n > 0 ? `Se generaron ${n} evaluaciones 360°.` : 'Ya existían evaluaciones para este período.');
        pintar();
      });
    }

    pintar();
  };

})();
