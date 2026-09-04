/* =========================================================================
   MODULES.notificaciones — RF-26
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  window.Modules.notificaciones = function (root, ctx) {
    function pintar() {
      const items = TH.DB.notificacionesDe(ctx.usuario.id);
      const sinLeer = items.filter(n => !n.leida).length;

      root.innerHTML = `
        <div class="view__head">
          <div></div>
          <div class="view__head-actions">
            <button type="button" class="btn btn--ghost" id="markAllBtn" ${sinLeer === 0 ? 'disabled' : ''}>Marcar todas como leídas</button>
          </div>
        </div>

        <div class="panel">
          ${items.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state__icon">${THPanel.icon('notificaciones')}</div>
              <h3>No tienes notificaciones</h3>
              <p>Aquí aparecerán los avisos sobre nuevas evaluaciones, resultados publicados e informes generados.</p>
            </div>
          ` : `
            <div class="results" style="gap:10px;">
              ${items.map(n => `
                <div class="reco-card" style="align-items:center;${n.leida ? 'opacity:.62;' : ''}">
                  <span class="reco-card__badge ${n.leida ? 'reco-card__badge--baja' : 'reco-card__badge--alta'}">${n.leida ? 'Leída' : 'Nueva'}</span>
                  <div class="reco-card__body" style="flex:1;">
                    <h4>${n.tipo}</h4>
                    <p>${n.mensaje}</p>
                    <span class="reco-tag">${UI.formatFecha(n.fecha)}</span>
                  </div>
                  ${!n.leida ? `<button type="button" class="btn btn--ghost btn--sm" data-read="${n.id}">Marcar leída</button>` : ''}
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;

      root.querySelectorAll('[data-read]').forEach(btn => btn.addEventListener('click', () => {
        TH.DB.marcarLeida(btn.dataset.read);
        THPanel.refreshBadges();
        pintar();
      }));

      const markAllBtn = root.querySelector('#markAllBtn');
      if (markAllBtn) markAllBtn.addEventListener('click', () => {
        TH.DB.marcarTodasLeidas(ctx.usuario.id);
        THPanel.refreshBadges();
        pintar();
      });
    }

    pintar();
  };

})();
