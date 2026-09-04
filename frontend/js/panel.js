/* =========================================================================
   PANEL.JS
   Núcleo del panel: sesión, navegación por rol y enrutamiento de módulos.
   Depende de data.js, auth.js, ui.js y de los módulos en js/modules/*.js
   (todos deben estar cargados antes que este archivo).
========================================================================= */

(function () {
  'use strict';

  const usuario = TH.Auth.exigirSesion();
  if (!usuario) return; // exigirSesion ya redirigió a login.html

  const rol = TH.DB.rol(usuario.rolId);

  /* =======================================================================
     ICONOS (paths SVG reutilizados en varios módulos)
  ======================================================================= */

  const ICONS = {
    dashboard: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/>',
    usuarios: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><circle cx="18" cy="9" r="2.4"/><path d="M15.5 14.2c2.6.4 4.5 2.4 4.5 5.3"/>',
    roles: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"/>',
    perfiles: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c0-1.7 1.3-3 3-3s3 1.3 3 3"/><path d="M14 9h4"/><path d="M14 13h4"/>',
    competencias: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6" fill="currentColor"/>',
    comportamientos: '<circle cx="12" cy="12" r="9"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/>',
    periodos: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
    evaluadores: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><path d="M16 11l2 2 4-4"/>',
    evaluaciones: '<path d="M9 11l3 3 8-8"/><path d="M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11"/>',
    resultados: '<path d="M4 19V9"/><path d="M12 19V5"/><path d="M20 19v-7"/><path d="M2 19h20"/>',
    seguimiento: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 5v5h5"/><path d="M12 7v5l4 2"/>',
    informes: '<path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h6"/>',
    busqueda: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    ia: '<path d="M12 3l1.9 5.3L19 10l-5.1 1.7L12 17l-1.9-5.3L5 10l5.1-1.7L12 3z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/>',
    notificaciones: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    exit: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>'
  };

  function icon(name) {
    return `<svg viewBox="0 0 24 24">${ICONS[name] || ''}</svg>`;
  }

  /* =======================================================================
     NAVEGACIÓN — visible según rol (RF-03)
  ======================================================================= */

  const NAV = [
    { section: 'Principal', items: [
      { id: 'dashboard', label: 'Panel principal', icon: 'dashboard', roles: ['admin', 'jefe', 'gerente', 'cliente', 'colaborador'] },
      { id: 'miperfil', label: 'Mi perfil', icon: 'perfil', roles: ['admin', 'jefe', 'gerente', 'cliente', 'colaborador'] },
      { id: 'notificaciones', label: 'Notificaciones', icon: 'notificaciones', roles: ['admin', 'jefe', 'gerente', 'cliente', 'colaborador'], badge: true }
    ] },
    { section: 'Administración', items: [
      { id: 'usuarios', label: 'Usuarios', icon: 'usuarios', roles: ['admin'] },
      { id: 'roles', label: 'Roles y permisos', icon: 'roles', roles: ['admin'] },
      { id: 'perfiles', label: 'Perfiles de cargo', icon: 'perfiles', roles: ['admin'] },
      { id: 'competencias', label: 'Competencias', icon: 'competencias', roles: ['admin'] },
      { id: 'comportamientos', label: 'Comportamientos', icon: 'comportamientos', roles: ['admin'] },
      { id: 'periodos', label: 'Períodos', icon: 'periodos', roles: ['admin'] },
      { id: 'evaluadores', label: 'Evaluadores', icon: 'evaluadores', roles: ['admin'] }
    ] },
    { section: 'Evaluación', items: [
      { id: 'evaluaciones', label: 'Realizar evaluación', icon: 'evaluaciones', roles: ['jefe', 'gerente', 'cliente'] },
      { id: 'resultados', label: 'Resultados', icon: 'resultados', roles: ['admin', 'jefe', 'gerente', 'cliente', 'colaborador'] },
      { id: 'seguimiento', label: 'Seguimiento', icon: 'seguimiento', roles: ['admin', 'jefe', 'gerente', 'colaborador'] },
      { id: 'informes', label: 'Informes', icon: 'informes', roles: ['admin', 'jefe', 'gerente'] },
      { id: 'busqueda', label: 'Búsqueda', icon: 'busqueda', roles: ['admin', 'jefe', 'gerente'] },
      { id: 'ia', label: 'Recomendaciones IA', icon: 'ia', roles: ['admin', 'jefe', 'gerente', 'cliente', 'colaborador'] }
    ] }
  ];

  function itemsParaRol() {
    return NAV.map(g => ({ section: g.section, items: g.items.filter(i => i.roles.includes(usuario.rolId)) }))
      .filter(g => g.items.length);
  }

  /* =======================================================================
     RENDER SIDEBAR
  ======================================================================= */

  const sidebarNav = document.getElementById('sidebarNav');
  const avatarKey = encodeURIComponent(usuario.nombre);

  document.getElementById('sidebarProfile').innerHTML = `
    <img src="https://api.dicebear.com/7.x/initials/svg?seed=${avatarKey}&backgroundColor=0A1F3D&textColor=ffffff" alt="">
    <div class="sidebar__profile-info">
      <strong>${UI.escapeHtml(usuario.nombre)}</strong>
      <span>${UI.escapeHtml(rol.nombre)}</span>
    </div>
  `;

  function unreadCount() {
    return TH.DB.notificacionesDe(usuario.id).filter(n => !n.leida).length;
  }

  function renderSidebarNav() {
    const grupos = itemsParaRol();
    sidebarNav.innerHTML = grupos.map(g => `
      <div class="nav-section">
        <p class="nav-section-label">${g.section}</p>
        ${g.items.map(i => `
          <button type="button" class="nav-btn" data-view="${i.id}" aria-current="false">
            ${icon(i.icon)}
            <span class="nav-btn__label">${i.label}</span>
            ${i.badge ? `<span class="nav-btn__badge" id="navBadge-${i.id}" hidden>0</span>` : ''}
          </button>
        `).join('')}
      </div>
    `).join('');

    sidebarNav.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => goTo(btn.dataset.view));
    });

    refreshBadges();
  }

  function refreshBadges() {
    const n = unreadCount();
    const navBadge = document.getElementById('navBadge-notificaciones');
    if (navBadge) {
      navBadge.hidden = n === 0;
      navBadge.textContent = n;
    }
    const bellDot = document.getElementById('bellDot');
    if (bellDot) bellDot.hidden = n === 0;
  }

  /* =======================================================================
     ROUTER
  ======================================================================= */

  const viewRoot = document.getElementById('viewRoot');
  let currentView = null;

  const MODULE_META = {
    dashboard: { title: 'Panel principal', desc: 'Resumen del sistema según tu rol.' },
    miperfil: { title: 'Mi perfil', desc: 'Tu información personal y de desempeño.' },
    notificaciones: { title: 'Notificaciones', desc: 'Avisos generados por el sistema.' },
    usuarios: { title: 'Usuarios', desc: 'Crea, edita y desactiva usuarios del sistema (RF-02).' },
    roles: { title: 'Roles y permisos', desc: 'Consulta los permisos asociados a cada rol (RF-03).' },
    perfiles: { title: 'Perfiles de cargo', desc: 'Administra los perfiles y las competencias/comportamientos que exigen (RF-04).' },
    competencias: { title: 'Competencias', desc: 'Catálogo de competencias evaluables (RF-05).' },
    comportamientos: { title: 'Comportamientos', desc: 'Catálogo de comportamientos e indicadores observables (RF-06).' },
    periodos: { title: 'Períodos de evaluación', desc: 'Crea, activa y cierra los períodos de evaluación (RF-08).' },
    evaluadores: { title: 'Evaluadores', desc: 'Selecciona colaboradores y asigna evaluadores por período (RF-09, RF-10, RF-28).' },
    evaluaciones: { title: 'Realizar evaluación', desc: 'Evalúa a los colaboradores asignados en el período activo (RF-11 a RF-13).' },
    resultados: { title: 'Resultados', desc: 'Resultados por competencia, comportamiento y consolidado (RF-14 a RF-16).' },
    seguimiento: { title: 'Seguimiento', desc: 'Evolución del desempeño entre períodos (RF-17, RF-18).' },
    informes: { title: 'Informes', desc: 'Genera informes individuales, por área o generales en PDF (RF-19 a RF-21).' },
    busqueda: { title: 'Búsqueda', desc: 'Filtra colaboradores, evaluaciones y resultados (RF-22).' },
    ia: { title: 'Recomendaciones de IA', desc: 'Apoyo de inteligencia artificial para el análisis del desempeño (RF-25).' }
  };

  function goTo(viewId, params) {
    if (!MODULE_META[viewId]) viewId = 'dashboard';
    currentView = viewId;

    sidebarNav.querySelectorAll('.nav-btn').forEach(btn => {
      btn.setAttribute('aria-current', btn.dataset.view === viewId ? 'true' : 'false');
    });

    const meta = MODULE_META[viewId];
    document.getElementById('topTitleEyebrow').textContent = rol.nombre;
    document.getElementById('topTitleH1').textContent = meta.title;
    document.getElementById('topTitleP').textContent = meta.desc;

    viewRoot.innerHTML = '';
    const ctx = { usuario, rol, goTo, params: params || {} };

    try {
      const renderFn = window.Modules && window.Modules[viewId];
      if (typeof renderFn === 'function') {
        renderFn(viewRoot, ctx);
      } else {
        viewRoot.innerHTML = `<div class="panel"><p>Módulo "${viewId}" no disponible.</p></div>`;
      }
    } catch (err) {
      console.error('Error al renderizar el módulo', viewId, err);
      viewRoot.innerHTML = `<div class="panel"><p>Ocurrió un error al cargar este módulo. Revisa la consola para más detalle.</p></div>`;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    refreshBadges();
  }

  window.THPanel = { goTo, icon, refreshBadges, usuario, rol };

  /* =======================================================================
     CAMPANA DE NOTIFICACIONES
  ======================================================================= */

  document.getElementById('bellBtn').addEventListener('click', () => goTo('notificaciones'));

  /* =======================================================================
     SALIR (RF-01)
  ======================================================================= */

  document.getElementById('logoutBtn').addEventListener('click', () => {
    UI.openModal(`
      <h2>¿Salir del sistema?</h2>
      <p>Se cerrará tu sesión actual en el sistema de evaluación de desempeño.</p>
      <div class="modal-actions modal-actions--center">
        <button type="button" class="btn btn--ghost" data-modal-close>Cancelar</button>
        <button type="button" class="btn btn--primary" id="confirmLogoutBtn">Salir</button>
      </div>
    `, { small: true, onOpen: box => {
      box.querySelector('#confirmLogoutBtn').addEventListener('click', () => {
        TH.Auth.cerrarSesion();
        window.location.href = 'login.html';
      });
    } });
  });

  /* =======================================================================
     INICIALIZACIÓN
  ======================================================================= */

  renderSidebarNav();
  goTo('dashboard');

})();
