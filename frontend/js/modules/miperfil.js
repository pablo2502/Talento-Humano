/* =========================================================================
   MODULES.miperfil — "Mi perfil" (RF-23)
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  window.Modules.miperfil = function (root, ctx) {
    const usuario = ctx.usuario;
    const rol = ctx.rol;
    const perfil = usuario.perfilId ? TH.DB.perfil(usuario.perfilId) : null;
    const avatarKey = encodeURIComponent(usuario.nombre);

    const esColaborador = usuario.rolId === 'colaborador';
    let desempeñoHtml = '';

    if (esColaborador) {
      const historial = TH.DB.historialDe(usuario.id).filter(h => h.periodo.estado === 'Cerrado');
      const ultimo = historial[historial.length - 1];
      const anterior = historial[historial.length - 2];

      if (ultimo) {
        const tendencia = anterior ? TH.round1(ultimo.consolidado.resultadoGeneral - anterior.consolidado.resultadoGeneral) : null;
        desempeñoHtml = `
          <div class="panel">
            <p class="section-label">Mi desempeño</p>
            <div class="stat-grid">
              <div class="stat-tile" data-accent="red"><span>Resultado general</span><strong>${ultimo.consolidado.resultadoGeneral}%</strong><small>${ultimo.periodo.nombre}</small></div>
              <div class="stat-tile"><span>Competencias</span><strong>${ultimo.consolidado.resultadoCompetencias}%</strong></div>
              <div class="stat-tile"><span>Comportamiento</span><strong>${ultimo.consolidado.resultadoComportamiento}%</strong></div>
              ${tendencia !== null ? `<div class="stat-tile" data-accent="${tendencia >= 0 ? 'green' : 'amber'}"><span>Tendencia</span><strong>${tendencia >= 0 ? '↑' : '↓'} ${Math.abs(tendencia)}%</strong><small>${tendencia >= 0 ? 'Mejorando' : 'En descenso'}</small></div>` : ''}
            </div>
          </div>
        `;
      } else {
        desempeñoHtml = `<div class="panel"><p style="color:var(--ink-soft);font-size:.87rem;margin:0;">Aún no tienes resultados de períodos cerrados.</p></div>`;
      }
    }

    root.innerHTML = `
      <div class="panel" style="margin-bottom:18px;">
        <div style="display:flex;gap:22px;flex-wrap:wrap;align-items:flex-start;">

          <div style="text-align:center;flex-shrink:0;">
            <img src="https://api.dicebear.com/7.x/initials/svg?seed=${avatarKey}&backgroundColor=0A1F3D&textColor=ffffff"
                 alt="" style="width:88px;height:88px;border-radius:50%;display:block;margin-bottom:10px;">
            <span class="pill ${usuario.estado === 'Activo' ? 'pill--ok' : 'pill--neutral'}">${usuario.estado}</span>
          </div>

          <div style="flex:1;min-width:260px;">
            <h2 style="font-size:1.25rem;margin-bottom:2px;">${usuario.nombre}</h2>
            <p style="color:var(--red-600);font-weight:600;font-size:.85rem;margin:0 0 14px;">${rol.nombre}</p>

            <div class="form-grid">
              <div class="field"><label>Correo</label><input value="${usuario.correo}" disabled></div>
              <div class="field"><label>Cargo</label><input value="${usuario.cargo}" disabled></div>
              <div class="field"><label>Área</label><input value="${usuario.area}" disabled></div>
              <div class="field"><label>Fecha de ingreso</label><input value="${UI.formatFecha(usuario.fechaIngreso)}" disabled></div>
              ${perfil ? `<div class="field field--full"><label>Perfil de cargo</label><input value="${perfil.nombre} · nivel esperado ${perfil.nivelEsperado}" disabled></div>` : ''}
            </div>

            <div class="modal-actions" style="justify-content:flex-start;margin-top:18px;">
              <button type="button" class="btn btn--ghost" id="editProfileBtn">Editar información de contacto</button>
            </div>
          </div>

        </div>
      </div>

      ${desempeñoHtml}
    `;

    root.querySelector('#editProfileBtn').addEventListener('click', () => {
      UI.openModal(`
        <h2>Editar información de contacto</h2>
        <p>Los demás datos (rol, cargo, área) los administra el equipo de Talento Humano.</p>
        <div class="field field--full" style="margin-bottom:14px;">
          <label>Correo electrónico</label>
          <input type="email" id="editCorreo" value="${usuario.correo}">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn--ghost" data-modal-close>Cancelar</button>
          <button type="button" class="btn btn--primary" id="saveProfileBtn">Guardar cambios</button>
        </div>
      `, { onOpen: box => {
        box.querySelector('#saveProfileBtn').addEventListener('click', () => {
          const correo = box.querySelector('#editCorreo').value.trim();
          if (!correo) { UI.toast('El correo no puede estar vacío.'); return; }
          TH.DB.actualizar('usuarios', usuario.id, { correo });
          UI.closeModal();
          UI.toast('Información actualizada.');
          ctx.goTo('miperfil');
        });
      } });
    });
  };

})();
