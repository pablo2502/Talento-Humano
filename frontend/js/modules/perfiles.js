/* =========================================================================
   MODULES.perfiles — Perfiles de cargo (RF-04)
   El nivel de cargo (Estratégico/Táctico/Apoyo) determina automáticamente
   qué competencias 360° le aplican a cada perfil (institucionales + las
   propias de su nivel + SST transversal) — no se eligen manualmente.
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
          ${perfiles.map(p => {
            const enUso = TH.DB.usuarios().filter(u => u.perfilId === p.id && u.estado === 'Activo').length;
            const aplicables = TH.DB.competenciasAplicables(p.tipoCargo);
            return `
              <div class="card">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;">
                  <div>
                    <h3 style="font-size:1rem;">${p.nombre}</h3>
                    <p style="color:var(--ink-soft);font-size:.78rem;margin:2px 0 0;">${p.area} · ${TH.TIPO_CARGO_LABEL[p.tipoCargo]} · ${enUso} persona(s)</p>
                  </div>
                  <span class="pill ${p.estado === 'Activo' ? 'pill--ok' : 'pill--neutral'}">${p.estado}</span>
                </div>
                <p style="color:var(--ink-soft);font-size:.83rem;line-height:1.5;margin:0 0 12px;">${p.descripcion}</p>
                <p class="section-label" style="margin-bottom:6px;">Competencias aplicables (${aplicables.length} + SST)</p>
                <div class="chip-picker" style="margin-bottom:14px;">
                  ${aplicables.map(c => `<span class="chip chip--static">${c.nombre}</span>`).join('')}
                  <span class="chip chip--static">SST (transversal)</span>
                </div>
                <div class="modal-actions" style="justify-content:flex-start;margin-top:0;">
                  <button type="button" class="btn btn--ghost btn--sm" data-edit="${p.id}">Editar</button>
                  <button type="button" class="btn btn--danger btn--sm" data-del="${p.id}" ${enUso ? 'disabled title="No se puede eliminar: hay usuarios con este perfil"' : ''}>Eliminar</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      root.querySelector('#newBtn').addEventListener('click', () => abrirFormulario());
      root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => abrirFormulario(TH.DB.perfil(b.dataset.edit))));
      root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
        if (b.disabled) return;
        UI.confirm('Eliminar perfil', '¿Deseas eliminar este perfil de cargo?', () => {
          TH.DB.eliminar('perfiles', b.dataset.del);
          UI.toast('Perfil eliminado.');
          pintar();
        }, { danger: true, confirmLabel: 'Eliminar' });
      }));
    }

    function abrirFormulario(perfil) {
      UI.openModal(`
        <h2>${perfil ? 'Editar perfil de cargo' : 'Nuevo perfil de cargo'}</h2>
        <p>Las competencias aplicables se calculan automáticamente según el nivel de cargo seleccionado.</p>
        <div class="form-grid">
          <div class="field field--full"><label>Nombre del cargo</label><input id="fNombre" value="${perfil ? UI.escapeHtml(perfil.nombre) : ''}"></div>
          <div class="field"><label>Área</label><input id="fArea" value="${perfil ? UI.escapeHtml(perfil.area) : ''}"></div>
          <div class="field">
            <label>Nivel de cargo</label>
            <select id="fTipoCargo">
              <option value="estrategico" ${perfil && perfil.tipoCargo === 'estrategico' ? 'selected' : ''}>Estratégico</option>
              <option value="tactico" ${!perfil || perfil.tipoCargo === 'tactico' ? 'selected' : ''}>Táctico</option>
              <option value="apoyo" ${perfil && perfil.tipoCargo === 'apoyo' ? 'selected' : ''}>Apoyo</option>
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
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn--ghost" data-modal-close>Cancelar</button>
          <button type="button" class="btn btn--primary" id="saveBtn">${perfil ? 'Guardar cambios' : 'Crear perfil'}</button>
        </div>
      `, { onOpen: box => {
        box.querySelector('#saveBtn').addEventListener('click', () => {
          const data = {
            nombre: box.querySelector('#fNombre').value.trim(),
            area: box.querySelector('#fArea').value.trim(),
            tipoCargo: box.querySelector('#fTipoCargo').value,
            descripcion: box.querySelector('#fDesc').value.trim(),
            estado: box.querySelector('#fEstado').value
          };
          if (!data.nombre || !data.area) { UI.toast('Nombre y área son obligatorios.'); return; }

          if (perfil) {
            TH.DB.actualizar('perfiles', perfil.id, data);
            UI.toast('Perfil actualizado.');
          } else {
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
