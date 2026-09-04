/* =========================================================================
   UI.JS
   Utilidades de interfaz compartidas: modal genérico, helpers de formato.
   Depende de que exista en el DOM #modalOverlay > #modalBox (ver panel.html).
========================================================================= */

(function (global) {
  'use strict';

  let overlay, box;

  function init() {
    overlay = document.getElementById('modalOverlay');
    box = document.getElementById('modalBox');

    overlay.addEventListener('click', event => {
      if (event.target === overlay) UI.closeModal();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && overlay.classList.contains('is-open')) UI.closeModal();
    });
  }

  const UI = {
    openModal(innerHtml, opts) {
      opts = opts || {};
      box.className = 'modal-box' + (opts.small ? ' modal-box--sm' : '');
      box.innerHTML = `
        <button type="button" class="modal-close" data-modal-close aria-label="Cerrar">×</button>
        ${innerHtml}
      `;
      overlay.hidden = false;
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');

      box.querySelectorAll('[data-modal-close]').forEach(btn => btn.addEventListener('click', UI.closeModal));

      if (opts.onOpen) opts.onOpen(box);
    },

    closeModal() {
      if (!overlay) return;
      overlay.classList.remove('is-open');
      overlay.hidden = true;
      overlay.setAttribute('aria-hidden', 'true');
      box.innerHTML = '';
    },

    confirm(titulo, mensaje, onConfirm, opts) {
      opts = opts || {};
      UI.openModal(`
        <h2>${titulo}</h2>
        <p>${mensaje}</p>
        <div class="modal-actions modal-actions--center">
          <button type="button" class="btn btn--ghost" data-modal-close>Cancelar</button>
          <button type="button" class="btn ${opts.danger ? 'btn--danger' : 'btn--primary'}" id="confirmActionBtn">${opts.confirmLabel || 'Confirmar'}</button>
        </div>
      `, { small: true, onOpen: box => {
        box.querySelector('#confirmActionBtn').addEventListener('click', () => { UI.closeModal(); onConfirm(); });
      } });
    },

    escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },

    formatFecha(iso) {
      if (!iso) return '—';
      const [y, m, d] = iso.split('-');
      return `${d}/${m}/${y}`;
    },

    toast(mensaje) {
      let host = document.getElementById('toastHost');
      if (!host) {
        host = document.createElement('div');
        host.id = 'toastHost';
        host.style.cssText = 'position:fixed;bottom:22px;right:22px;z-index:10000;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(host);
      }
      const el = document.createElement('div');
      el.textContent = mensaje;
      el.style.cssText = 'background:#0A1F3D;color:#fff;padding:12px 18px;border-radius:10px;font-size:.85rem;box-shadow:0 15px 35px rgba(0,0,0,.25);animation:fadeSlideIn .2s ease;';
      host.appendChild(el);
      setTimeout(() => { el.style.transition = 'opacity .3s ease'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2200);
    }
  };

  document.addEventListener('DOMContentLoaded', init);

  global.UI = UI;

})(window);
