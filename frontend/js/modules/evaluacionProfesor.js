/* =========================================================================
   MODULES.evaluacionProfesor — Evaluación de Competencias Profesor.
   Vista enfocada en el personal con tipoCargo 'profesor' (ver Propuesta
   Profesores, competencias.js): mismo motor de Competencias 360° que el
   resto de la organización, pero acotado a la planta profesor para que
   Talento Humano la gestione como un proceso propio.
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  window.Modules.evaluacionProfesor = function (root, ctx) {
    const profesors = TH.DB.usuarios().filter(u => u.tipoCargo === 'profesor' && u.estado === 'Activo');
    let colaboradorId = (ctx.params && ctx.params.colaboradorId) || (profesors[0] && profesors[0].id);
    let periodoId = TH.DB.periodoActivo().id;

    function pintar() {
      if (!profesors.length) {
        root.innerHTML = `
          <div class="panel"><div class="empty-state">
            <div class="empty-state__icon">${THPanel.icon('competencias')}</div>
            <h3>Sin profesors registrados</h3>
            <p>Aún no hay colaboradores con perfil Profesor (tipoCargo "profesor") activos en el sistema.</p>
          </div></div>
        `;
        return;
      }

      const colaborador = TH.DB.usuario(colaboradorId);
      const periodo = TH.DB.periodo(periodoId);
      const evaluaciones = TH.DB.evaluacionesDe(colaboradorId, periodoId);
      const consolidado = TH.DB.consolidar(colaboradorId, periodoId);
      const competenciasProfesor = TH.DB.competenciasAplicables('profesor');

      root.innerHTML = `
        <div class="filters-bar">
          <div class="field field--grow">
            <label>Profesor</label>
            <select id="colabSelect">${profesors.map(u => `<option value="${u.id}" ${u.id === colaboradorId ? 'selected' : ''}>${u.nombre} — ${u.cargo}</option>`).join('')}</select>
          </div>
          <div class="field">
            <label>Período</label>
            <select id="periodoSelect">${TH.DB.periodosPorTipo('competencias').map(p => `<option value="${p.id}" ${p.id === periodoId ? 'selected' : ''}>${p.nombre}${p.estado === 'Activo' ? ' · Activo' : ''}</option>`).join('')}</select>
          </div>
        </div>

        <div class="panel" style="margin-bottom:18px;">
          <p class="section-label">${colaborador.nombre} · ${colaborador.cargo} · ${colaborador.area}</p>
          <p style="color:var(--ink-soft);font-size:.82rem;margin:-6px 0 0;">Evaluado sobre las ${competenciasProfesor.length} competencias de la pista Profesor (más SST, transversal a toda la institución).</p>
        </div>

        ${evaluaciones.length === 0 ? `
          <div class="panel"><div class="empty-state">
            <div class="empty-state__icon">${THPanel.icon('competencias')}</div>
            <h3>Sin evaluaciones registradas</h3>
            <p>${colaborador.nombre} no tiene evaluaciones 360° en ${periodo.nombre}.</p>
          </div></div>
        ` : `
          <div class="panel" style="margin-bottom:18px;">
            <p class="section-label">Resultado por evaluador</p>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Evaluador</th><th>Tipo</th><th>Estado</th><th>Institucional</th><th>Específico</th></tr></thead>
                <tbody>
                  ${evaluaciones.map(ev => {
                    const evaluador = TH.DB.usuario(ev.evaluadorId);
                    const r = TH.DB.resultado(ev);
                    return `
                      <tr>
                        <td>${evaluador ? evaluador.nombre : '—'}${ev.tipoEvaluador === 'AUTO' ? ' <span class="cell-sub">(autoevaluación)</span>' : ''}</td>
                        <td>${TH.TIPOS_EVALUADOR[ev.tipoEvaluador]}</td>
                        <td><span class="pill ${ev.estado === 'Finalizada' ? 'pill--ok' : 'pill--pend'}">${ev.estado}</span></td>
                        <td>${r && r.scoreInstitucional !== null ? r.scoreInstitucional + '/5' : '—'}</td>
                        <td>${r && r.scoreEspecifico !== null ? r.scoreEspecifico + '/5' : '—'}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          ${consolidado ? `
            <div class="panel">
              <p class="section-label">Resultado consolidado</p>
              <p style="color:var(--ink-soft);font-size:.8rem;margin:-6px 0 16px;">${consolidado.reglaConsolidacion}</p>
              <div class="summary-chips" style="margin-bottom:10px;">
                <div class="summary-chip"><span>Resultado general</span><strong>${consolidado.scoreGeneral}/5</strong></div>
                <div class="summary-chip"><span>Equivalente</span><strong>${consolidado.pctGeneral}%</strong></div>
                <div class="summary-chip"><span>Nivel alcanzado</span><strong>${consolidado.descriptor}</strong></div>
                <div class="summary-chip"><span>Evaluaciones</span><strong>${consolidado.evaluadoresCompletos}/${consolidado.evaluadoresAsignados} completadas</strong></div>
              </div>
              <p style="color:var(--ink-soft);font-size:.78rem;margin:0 0 20px;">Nota: ${String(consolidado.scoreGeneral).replace('.', ',')} · Meta: 4,0 · Máximo: 5,0</p>
              <div class="results">
                ${['JEFE', 'PAR', 'AUTO', 'SUBALTERNO'].filter(t => consolidado.detalle[t] !== undefined).map(t => `
                  <div class="result-row">
                    <div class="result-row__label">${TH.TIPOS_EVALUADOR[t]}</div>
                    <div class="result-row__bar"><div class="result-row__fill" style="width:${consolidado.detalle[t] / 5 * 100}%"></div></div>
                    <div class="result-row__value">${consolidado.detalle[t]}/5</div>
                  </div>
                `).join('')}
              </div>
              <div class="modal-actions" style="justify-content:flex-start;margin-top:18px;">
                <button type="button" class="btn btn--primary" id="irInformeBtn">Generar informe en PDF</button>
              </div>
            </div>
          ` : `<div class="panel"><p style="color:var(--ink-soft);font-size:.87rem;margin:0;">Aún no hay suficientes evaluaciones calificadas para consolidar el resultado de este período.</p></div>`}
        `}

        <div class="panel" style="margin-top:18px;">
          <p class="section-label">Catálogo de competencias Profesor</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Competencia</th><th>Descripción</th><th>Indicadores</th></tr></thead>
              <tbody>
                ${competenciasProfesor.map(c => `
                  <tr>
                    <td><strong>${c.nombre}</strong></td>
                    <td style="max-width:420px;">${c.descripcion}</td>
                    <td>${c.indicadores.length}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      root.querySelector('#colabSelect').addEventListener('change', e => { colaboradorId = e.target.value; pintar(); });
      root.querySelector('#periodoSelect').addEventListener('change', e => { periodoId = e.target.value; pintar(); });

      const irInformeBtn = root.querySelector('#irInformeBtn');
      if (irInformeBtn) irInformeBtn.addEventListener('click', () => ctx.goTo('informes', { colaboradorId }));
    }

    pintar();
  };

})();
