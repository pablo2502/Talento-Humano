/* =========================================================================
   MODULES.competencias — Catálogo de competencias (RF-05)
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  window.Modules.competencias = function (root, ctx) {

    function pintar() {
      const items = TH.DB.competencias();

      root.innerHTML = `
        <div class="view__head">
          <div></div>
          <div class="view__head-actions">
            <button type="button" class="btn btn--primary" id="newBtn">+ Nueva competencia</button>
          </div>
        </div>

        <div class="panel">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Código</th><th>Nombre</th><th>Categoría</th><th>Nivel esperado</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                ${items.map(c => `
                  <tr>
                    <td>${c.codigo}</td>
                    <td>${c.nombre}<span class="cell-sub">${c.descripcion}</span></td>
                    <td>${c.categoria}</td>
                    <td>${c.nivelEsperado}</td>
                    <td><span class="pill ${c.estado === 'Activo' ? 'pill--ok' : 'pill--neutral'}">${c.estado}</span></td>
                    <td class="actions-cell">
                      <button type="button" class="icon-btn" data-edit="${c.id}" title="Editar"><svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
                      <button type="button" class="icon-btn icon-btn--danger" data-del="${c.id}" title="Eliminar"><svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M9 7V4h6v3"/></svg></button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      root.querySelector('#newBtn').addEventListener('click', () => abrirFormulario());
      root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => abrirFormulario(TH.DB.competencia(b.dataset.edit))));
      root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
        UI.confirm('Eliminar competencia', '¿Deseas eliminar esta competencia del catálogo?', () => {
          TH.DB.eliminar('competencias', b.dataset.del);
          UI.toast('Competencia eliminada.');
          pintar();
        }, { danger: true, confirmLabel: 'Eliminar' });
      }));
    }

    function abrirFormulario(item) {
      UI.openModal(`
        <h2>${item ? 'Editar competencia' : 'Nueva competencia'}</h2>
        <div class="form-grid">
          <div class="field"><label>Código</label><input id="fCodigo" value="${item ? item.codigo : ''}"></div>
          <div class="field"><label>Nombre</label><input id="fNombre" value="${item ? UI.escapeHtml(item.nombre) : ''}"></div>
          <div class="field"><label>Categoría</label><input id="fCategoria" value="${item ? UI.escapeHtml(item.categoria) : ''}" placeholder="Genérica, Técnica, Directiva..."></div>
          <div class="field">
            <label>Nivel esperado</label>
            <select id="fNivel">${['Básico', 'Intermedio', 'Avanzado'].map(n => `<option ${item && item.nivelEsperado === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
          </div>
          <div class="field field--full"><label>Descripción</label><textarea id="fDesc">${item ? UI.escapeHtml(item.descripcion) : ''}</textarea></div>
          <div class="field field--full">
            <label>Estado</label>
            <select id="fEstado"><option ${!item || item.estado === 'Activo' ? 'selected' : ''}>Activo</option><option ${item && item.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option></select>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn--ghost" data-modal-close>Cancelar</button>
          <button type="button" class="btn btn--primary" id="saveBtn">${item ? 'Guardar cambios' : 'Crear competencia'}</button>
        </div>
      `, { onOpen: box => {
        box.querySelector('#saveBtn').addEventListener('click', () => {
          const data = {
            codigo: box.querySelector('#fCodigo').value.trim(),
            nombre: box.querySelector('#fNombre').value.trim(),
            categoria: box.querySelector('#fCategoria').value.trim(),
            nivelEsperado: box.querySelector('#fNivel').value,
            descripcion: box.querySelector('#fDesc').value.trim(),
            estado: box.querySelector('#fEstado').value
          };
          if (!data.codigo || !data.nombre) { UI.toast('Código y nombre son obligatorios.'); return; }

          if (item) { TH.DB.actualizar('competencias', item.id, data); UI.toast('Competencia actualizada.'); }
          else { TH.DB.crear('competencias', data, 'comp'); UI.toast('Competencia creada.'); }
          UI.closeModal();
          pintar();
        });
      } });
    }

    pintar();
  };

})();
