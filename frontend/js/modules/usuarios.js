/* =========================================================================
   MODULES.usuarios — Gestión de usuarios (RF-02)
   Crear, ver, editar y desactivar usuarios. Un colaborador se asocia a un
   perfil de cargo (que determina su nivel — Estratégico/Táctico/Apoyo — y
   por tanto sus competencias 360°) y opcionalmente a un jefe inmediato.
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
                <tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Cargo / Área</th><th>Jefe</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                ${usuarios.map(u => {
                  const rol = TH.DB.rol(u.rolId);
                  const jefe = u.jefeId ? TH.DB.usuario(u.jefeId) : null;
                  return `
                    <tr>
                      <td>${u.nombre}</td>
                      <td>${u.correo}</td>
                      <td>${rol ? rol.nombre : '—'}${u.tipoCargo ? '<span class="cell-sub">' + TH.TIPO_CARGO_LABEL[u.tipoCargo] + '</span>' : ''}</td>
                      <td>${u.cargo}<span class="cell-sub">${u.area}</span></td>
                      <td>${jefe ? jefe.nombre : '—'}</td>
                      <td><span class="pill ${u.estado === 'Activo' ? 'pill--ok' : 'pill--neutral'}">${u.estado}</span></td>
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
      const posiblesJefes = TH.DB.usuarios().filter(u => u.rolId === 'colaborador' && u.estado === 'Activo' && (!usuario || u.id !== usuario.id));
      const esColaboradorInicial = !usuario || usuario.rolId === 'colaborador';

      UI.openModal(`
        <h2>${usuario ? 'Editar usuario' : 'Nuevo usuario'}</h2>
        <p>El perfil de cargo determina el nivel (Estratégico/Táctico/Apoyo) y por tanto qué competencias 360° le aplican.</p>
        <div class="form-grid">
          <div class="field field--full"><label>Nombre completo</label><input id="fNombre" value="${usuario ? UI.escapeHtml(usuario.nombre) : ''}"></div>
          <div class="field field--full"><label>Correo electrónico</label><input id="fCorreo" type="email" value="${usuario ? usuario.correo : ''}"></div>
          <div class="field">
            <label>Rol de acceso</label>
            <select id="fRol">${roles.map(r => `<option value="${r.id}" ${usuario && usuario.rolId === r.id ? 'selected' : ''}>${r.nombre}</option>`).join('')}</select>
          </div>
          <div class="field">
            <label>Estado</label>
            <select id="fEstado">
              <option value="Activo" ${!usuario || usuario.estado === 'Activo' ? 'selected' : ''}>Activo</option>
              <option value="Inactivo" ${usuario && usuario.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
            </select>
          </div>
          <div class="field field--full" id="perfilField" style="${esColaboradorInicial ? '' : 'display:none;'}">
            <label>Perfil de cargo</label>
            <select id="fPerfil">
              <option value="">— Seleccionar —</option>
              ${perfiles.map(p => `<option value="${p.id}" ${usuario && usuario.perfilId === p.id ? 'selected' : ''}>${p.nombre} (${TH.TIPO_CARGO_LABEL[p.tipoCargo]})</option>`).join('')}
            </select>
          </div>
          <div class="field field--full" id="jefeField" style="${esColaboradorInicial ? '' : 'display:none;'}">
            <label>Jefe inmediato</label>
            <select id="fJefe">
              <option value="">— Sin jefe (nivel más alto) —</option>
              ${posiblesJefes.map(j => `<option value="${j.id}" ${usuario && usuario.jefeId === j.id ? 'selected' : ''}>${j.nombre} — ${j.cargo}</option>`).join('')}
            </select>
          </div>
          <div class="field field--full" id="documentoField">
            <label>Documento</label>
            <input id="fDocumento" value="${usuario ? (usuario.documento || '') : ''}">
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn--ghost" data-modal-close>Cancelar</button>
          <button type="button" class="btn btn--primary" id="saveUserBtn">${usuario ? 'Guardar cambios' : 'Crear usuario'}</button>
        </div>
      `, { onOpen: box => {
        box.querySelector('#fRol').addEventListener('change', e => {
          const esColab = e.target.value === 'colaborador';
          box.querySelector('#perfilField').style.display = esColab ? '' : 'none';
          box.querySelector('#jefeField').style.display = esColab ? '' : 'none';
        });

        box.querySelector('#saveUserBtn').addEventListener('click', () => {
          const rolId = box.querySelector('#fRol').value;
          const nombre = box.querySelector('#fNombre').value.trim();
          const correo = box.querySelector('#fCorreo').value.trim();
          if (!nombre || !correo) { UI.toast('Nombre y correo son obligatorios.'); return; }

          const data = {
            nombre, correo, rolId,
            estado: box.querySelector('#fEstado').value,
            documento: box.querySelector('#fDocumento').value.trim()
          };

          if (rolId === 'colaborador') {
            const perfilId = box.querySelector('#fPerfil').value;
            if (!perfilId) { UI.toast('Selecciona un perfil de cargo.'); return; }
            const perfil = TH.DB.perfil(perfilId);
            Object.assign(data, {
              perfilId, tipoCargo: perfil.tipoCargo, cargo: perfil.nombre, area: perfil.area,
              jefeId: box.querySelector('#fJefe').value || null
            });
          } else {
            Object.assign(data, { perfilId: null, tipoCargo: null, cargo: 'Administrador del sistema', area: 'Dirección', jefeId: null });
          }

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
