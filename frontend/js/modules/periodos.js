/* =========================================================================
   MODULES.periodos — Períodos de evaluación (RF-08)
   Solo puede haber un período Activo a la vez; los resultados de cada
   período se conservan por separado (ver RF-08, RNF-10).
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  window.Modules.periodos = function (root, ctx) {

    function pintar() {
      const periodos = TH.DB.periodos();

      root.innerHTML = `
        <div class="view__head">
          <div></div>
          <div class="view__head-actions">
            <button type="button" class="btn btn--primary" id="newBtn">+ Nuevo período</button>
          </div>
        </div>

        <div class="panel">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Nombre</th><th>Fecha inicio</th><th>Fecha fin</th><th>Estado</th><th>Evaluaciones</th><th></th></tr></thead>
              <tbody>
                ${periodos.map(p => {
                  const n = TH.DB.evaluaciones().filter(e => e.periodoId === p.id).length;
                  return `
                    <tr>
                      <td>${p.nombre}</td>
                      <td>${UI.formatFecha(p.fechaInicio)}</td>
                      <td>${UI.formatFecha(p.fechaFin)}</td>
                      <td><span class="pill ${p.estado === 'Activo' ? 'pill--ok' : 'pill--neutral'}">${p.estado}</span></td>
                      <td>${n}</td>
                      <td class="actions-cell">
                        ${p.estado === 'Cerrado'
                          ? `<button type="button" class="btn btn--ghost btn--sm" data-activar="${p.id}">Activar</button>`
                          : `<button type="button" class="btn btn--ghost btn--sm" data-cerrar="${p.id}">Cerrar</button>`}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      root.querySelector('#newBtn').addEventListener('click', abrirFormulario);

      root.querySelectorAll('[data-activar]').forEach(b => b.addEventListener('click', () => {
        const actual = TH.DB.periodoActivo();
        const activar = () => {
          TH.DB.periodos().forEach(p => { if (p.estado === 'Activo') TH.DB.actualizar('periodos', p.id, { estado: 'Cerrado' }); });
          TH.DB.actualizar('periodos', b.dataset.activar, { estado: 'Activo' });
          const generadas = TH.DB.generarEvaluacionesPeriodo(b.dataset.activar);
          UI.toast(generadas > 0 ? `Período activado. Se generaron ${generadas} evaluaciones 360° (RF-28).` : 'Período activado.');
          pintar();
        };
        if (actual) {
          UI.confirm('Cambiar período activo', `El período "${actual.nombre}" se cerrará automáticamente al activar este nuevo período. ¿Deseas continuar?`, activar);
        } else {
          activar();
        }
      }));

      root.querySelectorAll('[data-cerrar]').forEach(b => b.addEventListener('click', () => {
        UI.confirm('Cerrar período', 'Al cerrar el período, las evaluaciones finalizadas se consolidarán y sus resultados quedarán fijos para consulta e historial (RF-27). ¿Deseas continuar?', () => {
          const periodoId = b.dataset.cerrar;
          TH.DB.evaluaciones().filter(e => e.periodoId === periodoId && e.estado === 'Finalizada').forEach(e => {
            TH.DB.avanzarEstado(e.id, 'Consolidada');
            TH.DB.avanzarEstado(e.id, 'Cerrada');
          });
          TH.DB.actualizar('periodos', periodoId, { estado: 'Cerrado' });
          UI.toast('Período cerrado. Las evaluaciones finalizadas quedaron consolidadas.');
          pintar();
        });
      }));
    }

    function abrirFormulario() {
      UI.openModal(`
        <h2>Nuevo período de evaluación</h2>
        <p>El período se crea en estado "Cerrado"; actívalo desde la lista cuando quieras iniciar el ciclo de evaluación.</p>
        <div class="form-grid">
          <div class="field field--full"><label>Nombre</label><input id="fNombre" placeholder="Ej: 2027 - Primer semestre"></div>
          <div class="field"><label>Fecha inicio</label><input id="fInicio" type="date"></div>
          <div class="field"><label>Fecha fin</label><input id="fFin" type="date"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn--ghost" data-modal-close>Cancelar</button>
          <button type="button" class="btn btn--primary" id="saveBtn">Crear período</button>
        </div>
      `, { onOpen: box => {
        box.querySelector('#saveBtn').addEventListener('click', () => {
          const data = {
            nombre: box.querySelector('#fNombre').value.trim(),
            fechaInicio: box.querySelector('#fInicio').value,
            fechaFin: box.querySelector('#fFin').value,
            estado: 'Cerrado'
          };
          if (!data.nombre || !data.fechaInicio || !data.fechaFin) { UI.toast('Completa todos los campos.'); return; }
          TH.DB.crear('periodos', data, 'per');
          UI.toast('Período creado.');
          UI.closeModal();
          pintar();
        });
      } });
    }

    pintar();
  };

})();
