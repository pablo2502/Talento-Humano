/* =========================================================================
   MODULES.miperfil — "Mi perfil" (RF-23)
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  window.Modules.miperfil = function (root, ctx) {
    const usuario = ctx.usuario;
    const rol = ctx.rol;
    const avatarKey = encodeURIComponent(usuario.nombre);
    const esColaborador = usuario.rolId === 'colaborador';

    let estructuraHtml = '';
    let desempeñoHtml = '';

    if (esColaborador) {
      const jefe = TH.DB.jefeDe(usuario.id);
      const pares = TH.DB.paresDe(usuario.id);
      const subalternos = TH.DB.subalternosDirectos(usuario.id);

      estructuraHtml = `
        <div class="panel" style="margin-bottom:18px;">
          <p class="section-label">Estructura organizacional y evaluadores 360°</p>
          <div class="form-grid">
            <div class="field"><label>Nivel de cargo</label><input value="${TH.TIPO_CARGO_LABEL[usuario.tipoCargo]}" disabled></div>
            <div class="field"><label>Jefe inmediato</label><input value="${jefe ? jefe.nombre : '— (nivel más alto)'}" disabled></div>
            <div class="field field--full"><label>Pares (${pares.length})</label><input value="${pares.length ? pares.map(p => p.nombre).join(', ') : 'Sin pares registrados'}" disabled></div>
            <div class="field field--full"><label>Personas a cargo (${subalternos.length})</label><input value="${subalternos.length ? subalternos.map(s => s.nombre).join(', ') : 'No tiene personal a cargo'}" disabled></div>
          </div>
        </div>
      `;

      const historial = TH.DB.historialDe(usuario.id).filter(h => h.periodo.estado === 'Cerrado');
      const ultimo = historial[historial.length - 1];
      const anterior = historial[historial.length - 2];

      if (ultimo) {
        const tendencia = anterior ? TH.round1(ultimo.consolidado.scoreGeneral - anterior.consolidado.scoreGeneral) : null;
        desempeñoHtml = `
          <div class="panel">
            <p class="section-label">Mi desempeño — ${ultimo.periodo.nombre}</p>
            <div class="stat-grid">
              <div class="stat-tile" data-accent="red"><span>Resultado general</span><strong>${ultimo.consolidado.scoreGeneral}/5</strong><small>${ultimo.consolidado.pctGeneral}% · ${ultimo.consolidado.descriptor}</small></div>
              ${ultimo.consolidado.detalle.JEFE !== undefined ? `<div class="stat-tile"><span>Jefe</span><strong>${ultimo.consolidado.detalle.JEFE}/5</strong></div>` : ''}
              ${ultimo.consolidado.detalle.PAR !== undefined ? `<div class="stat-tile"><span>Par</span><strong>${ultimo.consolidado.detalle.PAR}/5</strong></div>` : ''}
              ${ultimo.consolidado.detalle.AUTO !== undefined ? `<div class="stat-tile"><span>Autoevaluación</span><strong>${ultimo.consolidado.detalle.AUTO}/5</strong></div>` : ''}
              ${ultimo.consolidado.detalle.SUBALTERNO !== undefined ? `<div class="stat-tile"><span>Subalterno</span><strong>${ultimo.consolidado.detalle.SUBALTERNO}/5</strong></div>` : ''}
              ${ultimo.consolidado.detalle.SST !== undefined ? `<div class="stat-tile"><span>SST</span><strong>${ultimo.consolidado.detalle.SST}/5</strong></div>` : ''}
              ${tendencia !== null ? `<div class="stat-tile" data-accent="${tendencia >= 0 ? 'green' : 'amber'}"><span>Tendencia</span><strong>${tendencia >= 0 ? '↑' : '↓'} ${Math.abs(tendencia)}</strong><small>${tendencia >= 0 ? 'Mejorando' : 'En descenso'}</small></div>` : ''}
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
            <p style="color:var(--red-600);font-weight:600;font-size:.85rem;margin:0 0 14px;">${rol.nombre}${esColaborador ? ' · ' + usuario.cargo : ''}</p>

            <div class="form-grid">
              <div class="field"><label>Correo</label><input value="${usuario.correo}" disabled></div>
              <div class="field"><label>Área</label><input value="${usuario.area}" disabled></div>
              <div class="field"><label>Fecha de ingreso</label><input value="${UI.formatFecha(usuario.fechaIngreso)}" disabled></div>
              <div class="field"><label>Documento</label><input value="${usuario.documento || '—'}" disabled></div>
            </div>

            <div class="modal-actions" style="justify-content:flex-start;margin-top:18px;">
              <button type="button" class="btn btn--ghost" id="editProfileBtn">Editar información de contacto</button>
            </div>
          </div>

        </div>
      </div>

      ${estructuraHtml}
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
