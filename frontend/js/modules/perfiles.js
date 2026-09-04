/* =========================================================================
   MODULES.perfiles — Perfiles de cargo (RF-04)
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  window.Modules.perfiles = function (root, ctx) {

    function pintar() {
      const perfiles = TH.DB.perfiles();

      root.innerHTML = `
        <div class="view__head">
          <div></div>
          <div class="view__head-actions">
            <button type="button" class="btn btn--primary" id="newBtn">+ Nuevo perfil</button>
          </div>
        </div>

        <div class="modules-grid">
          ${perfiles.map(p => `
            <div class="card">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;">
                <div>
                  <h3 style="font-size:1rem;">${p.nombre}</h3>
                  <p style="color:var(--ink-soft);font-size:.78rem;margin:2px 0 0;">${p.cargo} · ${p.area}</p>
                </div>
                <span class="pill ${p.estado === 'Activo' ? 'pill--ok' : 'pill--neutral'}">${p.estado}</span>
              </div>
              <p style="color:var(--ink-soft);font-size:.83rem;line-height:1.5;margin:0 0 12px;">${p.descripcion}</p>
              <p class="section-label" style="margin-bottom:6px;">Competencias</p>
              <div class="chip-picker" style="margin-bottom:12px;">
                ${p.competencias.map(id => { const c = TH.DB.competencia(id); return c ? `<span class="chip chip--static">${c.nombre}</span>` : ''; }).join('')}
              </div>
              <p class="section-label" style="margin-bottom:6px;">Comportamientos</p>
              <div class="chip-picker" style="margin-bottom:14px;">
                ${p.comportamientos.map(id => { const c = TH.DB.comportamiento(id); return c ? `<span class="chip chip--static">${c.nombre}</span>` : ''; }).join('')}
              </div>
              <div class="modal-actions" style="justify-content:flex-start;margin-top:0;">
                <button type="button" class="btn btn--ghost btn--sm" data-edit="${p.id}">Editar</button>
                <button type="button" class="btn btn--danger btn--sm" data-del="${p.id}">Eliminar</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      root.querySelector('#newBtn').addEventListener('click', () => abrirFormulario());
      root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => abrirFormulario(TH.DB.perfil(b.dataset.edit))));
      root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
        UI.confirm('Eliminar perfil', '¿Deseas eliminar este perfil de cargo? Los usuarios que lo tengan asignado no se verán afectados.', () => {
          TH.DB.eliminar('perfiles', b.dataset.del);
          UI.toast('Perfil eliminado.');
          pintar();
        }, { danger: true, confirmLabel: 'Eliminar' });
      }));
    }

    function abrirFormulario(perfil) {
      const todasCompetencias = TH.DB.competencias();
      const todosComportamientos = TH.DB.comportamientos();
      let compSel = perfil ? perfil.competencias.slice() : [];
      let comportSel = perfil ? perfil.comportamientos.slice() : [];

      UI.openModal(`
        <h2>${perfil ? 'Editar perfil de cargo' : 'Nuevo perfil de cargo'}</h2>
        <p>Define las competencias y comportamientos que se evaluarán para los colaboradores con este perfil.</p>
        <div class="form-grid">
          <div class="field"><label>Nombre del perfil</label><input id="fNombre" value="${perfil ? UI.escapeHtml(perfil.nombre) : ''}"></div>
          <div class="field"><label>Cargo</label><input id="fCargo" value="${perfil ? UI.escapeHtml(perfil.cargo) : ''}"></div>
          <div class="field"><label>Área</label><input id="fArea" value="${perfil ? UI.escapeHtml(perfil.area) : ''}"></div>
          <div class="field">
            <label>Nivel esperado</label>
            <select id="fNivel">
              ${['Básico', 'Intermedio', 'Avanzado'].map(n => `<option ${perfil && perfil.nivelEsperado === n ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
          </div>
          <div class="field field--full"><label>Descripción</label><textarea id="fDesc">${perfil ? UI.escapeHtml(perfil.descripcion) : ''}</textarea></div>
          <div class="field field--full">
            <label>Estado</label>
            <select id="fEstado">
              <option ${!perfil || perfil.estado === 'Activo' ? 'selected' : ''}>Activo</option>
              <option ${perfil && perfil.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
            </select>
          </div>
          <div class="field field--full">
            <label>Competencias asociadas</label>
            <div class="chip-picker" id="compPicker">
              ${todasCompetencias.map(c => `<button type="button" class="chip" data-id="${c.id}" aria-pressed="${compSel.includes(c.id)}">${c.nombre}</button>`).join('')}
            </div>
          </div>
          <div class="field field--full">
            <label>Comportamientos asociados</label>
            <div class="chip-picker" id="comportPicker">
              ${todosComportamientos.map(c => `<button type="button" class="chip" data-id="${c.id}" aria-pressed="${comportSel.includes(c.id)}">${c.nombre}</button>`).join('')}
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn--ghost" data-modal-close>Cancelar</button>
          <button type="button" class="btn btn--primary" id="saveBtn">${perfil ? 'Guardar cambios' : 'Crear perfil'}</button>
        </div>
      `, { onOpen: box => {
        box.querySelector('#compPicker').addEventListener('click', e => {
          const chip = e.target.closest('.chip'); if (!chip) return;
          const id = chip.dataset.id;
          if (compSel.includes(id)) { compSel = compSel.filter(x => x !== id); chip.setAttribute('aria-pressed', 'false'); }
          else { compSel.push(id); chip.setAttribute('aria-pressed', 'true'); }
        });
        box.querySelector('#comportPicker').addEventListener('click', e => {
          const chip = e.target.closest('.chip'); if (!chip) return;
          const id = chip.dataset.id;
          if (comportSel.includes(id)) { comportSel = comportSel.filter(x => x !== id); chip.setAttribute('aria-pressed', 'false'); }
          else { comportSel.push(id); chip.setAttribute('aria-pressed', 'true'); }
        });

        box.querySelector('#saveBtn').addEventListener('click', () => {
          const data = {
            nombre: box.querySelector('#fNombre').value.trim(),
            cargo: box.querySelector('#fCargo').value.trim(),
            area: box.querySelector('#fArea').value.trim(),
            nivelEsperado: box.querySelector('#fNivel').value,
            descripcion: box.querySelector('#fDesc').value.trim(),
            estado: box.querySelector('#fEstado').value,
            competencias: compSel,
            comportamientos: comportSel
          };
          if (!data.nombre || !data.cargo) { UI.toast('Nombre y cargo son obligatorios.'); return; }

          if (perfil) {
            TH.DB.actualizar('perfiles', perfil.id, data);
            UI.toast('Perfil actualizado.');
          } else {
            data.fechaCreacion = new Date().toISOString().slice(0, 10);
            TH.DB.crear('perfiles', data, 'perfil');
            UI.toast('Perfil creado.');
          }
          UI.closeModal();
          pintar();
        });
      } });
    }

    pintar();
  };

})();
