/* =========================================================================
   MODULES.evaluadores — Asignación 360° (RF-09, RF-10, RF-28)
   Las evaluaciones se generan automáticamente a partir de la estructura
   organizacional al activar un período: Autoevaluación siempre, Jefe si
   existe, un registro por cada Par, uno por cada Subalterno directo
   (condicionado a que existan) y un ítem de SST evaluado por el jefe.
   Además de esa generación automática, el administrador puede agregar,
   reasignar (cambiar evaluador y/o tipo) o quitar evaluaciones puntuales
   uno por uno, sin necesidad de tocar el organigrama en Usuarios.
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  const TIPOS = ['AUTO', 'JEFE', 'PAR', 'SUBALTERNO', 'SST'];

  window.Modules.evaluadores = function (root, ctx) {
    let periodoId = TH.DB.periodoActivo().id;

    function selectorColaboradores(seleccionId) {
      return TH.DB.usuarios().filter(u => u.rolId === 'colaborador' && u.estado === 'Activo')
        .map(u => `<option value="${u.id}" ${u.id === seleccionId ? 'selected' : ''}>${u.nombre} — ${u.cargo}</option>`).join('');
    }

    function selectorEvaluadores(seleccionId) {
      return TH.DB.usuarios().filter(u => u.estado === 'Activo')
        .map(u => `<option value="${u.id}" ${u.id === seleccionId ? 'selected' : ''}>${u.nombre} — ${u.cargo}</option>`).join('');
    }

    function pintar() {
      const periodo = TH.DB.periodo(periodoId);
      const colaboradores = TH.DB.usuarios().filter(u => u.rolId === 'colaborador' && u.estado === 'Activo');
      const evaluacionesPeriodo = TH.DB.evaluaciones().filter(e => e.periodoId === periodoId);
      const periodoCerrado = periodo.estado === 'Cerrado';

      function filaEvaluacion(e) {
        const evaluador = TH.DB.usuario(e.evaluadorId);
        const bloqueada = periodoCerrado || ['Consolidada', 'Cerrada'].includes(e.estado);
        return `
          <div class="asig-row" style="display:flex;align-items:center;gap:6px;justify-content:space-between;padding:2px 0;">
            <span>${evaluador ? evaluador.nombre : '—'}<span class="cell-sub">${e.estado}</span></span>
            ${!bloqueada ? `
              <span style="display:flex;gap:2px;flex-shrink:0;">
                <button type="button" class="icon-btn" data-editar="${e.id}" title="Reasignar" aria-label="Reasignar">
                  <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
                <button type="button" class="icon-btn icon-btn--danger" data-eliminar="${e.id}" title="Quitar" aria-label="Quitar">
                  <svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                </button>
              </span>
            ` : ''}
          </div>
        `;
      }

      root.innerHTML = `
        <div class="filters-bar">
          <div class="field field--grow">
            <label>Período</label>
            <select id="periodoSelect">
              ${TH.DB.periodosPorTipo('competencias').map(p => `<option value="${p.id}" ${p.id === periodoId ? 'selected' : ''}>${p.nombre}${p.estado === 'Activo' ? ' · Activo' : ''}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;gap:10px;">
            ${evaluacionesPeriodo.length === 0 ? `<button type="button" class="btn btn--dark" id="generarBtn">Generar evaluaciones 360°</button>` : ''}
            <button type="button" class="btn btn--primary" id="addBtn" ${periodoCerrado ? 'disabled title="El período está cerrado"' : ''}>+ Agregar evaluación manual</button>
          </div>
        </div>

        <div class="panel">
          <p class="section-label">Evaluaciones 360° de ${periodo.nombre} (RF-09, RF-28)</p>
          <p style="color:var(--ink-soft);font-size:.82rem;margin:-6px 0 16px;">La generación automática parte del organigrama (jefe/pares/subalternos); usa los íconos de cada evaluación para reasignarla a otra persona u otro tipo, o "Agregar evaluación manual" para casos que no siguen el organigrama.</p>
          ${evaluacionesPeriodo.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state__icon">${THPanel.icon('evaluadores')}</div>
              <h3>Sin evaluaciones generadas</h3>
              <p>Este período aún no tiene evaluaciones 360°. Actívalo desde "Períodos", genera el conjunto automático aquí, o agrega evaluaciones manuales una por una.</p>
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
                      return propias.map(filaEvaluacion).join('');
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

      const addBtn = root.querySelector('#addBtn');
      if (!periodoCerrado) addBtn.addEventListener('click', abrirFormularioNuevo);

      root.querySelectorAll('[data-editar]').forEach(b => b.addEventListener('click', () => abrirFormularioEditar(b.dataset.editar)));
      root.querySelectorAll('[data-eliminar]').forEach(b => b.addEventListener('click', () => {
        UI.confirm('Quitar evaluación', 'Se eliminará esta evaluación de la Asignación 360° del período. ¿Deseas continuar?', () => {
          TH.DB.eliminar('evaluaciones', b.dataset.eliminar);
          UI.toast('Evaluación eliminada de la asignación.');
          pintar();
        }, { danger: true, confirmLabel: 'Quitar' });
      }));
    }

    function abrirFormularioNuevo() {
      UI.openModal(`
        <h2>Agregar evaluación manual</h2>
        <p>Asigna quién evalúa a quién y con qué tipo de relación (Autoevaluación/Jefe/Par/Subalterno/SST), sin depender del organigrama — útil para comités, evaluaciones cruzadas u otros casos puntuales.</p>
        <div class="form-grid">
          <div class="field field--full"><label>Persona evaluada</label><select id="fColaborador">${selectorColaboradores()}</select></div>
          <div class="field field--full"><label>Evaluador</label><select id="fEvaluador">${selectorEvaluadores()}</select></div>
          <div class="field field--full">
            <label>Tipo de evaluador</label>
            <select id="fTipo">${TIPOS.map(t => `<option value="${t}">${TH.TIPOS_EVALUADOR[t]}</option>`).join('')}</select>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn--ghost" data-modal-close>Cancelar</button>
          <button type="button" class="btn btn--primary" id="saveBtn">Agregar</button>
        </div>
      `, { onOpen: box => {
        box.querySelector('#saveBtn').addEventListener('click', () => {
          const colaboradorId = box.querySelector('#fColaborador').value;
          const evaluadorId = box.querySelector('#fEvaluador').value;
          const tipoEvaluador = box.querySelector('#fTipo').value;
          if (!colaboradorId || !evaluadorId) { UI.toast('Selecciona la persona evaluada y el evaluador.'); return; }
          TH.DB.crearEvaluacion({ periodoId, colaboradorId, evaluadorId, tipoEvaluador });
          UI.toast('Evaluación agregada a la Asignación 360°.');
          UI.closeModal();
          pintar();
        });
      } });
    }

    function abrirFormularioEditar(evaluacionId) {
      const ev = TH.DB.evaluaciones().find(e => e.id === evaluacionId);
      const colaborador = TH.DB.usuario(ev.colaboradorId);
      UI.openModal(`
        <h2>Reasignar evaluación</h2>
        <p>Persona evaluada: <strong>${colaborador.nombre}</strong>. Si cambias el tipo de evaluador, la calificación registrada se reinicia porque los indicadores aplicables pueden cambiar.</p>
        <div class="form-grid">
          <div class="field field--full"><label>Evaluador</label><select id="fEvaluador">${selectorEvaluadores(ev.evaluadorId)}</select></div>
          <div class="field field--full">
            <label>Tipo de evaluador</label>
            <select id="fTipo">${TIPOS.map(t => `<option value="${t}" ${t === ev.tipoEvaluador ? 'selected' : ''}>${TH.TIPOS_EVALUADOR[t]}</option>`).join('')}</select>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn--ghost" data-modal-close>Cancelar</button>
          <button type="button" class="btn btn--primary" id="saveBtn">Guardar cambios</button>
        </div>
      `, { onOpen: box => {
        box.querySelector('#saveBtn').addEventListener('click', () => {
          const evaluadorId = box.querySelector('#fEvaluador').value;
          const tipoEvaluador = box.querySelector('#fTipo').value;
          const res = TH.DB.reasignarEvaluacion(evaluacionId, { evaluadorId, tipoEvaluador });
          if (!res.ok) { UI.toast(res.error); return; }
          UI.toast('Evaluación reasignada.');
          UI.closeModal();
          pintar();
        });
      } });
    }

    pintar();
  };

})();
