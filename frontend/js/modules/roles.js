/* =========================================================================
   MODULES.roles — Roles y permisos (RF-03)
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  window.Modules.roles = function (root, ctx) {

    function pintar() {
      const roles = TH.DB.roles();

      root.innerHTML = `
        <div class="modules-grid">
          ${roles.map(r => {
            const usuariosDelRol = TH.DB.usuarios().filter(u => u.rolId === r.id).length;
            return `
              <div class="card">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px;">
                  <div>
                    <h3 style="font-size:1.02rem;">${r.nombre}</h3>
                    <p style="color:var(--ink-soft);font-size:.78rem;margin:2px 0 0;">${usuariosDelRol} usuario(s) con este rol</p>
                  </div>
                  <button type="button" class="icon-btn" data-edit="${r.id}" aria-label="Editar permisos" title="Editar permisos">
                    <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  </button>
                </div>
                <div class="chip-picker">
                  ${r.permisos.map(p => `<span class="chip chip--static">${p}</span>`).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => abrirFormulario(TH.DB.rol(b.dataset.edit))));
    }

    function abrirFormulario(rol) {
      let permisos = rol.permisos.slice();

      function listaHtml() {
        return permisos.map((p, i) => `<span class="chip" data-idx="${i}">${p} <span aria-hidden="true">×</span></span>`).join('');
      }

      UI.openModal(`
        <h2>Permisos de ${rol.nombre}</h2>
        <p>Estos permisos determinan qué acciones puede ejecutar este rol dentro del sistema.</p>
        <div class="chip-picker" id="permList" style="margin-bottom:16px;">${listaHtml()}</div>
        <div class="field field--full" style="margin-bottom:14px;">
          <label>Agregar permiso</label>
          <div style="display:flex;gap:8px;">
            <input id="newPerm" placeholder="Ej: Consultar informes de área" style="flex:1;">
            <button type="button" class="btn btn--ghost" id="addPermBtn">Agregar</button>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn--ghost" data-modal-close>Cancelar</button>
          <button type="button" class="btn btn--primary" id="savePermBtn">Guardar cambios</button>
        </div>
      `, { onOpen: box => {
        const permList = box.querySelector('#permList');

        function refrescar() {
          permList.innerHTML = listaHtml();
          permList.querySelectorAll('.chip').forEach(chip => chip.addEventListener('click', () => {
            permisos.splice(Number(chip.dataset.idx), 1);
            refrescar();
          }));
        }
        refrescar();

        box.querySelector('#addPermBtn').addEventListener('click', () => {
          const input = box.querySelector('#newPerm');
          const val = input.value.trim();
          if (!val) return;
          permisos.push(val);
          input.value = '';
          refrescar();
        });

        box.querySelector('#savePermBtn').addEventListener('click', () => {
          TH.DB.actualizar('roles', rol.id, { permisos });
          UI.closeModal();
          UI.toast('Permisos actualizados.');
          pintar();
        });
      } });
    }

    pintar();
  };

})();
