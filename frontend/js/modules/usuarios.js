/* =========================================================================
   MODULES.usuarios — Gestión de usuarios (RF-02)
   Crear, ver, editar y desactivar usuarios; cada uno con un rol y,
   opcionalmente, un perfil/cargo asociado.
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  window.Modules.usuarios = function (root, ctx) {

    function pintar() {
      const usuarios = TH.DB.usuarios();

      root.innerHTML = `
        <div class="view__head">
          <div></div>
          <div class="view__head-actions">
            <button type="button" class="btn btn--primary" id="newUserBtn">+ Nuevo usuario</button>
          </div>
        </div>

        <div class="panel">
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Cargo / Área</th><th>Estado</th><th>Ingreso</th><th></th></tr>
              </thead>
              <tbody>
                ${usuarios.map(u => {
                  const rol = TH.DB.rol(u.rolId);
                  return `
                    <tr>
                      <td>${u.nombre}</td>
                      <td>${u.correo}</td>
                      <td>${rol ? rol.nombre : '—'}</td>
                      <td>${u.cargo}<span class="cell-sub">${u.area}</span></td>
                      <td><span class="pill ${u.estado === 'Activo' ? 'pill--ok' : 'pill--neutral'}">${u.estado}</span></td>
                      <td>${UI.formatFecha(u.fechaIngreso)}</td>
                      <td class="actions-cell">
                        <button type="button" class="icon-btn" data-edit="${u.id}" aria-label="Editar" title="Editar">
                          <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        </button>
                        <button type="button" class="icon-btn ${u.estado === 'Activo' ? 'icon-btn--danger' : ''}" data-toggle="${u.id}"
                          aria-label="${u.estado === 'Activo' ? 'Desactivar' : 'Activar'}" title="${u.estado === 'Activo' ? 'Desactivar' : 'Activar'}">
                          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      root.querySelector('#newUserBtn').addEventListener('click', () => abrirFormulario());
      root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => abrirFormulario(TH.DB.usuario(b.dataset.edit))));
      root.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', () => {
        const u = TH.DB.usuario(b.dataset.toggle);
        const nuevoEstado = u.estado === 'Activo' ? 'Inactivo' : 'Activo';
        TH.DB.actualizar('usuarios', u.id, { estado: nuevoEstado });
        UI.toast(`Usuario ${nuevoEstado === 'Activo' ? 'activado' : 'desactivado'}.`);
        pintar();
      }));
    }

    function abrirFormulario(usuario) {
      const roles = TH.DB.roles();
      const perfiles = TH.DB.perfiles();
      const jefes = TH.DB.usuarios().filter(u => u.rolId === 'jefe' && u.estado === 'Activo');

      UI.openModal(`
        <h2>${usuario ? 'Editar usuario' : 'Nuevo usuario'}</h2>
        <p>Cada usuario tiene un rol que determina qué módulos puede ver y qué acciones puede ejecutar (RF-03).</p>
        <div class="form-grid">
          <div class="field field--full"><label>Nombre completo</label><input id="fNombre" value="${usuario ? UI.escapeHtml(usuario.nombre) : ''}"></div>
          <div class="field field--full"><label>Correo electrónico</label><input id="fCorreo" type="email" value="${usuario ? usuario.correo : ''}"></div>
          <div class="field">
            <label>Rol</label>
            <select id="fRol">${roles.map(r => `<option value="${r.id}" ${usuario && usuario.rolId === r.id ? 'selected' : ''}>${r.nombre}</option>`).join('')}</select>
          </div>
          <div class="field">
            <label>Estado</label>
            <select id="fEstado">
              <option value="Activo" ${!usuario || usuario.estado === 'Activo' ? 'selected' : ''}>Activo</option>
              <option value="Inactivo" ${usuario && usuario.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
            </select>
          </div>
          <div class="field"><label>Cargo</label><input id="fCargo" value="${usuario ? UI.escapeHtml(usuario.cargo) : ''}"></div>
          <div class="field"><label>Área</label><input id="fArea" value="${usuario ? UI.escapeHtml(usuario.area) : ''}"></div>
          <div class="field">
            <label>Perfil de cargo (opcional)</label>
            <select id="fPerfil">
              <option value="">— Sin perfil —</option>
              ${perfiles.map(p => `<option value="${p.id}" ${usuario && usuario.perfilId === p.id ? 'selected' : ''}>${p.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Jefe inmediato (si es colaborador)</label>
            <select id="fJefe">
              <option value="">— Ninguno —</option>
              ${jefes.map(j => `<option value="${j.id}" ${usuario && usuario.jefeId === j.id ? 'selected' : ''}>${j.nombre}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn--ghost" data-modal-close>Cancelar</button>
          <button type="button" class="btn btn--primary" id="saveUserBtn">${usuario ? 'Guardar cambios' : 'Crear usuario'}</button>
        </div>
      `, { onOpen: box => {
        box.querySelector('#saveUserBtn').addEventListener('click', () => {
          const data = {
            nombre: box.querySelector('#fNombre').value.trim(),
            correo: box.querySelector('#fCorreo').value.trim(),
            rolId: box.querySelector('#fRol').value,
            estado: box.querySelector('#fEstado').value,
            cargo: box.querySelector('#fCargo').value.trim(),
            area: box.querySelector('#fArea').value.trim(),
            perfilId: box.querySelector('#fPerfil').value || null,
            jefeId: box.querySelector('#fJefe').value || null
          };
          if (!data.nombre || !data.correo) { UI.toast('Nombre y correo son obligatorios.'); return; }

          if (usuario) {
            TH.DB.actualizar('usuarios', usuario.id, data);
            UI.toast('Usuario actualizado.');
          } else {
            data.password = '123456';
            data.fechaIngreso = new Date().toISOString().slice(0, 10);
            TH.DB.crear('usuarios', data, 'u');
            UI.toast('Usuario creado con contraseña temporal 123456.');
          }
          UI.closeModal();
          pintar();
        });
      } });
    }

    pintar();
  };

})();
