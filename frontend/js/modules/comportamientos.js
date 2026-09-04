/* =========================================================================
   MODULES.comportamientos — Catálogo de comportamientos (RF-06)
   Misma estructura de campos que Competencias (código, nombre, descripción,
   estado) más uno o varios indicadores observables.
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  window.Modules.comportamientos = function (root, ctx) {

    function pintar() {
      const items = TH.DB.comportamientos();

      root.innerHTML = `
        <div class="view__head">
          <div></div>
          <div class="view__head-actions">
            <button type="button" class="btn btn--primary" id="newBtn">+ Nuevo comportamiento</button>
          </div>
        </div>

        <div class="modules-grid">
          ${items.map(c => `
            <div class="card">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;">
                <div>
                  <h3 style="font-size:1rem;">${c.codigo} · ${c.nombre}</h3>
                </div>
                <span class="pill ${c.estado === 'Activo' ? 'pill--ok' : 'pill--neutral'}">${c.estado}</span>
              </div>
              <p style="color:var(--ink-soft);font-size:.83rem;line-height:1.5;margin:0 0 12px;">${c.descripcion}</p>
              <p class="section-label" style="margin-bottom:6px;">Indicadores observables</p>
              <div class="chip-picker" style="margin-bottom:14px;">
                ${c.indicadores.map(i => `<span class="chip chip--static">${i}</span>`).join('')}
              </div>
              <div class="modal-actions" style="justify-content:flex-start;margin-top:0;">
                <button type="button" class="btn btn--ghost btn--sm" data-edit="${c.id}">Editar</button>
                <button type="button" class="btn btn--danger btn--sm" data-del="${c.id}">Eliminar</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      root.querySelector('#newBtn').addEventListener('click', () => abrirFormulario());
      root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => abrirFormulario(TH.DB.comportamiento(b.dataset.edit))));
      root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
        UI.confirm('Eliminar comportamiento', '¿Deseas eliminar este comportamiento del catálogo?', () => {
          TH.DB.eliminar('comportamientos', b.dataset.del);
          UI.toast('Comportamiento eliminado.');
          pintar();
        }, { danger: true, confirmLabel: 'Eliminar' });
      }));
    }

    function abrirFormulario(item) {
      let indicadores = item ? item.indicadores.slice() : [];

      function listaHtml() {
        return indicadores.map((p, i) => `<span class="chip" data-idx="${i}">${p} <span aria-hidden="true">×</span></span>`).join('');
      }

      UI.openModal(`
        <h2>${item ? 'Editar comportamiento' : 'Nuevo comportamiento'}</h2>
        <div class="form-grid">
          <div class="field"><label>Código</label><input id="fCodigo" value="${item ? item.codigo : ''}"></div>
          <div class="field"><label>Nombre</label><input id="fNombre" value="${item ? UI.escapeHtml(item.nombre) : ''}"></div>
          <div class="field field--full"><label>Descripción</label><textarea id="fDesc">${item ? UI.escapeHtml(item.descripcion) : ''}</textarea></div>
          <div class="field field--full">
            <label>Estado</label>
            <select id="fEstado"><option ${!item || item.estado === 'Activo' ? 'selected' : ''}>Activo</option><option ${item && item.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option></select>
          </div>
          <div class="field field--full">
            <label>Indicadores observables</label>
            <div class="chip-picker" id="indList" style="margin-bottom:10px;">${listaHtml()}</div>
            <div style="display:flex;gap:8px;">
              <input id="newInd" placeholder="Ej: Cumple sus compromisos" style="flex:1;">
              <button type="button" class="btn btn--ghost" id="addIndBtn">Agregar</button>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn--ghost" data-modal-close>Cancelar</button>
          <button type="button" class="btn btn--primary" id="saveBtn">${item ? 'Guardar cambios' : 'Crear comportamiento'}</button>
        </div>
      `, { onOpen: box => {
        const indList = box.querySelector('#indList');
        function refrescar() {
          indList.innerHTML = listaHtml();
          indList.querySelectorAll('.chip').forEach(chip => chip.addEventListener('click', () => {
            indicadores.splice(Number(chip.dataset.idx), 1);
            refrescar();
          }));
        }
        refrescar();

        box.querySelector('#addIndBtn').addEventListener('click', () => {
          const input = box.querySelector('#newInd');
          const val = input.value.trim();
          if (!val) return;
          indicadores.push(val);
          input.value = '';
          refrescar();
        });

        box.querySelector('#saveBtn').addEventListener('click', () => {
          const data = {
            codigo: box.querySelector('#fCodigo').value.trim(),
            nombre: box.querySelector('#fNombre').value.trim(),
            descripcion: box.querySelector('#fDesc').value.trim(),
            estado: box.querySelector('#fEstado').value,
            indicadores
          };
          if (!data.codigo || !data.nombre) { UI.toast('Código y nombre son obligatorios.'); return; }

          if (item) { TH.DB.actualizar('comportamientos', item.id, data); UI.toast('Comportamiento actualizado.'); }
          else { TH.DB.crear('comportamientos', data, 'com'); UI.toast('Comportamiento creado.'); }
          UI.closeModal();
          pintar();
        });
      } });
    }

    pintar();
  };

})();
