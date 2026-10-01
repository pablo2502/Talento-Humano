/* =========================================================================
   MODULES.competencias — Catálogo de competencias 360° (RF-05)
   Diccionario institucional: competencias comunes a todos los cargos,
   competencias específicas por nivel (Estratégico/Táctico/Apoyo/Profesor) y
   la competencia transversal de SST. El administrador puede crear, editar o
   eliminar competencias e indicadores manualmente; los cambios quedan
   disponibles de inmediato para nuevas evaluaciones (RF-05, RF-08).
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  const TABS = [
    { id: 'institucional', label: 'Institucionales' },
    { id: 'estrategico', label: 'Estratégico' },
    { id: 'tactico', label: 'Táctico' },
    { id: 'apoyo', label: 'Apoyo' },
    { id: 'profesor', label: 'Profesor' },
    { id: 'sst', label: 'SST' }
  ];

  const TIPOS_EVALUADOR_IND = [
    { id: 'auto', label: 'Autoevaluación' },
    { id: 'jefe', label: 'Jefe' },
    { id: 'par', label: 'Par' },
    { id: 'subalterno', label: 'Subalterno' }
  ];

  window.Modules.competencias = function (root, ctx) {
    let activo = 'institucional';

    function pintar() {
      const items = TH.DB.competenciasTodas().filter(c => c.tipo === activo);

      root.innerHTML = `
        <div class="view__head">
          <div></div>
          <div class="view__head-actions">
            <button type="button" class="btn btn--primary" id="newCompBtn">+ Nueva competencia</button>
          </div>
        </div>

        <div class="tabs">
          ${TABS.map(t => `<button type="button" class="tab-btn" data-tab="${t.id}" aria-selected="${t.id === activo}">${t.label}</button>`).join('')}
        </div>

        <div class="modules-grid">
          ${items.map(c => `
            <div class="card">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;">
                <div>
                  <h3 style="font-size:1rem;">${c.nombre}</h3>
                  <p style="color:var(--ink-soft);font-size:.76rem;margin:2px 0 0;">${c.codigo || '—'}</p>
                </div>
              </div>
              <p style="color:var(--ink-soft);font-size:.83rem;line-height:1.55;margin:0 0 12px;">${c.descripcion}</p>

              <p class="section-label" style="margin-bottom:6px;">Indicadores (${c.indicadores.length})</p>
              <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;">
                ${c.indicadores.length === 0 ? `<p style="color:var(--ink-soft);font-size:.8rem;margin:0;">Sin indicadores todavía.</p>` : ''}
                ${c.indicadores.map(i => `
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 10px;background:var(--fog);border-radius:9px;">
                    <span style="font-size:.82rem;color:var(--navy-900);">${i.nombre}</span>
                    <span style="display:flex;gap:4px;flex-shrink:0;">
                      <button type="button" class="icon-btn" data-edit-ind="${c.id}|${i.id}" aria-label="Editar indicador" title="Editar indicador">
                        <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                      </button>
                      <button type="button" class="icon-btn icon-btn--danger" data-del-ind="${c.id}|${i.id}" aria-label="Eliminar indicador" title="Eliminar indicador">
                        <svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      </button>
                    </span>
                  </div>
                `).join('')}
              </div>

              <div class="modal-actions" style="justify-content:flex-start;margin-top:0;">
                <button type="button" class="btn btn--ghost btn--sm" data-add-ind="${c.id}">+ Agregar indicador</button>
                <button type="button" class="btn btn--ghost btn--sm" data-edit-comp="${c.id}">Editar competencia</button>
                <button type="button" class="btn btn--danger btn--sm" data-del-comp="${c.id}">Eliminar</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      root.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => { activo = btn.dataset.tab; pintar(); }));

      root.querySelector('#newCompBtn').addEventListener('click', () => abrirFormularioCompetencia());
      root.querySelectorAll('[data-edit-comp]').forEach(b => b.addEventListener('click', () => abrirFormularioCompetencia(TH.DB.competenciaPorId(b.dataset.editComp))));
      root.querySelectorAll('[data-del-comp]').forEach(b => b.addEventListener('click', () => {
        const comp = TH.DB.competenciaPorId(b.dataset.delComp);
        UI.confirm('Eliminar competencia', `¿Deseas eliminar "${comp.nombre}" y sus ${comp.indicadores.length} indicador(es)? Las evaluaciones ya calificadas conservan su historial, pero este indicador dejará de evaluarse hacia adelante.`, () => {
          TH.DB.eliminarCompetencia(b.dataset.delComp);
          UI.toast('Competencia eliminada.');
          pintar();
        }, { danger: true, confirmLabel: 'Eliminar' });
      }));

      root.querySelectorAll('[data-add-ind]').forEach(b => b.addEventListener('click', () => abrirFormularioIndicador(b.dataset.addInd)));
      root.querySelectorAll('[data-edit-ind]').forEach(b => b.addEventListener('click', () => {
        const [compId, indId] = b.dataset.editInd.split('|');
        const comp = TH.DB.competenciaPorId(compId);
        abrirFormularioIndicador(compId, comp.indicadores.find(i => i.id === indId));
      }));
      root.querySelectorAll('[data-del-ind]').forEach(b => b.addEventListener('click', () => {
        const [compId, indId] = b.dataset.delInd.split('|');
        UI.confirm('Eliminar indicador', '¿Deseas eliminar este indicador del catálogo?', () => {
          TH.DB.eliminarIndicador(compId, indId);
          UI.toast('Indicador eliminado.');
          pintar();
        }, { danger: true, confirmLabel: 'Eliminar' });
      }));
    }

    function abrirFormularioCompetencia(competencia) {
      UI.openModal(`
        <h2>${competencia ? 'Editar competencia' : 'Nueva competencia'}</h2>
        <p>Los indicadores se agregan por separado, una vez creada la competencia.</p>
        <div class="form-grid">
          <div class="field field--full"><label>Nombre de la competencia</label><input id="fNombre" value="${competencia ? UI.escapeHtml(competencia.nombre) : ''}"></div>
          <div class="field"><label>Código</label><input id="fCodigo" value="${competencia ? UI.escapeHtml(competencia.codigo || '') : ''}" placeholder="COMP-XXX-00"></div>
          <div class="field">
            <label>Tipo / nivel</label>
            <select id="fTipo">
              ${TABS.map(t => `<option value="${t.id}" ${(competencia ? competencia.tipo : activo) === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </div>
          <div class="field field--full"><label>Descripción</label><textarea id="fDesc" rows="3">${competencia ? UI.escapeHtml(competencia.descripcion || '') : ''}</textarea></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn--ghost" data-modal-close>Cancelar</button>
          <button type="button" class="btn btn--primary" id="saveBtn">${competencia ? 'Guardar cambios' : 'Crear competencia'}</button>
        </div>
      `, { onOpen: box => {
        box.querySelector('#saveBtn').addEventListener('click', () => {
          const data = {
            nombre: box.querySelector('#fNombre').value.trim(),
            codigo: box.querySelector('#fCodigo').value.trim(),
            tipo: box.querySelector('#fTipo').value,
            descripcion: box.querySelector('#fDesc').value.trim()
          };
          if (!data.nombre || !data.descripcion) { UI.toast('Nombre y descripción son obligatorios.'); return; }

          if (competencia) {
            TH.DB.actualizarCompetencia(competencia.id, data);
            UI.toast('Competencia actualizada.');
          } else {
            TH.DB.crearCompetencia(data);
            UI.toast('Competencia creada.');
          }
          activo = data.tipo;
          UI.closeModal();
          pintar();
        });
      } });
    }

    function abrirFormularioIndicador(competenciaId, indicador) {
      const competencia = TH.DB.competenciaPorId(competenciaId);
      const esSST = competencia.tipo === 'sst';

      const camposHtml = esSST ? `
        <div class="field field--full">
          <label>Comportamiento esperado — Estratégico / Táctico</label>
          <textarea id="fComp_estrategico_tactico" rows="2">${indicador ? UI.escapeHtml((indicador.comportamientos || {}).estrategico_tactico || '') : ''}</textarea>
        </div>
        <div class="field field--full">
          <label>Comportamiento esperado — Apoyo</label>
          <textarea id="fComp_apoyo" rows="2">${indicador ? UI.escapeHtml((indicador.comportamientos || {}).apoyo || '') : ''}</textarea>
        </div>
      ` : TIPOS_EVALUADOR_IND.map(t => `
        <div class="field field--full">
          <label style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
            <span>Comportamiento esperado — ${t.label}</span>
            <select id="fAplica_${t.id}" style="width:auto;">
              ${['Sí', 'No', 'Condicionado'].map(v => `<option value="${v}" ${indicador && (indicador.aplica || {})[t.id] === v ? 'selected' : (!indicador && v === (t.id === 'subalterno' ? 'Condicionado' : 'Sí') ? 'selected' : '')}>${v === 'Sí' ? 'Aplica' : v === 'No' ? 'No aplica' : 'Condicionado'}</option>`).join('')}
            </select>
          </label>
          <textarea id="fComp_${t.id}" rows="2">${indicador ? UI.escapeHtml((indicador.comportamientos || {})[t.id] || '') : ''}</textarea>
        </div>
      `).join('');

      UI.openModal(`
        <h2>${indicador ? 'Editar indicador' : 'Nuevo indicador'}</h2>
        <p>${competencia.nombre} · ${TABS.find(t => t.id === competencia.tipo).label}</p>
        <div class="form-grid">
          <div class="field field--full"><label>Nombre del indicador</label><input id="fNombre" value="${indicador ? UI.escapeHtml(indicador.nombre) : ''}"></div>
          ${camposHtml}
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn--ghost" data-modal-close>Cancelar</button>
          <button type="button" class="btn btn--primary" id="saveBtn">${indicador ? 'Guardar cambios' : 'Crear indicador'}</button>
        </div>
      `, { onOpen: box => {
        box.querySelector('#saveBtn').addEventListener('click', () => {
          const nombre = box.querySelector('#fNombre').value.trim();
          if (!nombre) { UI.toast('El nombre del indicador es obligatorio.'); return; }

          let data;
          if (esSST) {
            data = {
              nombre,
              comportamientos: {
                estrategico_tactico: box.querySelector('#fComp_estrategico_tactico').value.trim(),
                apoyo: box.querySelector('#fComp_apoyo').value.trim()
              }
            };
          } else {
            const comportamientos = {};
            const aplica = {};
            TIPOS_EVALUADOR_IND.forEach(t => {
              comportamientos[t.id] = box.querySelector(`#fComp_${t.id}`).value.trim();
              aplica[t.id] = box.querySelector(`#fAplica_${t.id}`).value;
            });
            data = { nombre, comportamientos, aplica };
          }

          if (indicador) {
            TH.DB.actualizarIndicador(competenciaId, indicador.id, data);
            UI.toast('Indicador actualizado.');
          } else {
            TH.DB.crearIndicador(competenciaId, data);
            UI.toast('Indicador creado.');
          }
          UI.closeModal();
          pintar();
        });
      } });
    }

    pintar();
  };

})();
