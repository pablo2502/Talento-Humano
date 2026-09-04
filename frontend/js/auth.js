/* =========================================================================
   AUTH.JS
   Autenticación y sesión (RF-01). Depende de data.js (window.TH.DB).
========================================================================= */

(function (global) {
  'use strict';

  const SESSION_KEY = 'th_sesion_usuario_id';

  const Auth = {
    intentarLogin(correoOUsuario, password) {
      const usuario = TH.DB.usuarios().find(u =>
        u.correo.toLowerCase() === String(correoOUsuario).trim().toLowerCase()
      );
      if (!usuario) return { ok: false, error: 'Usuario o contraseña incorrectos.' };
      if (usuario.estado !== 'Activo') return { ok: false, error: 'Este usuario se encuentra inactivo. Contacta al administrador.' };
      if (usuario.password !== password) return { ok: false, error: 'Usuario o contraseña incorrectos.' };
      sessionStorage.setItem(SESSION_KEY, usuario.id);
      return { ok: true, usuario };
    },

    usuarioActual() {
      const id = sessionStorage.getItem(SESSION_KEY);
      if (!id) return null;
      return TH.DB.usuario(id) || null;
    },

    rolActual() {
      const usuario = Auth.usuarioActual();
      return usuario ? TH.DB.rol(usuario.rolId) : null;
    },

    cerrarSesion() {
      sessionStorage.removeItem(SESSION_KEY);
    },

    // Redirige a login.html si no hay sesión válida. Usar al inicio de panel.html.
    exigirSesion() {
      const usuario = Auth.usuarioActual();
      if (!usuario) {
        window.location.href = 'login.html';
        return null;
      }
      return usuario;
    }
  };

  global.TH = global.TH || {};
  global.TH.Auth = Auth;

})(window);
