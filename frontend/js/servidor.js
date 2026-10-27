/* =========================================================================
   SERVIDOR.JS
   Conexión con la capa de aplicación (backend Spring Boot, /api/v2).

   data.js la usa como su capa de persistencia: lee la base del servidor al
   cargar la página y le envía los cambios en cada guardado. Si no hay
   backend disponible (p.ej. abierto con `python -m http.server`), data.js
   sigue funcionando solo con localStorage, exactamente como antes.

   Las lecturas son síncronas a propósito: TH.DB es una API síncrona que
   usan todos los módulos, y así ninguno tiene que cambiar.
========================================================================= */

(function (global) {
  'use strict';

  // Relativa a la página: con nginx, /api/ se redirige al backend.
  const BASE = global.TH_API_BASE || 'api/v2';
  const TOKEN_KEY = 'th_token';

  function token() {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }

  function pedir(metodo, ruta, cuerpo, conToken) {
    const xhr = new XMLHttpRequest();
    try {
      xhr.open(metodo, BASE + ruta, false);
      xhr.setRequestHeader('Accept', 'application/json');
      if (cuerpo !== undefined) xhr.setRequestHeader('Content-Type', 'application/json');
      if (conToken && token()) xhr.setRequestHeader('Authorization', 'Bearer ' + token());
      xhr.send(cuerpo === undefined ? null : JSON.stringify(cuerpo));
    } catch (e) {
      return { status: 0, datos: null };
    }
    let datos = null;
    try { datos = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch (e) { /* no es JSON */ }
    return { status: xhr.status, datos };
  }

  function sesionRechazada(status) {
    if (status === 401 || status === 403) {
      sessionStorage.removeItem(TOKEN_KEY);
      return true;
    }
    return false;
  }

  const Servidor = {
    // { inicializado } si hay backend; null si no lo hay.
    estado() {
      const r = pedir('GET', '/datos/estado');
      return r.status === 200 && r.datos && typeof r.datos.inicializado === 'boolean' ? r.datos : null;
    },

    // Primer arranque: sube la base inicial. 409 = otro navegador se adelantó.
    inicializar(colecciones) {
      const r = pedir('POST', '/datos/inicializar', { colecciones });
      return r.status === 201 || r.status === 409;
    },

    // Devuelve las colecciones del servidor, o null (sin sesión / sin conexión).
    obtener() {
      const r = pedir('GET', '/datos', undefined, true);
      if (r.status === 200 && r.datos && r.datos.colecciones) return r.datos.colecciones;
      sesionRechazada(r.status);
      return null;
    },

    enviarCambiosSync(cambios) {
      const r = pedir('POST', '/datos/cambios', cambios, true);
      sesionRechazada(r.status);
      return r.status >= 200 && r.status < 300;
    },

    // Guardado en segundo plano (no congela la pantalla). Resuelve true/false.
    enviarCambios(cambios, alSalir) {
      const cuerpo = JSON.stringify(cambios);
      return fetch(BASE + '/datos/cambios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() },
        body: cuerpo,
        // keepalive deja terminar el envío aunque se cierre la pestaña (máx. 64 KB).
        keepalive: !!alSalir && cuerpo.length < 60000
      }).then(r => {
        sesionRechazada(r.status);
        return r.ok;
      }, () => false);
    },

    borrarTodo() {
      return pedir('DELETE', '/datos', undefined, true).status === 204;
    },

    // { ok, error, usuarioId } — mismo formato que el login local de auth.js.
    login(correo, password) {
      const r = pedir('POST', '/auth/login', { correo, password });
      if (r.status === 200 && r.datos && r.datos.ok) {
        sessionStorage.setItem(TOKEN_KEY, r.datos.token);
        return { ok: true, usuarioId: r.datos.usuarioId };
      }
      if (r.datos && r.datos.error) return { ok: false, error: r.datos.error };
      return { ok: false, error: 'No fue posible conectar con el servidor. Intenta de nuevo.' };
    },

    haySesion() {
      return !!token();
    },

    cerrarSesion() {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  };

  global.TH_Servidor = Servidor;

})(window);
