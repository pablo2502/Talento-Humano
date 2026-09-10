/* =========================================================================
   MODULES.dashboard — Panel principal (RF-24), distinto según el rol.
   Modelo 360° real: Administrador (gestión) y Colaborador (todos los
   demás, que se autoevalúan y evalúan a su jefe/pares/subalternos según
   la estructura organizacional).
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  function ringSvg(pct) {
    const r = 44, c = 2 * Math.PI * r;
    const offset = c - (c * pct / 100);
    return `
      <svg width="96" height="96" viewBox="0 0 104 104">
        <circle cx="52" cy="52" r="${r}" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="10"/>
        <circle cx="52" cy="52" r="${r}" fill="none" stroke="#C81D30" stroke-width="10"
          stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
      </svg>
    `;
  }

  function moduleCard(target, iconName, title, desc, accent) {
    return `
      <button type="button" class="module-card" data-goto="${target}" ${accent ? `data-accent="${accent}"` : ''}>
        <span class="module-card__icon">${THPanel.icon(iconName)}</span>
        <h3>${title}</h3>
        <p>${desc}</p>
        <span class="module-card__arrow">Entrar <svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></span>
      </button>
    `;
  }

  function wireShortcuts(root, ctx) {
    root.querySelectorAll('[data-goto]').forEach(el => el.addEventListener('click', () => ctx.goTo(el.dataset.goto)));
  }

  function statTile(label, value, sub, accent) {
    return `<div class="stat-tile" ${accent ? `data-accent="${accent}"` : ''}><span>${label}</span><strong>${value}</strong>${sub ? `<small>${sub}</small>` : ''}</div>`;
  }

  function cicloAvance(misEvaluaciones) {
    if (!misEvaluaciones.length) return 0;
    const puntos = misEvaluaciones.reduce((sum, e) => {
      if (['Finalizada', 'Consolidada', 'Cerrada'].includes(e.estado)) return sum + 1;
      if (e.estado === 'En proceso') return sum + 0.5;
      return sum;
    }, 0);
    return Math.round((puntos / misEvaluaciones.length) * 100);
  }

  /* ---------------------------------------------------------------------
     ADMINISTRADOR
  --------------------------------------------------------------------- */

  function renderAdmin(root, ctx) {
    const colaboradores = TH.DB.usuarios().filter(u => u.rolId === 'colaborador');
    const activos = colaboradores.filter(c => c.estado === 'Activo');
    const evaluaciones = TH.DB.evaluaciones();
    const pendientes = evaluaciones.filter(e => !['Consolidada', 'Cerrada'].includes(e.estado)).length;
    const finalizadas = evaluaciones.filter(e => ['Finalizada', 'Consolidada', 'Cerrada'].includes(e.estado)).length;

    const periodoBase = TH.DB.periodos().slice().reverse().find(p => p.estado === 'Cerrado') || TH.DB.periodoActivo();
    const consolidados = activos.map(c => TH.DB.consolidar(c.id, periodoBase.id)).filter(Boolean);
    const promedioGeneral = consolidados.length ? TH.round1(TH.promedio(consolidados.map(c => c.pctGeneral))) : 0;
    const promedioScore = consolidados.length ? TH.round1(TH.promedio(consolidados.map(c => c.scoreGeneral))) : 0;

    const niveles = ['estrategico', 'tactico', 'apoyo'];
    const porNivel = niveles.map(nivel => {
      const cons = activos.filter(c => c.tipoCargo === nivel).map(c => TH.DB.consolidar(c.id, periodoBase.id)).filter(Boolean);
      return { nivel, label: TH.TIPO_CARGO_LABEL[nivel], promedio: cons.length ? TH.round1(TH.promedio(cons.map(c => c.pctGeneral))) : 0, n: cons.length };
    });

    const porPeriodo = TH.DB.periodos().map(p => {
      const cons = activos.map(c => TH.DB.consolidar(c.id, p.id)).filter(Boolean);
      return { periodo: p, promedio: cons.length ? TH.round1(TH.promedio(cons.map(c => c.pctGeneral))) : null };
    }).filter(p => p.promedio !== null);

    root.innerHTML = `
      <div class="stat-grid">
        ${statTile('Colaboradores', activos.length, colaboradores.length - activos.length + ' inactivos')}
        ${statTile('Evaluaciones totales', evaluaciones.length)}
        ${statTile('Pendientes / en curso', pendientes, null, 'amber')}
        ${statTile('Finalizadas', finalizadas, null, 'green')}
        ${statTile('Promedio general', promedioScore + '/5', promedioGeneral + '% · ' + periodoBase.nombre, 'red')}
      </div>

      <div class="panel" style="margin-bottom:18px;">
        <p class="section-label">Promedio por nivel de cargo — ${periodoBase.nombre}</p>
        <div class="results">
          ${porNivel.map(n => `
            <div class="result-row">
              <div class="result-row__label">${n.label} <span class="cell-sub" style="display:inline;">(${n.n})</span></div>
              <div class="result-row__bar"><div class="result-row__fill" style="width:${n.promedio}%"></div></div>
              <div class="result-row__value">${n.promedio}%</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="panel" style="margin-bottom:24px;">
        <p class="section-label">Promedio por período</p>
        <div class="trend-row">
          ${porPeriodo.map(p => `
            <div class="trend-bar">
              <span class="trend-bar__value">${p.promedio}%</span>
              <div class="trend-bar__col" style="height:${Math.max(6, p.promedio)}%"></div>
              <span class="trend-bar__label">${p.periodo.nombre.replace('20', "'")}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <p class="grid-label section-label">Módulos de administración</p>
      <div class="modules-grid">
        ${moduleCard('usuarios', 'usuarios', 'Usuarios', 'Crea, edita y desactiva usuarios del sistema.', 'red')}
        ${moduleCard('perfiles', 'perfiles', 'Perfiles de cargo', 'Cargos institucionales y su nivel (Estratégico/Táctico/Apoyo).')}
        ${moduleCard('periodos', 'periodos', 'Períodos', 'Crea, activa y cierra ciclos de evaluación.')}
        ${moduleCard('evaluadores', 'evaluadores', 'Asignación 360°', 'Consulta las evaluaciones generadas por estructura organizacional.')}
        ${moduleCard('busqueda', 'busqueda', 'Búsqueda', 'Filtra colaboradores y resultados.')}
        ${moduleCard('informes', 'informes', 'Informes', 'Genera el informe general en PDF.')}
      </div>
    `;

    wireShortcuts(root, ctx);
  }

  /* ---------------------------------------------------------------------
     COLABORADOR (todos: se autoevalúan y evalúan jefe/pares/subalternos
     según su lugar en la estructura organizacional)
  --------------------------------------------------------------------- */

  function renderColaborador(root, ctx) {
    const usuario = ctx.usuario;
    const periodoActivo = TH.DB.periodoActivo();
    const misEvaluaciones = TH.DB.evaluacionesAsignadasA(usuario.id, periodoActivo.id);
    const pendientes = misEvaluaciones.filter(e => e.estado === 'Pendiente').length;
    const enProceso = misEvaluaciones.filter(e => e.estado === 'En proceso').length;
    const avance = cicloAvance(misEvaluaciones);

    const historial = TH.DB.historialDe(usuario.id).filter(h => h.periodo.estado === 'Cerrado');
    const ultimo = historial[historial.length - 1];
    const anterior = historial[historial.length - 2];
    const tendencia = ultimo && anterior ? TH.round1(ultimo.consolidado.scoreGeneral - anterior.consolidado.scoreGeneral) : null;

    const subalternos = TH.DB.subalternosDirectos(usuario.id);
    const pares = TH.DB.paresDe(usuario.id);

    root.innerHTML = `
      <div class="hero">
        <div class="hero__ring">${ringSvg(avance)}<div class="hero__ring-label">${avance}%</div></div>
        <div class="hero__body">
          <p class="eyebrow">Ciclo activo · ${periodoActivo.nombre}</p>
          <h2>${(pendientes + enProceso) > 0 ? `Tienes ${pendientes + enProceso} evaluación(es) por completar` : 'Ya completaste tus evaluaciones de este ciclo'}</h2>
          <p class="desc">Como parte del modelo 360°, te autoevalúas${usuario.jefeId ? ', evalúas a tu jefe' : ''}${pares.length ? ' y a tus pares' : ''}${subalternos.length ? ', y a las ' + subalternos.length + ' persona(s) a tu cargo' : ''}. Ingresa a "Realizar evaluación" para continuar.</p>
        </div>
      </div>

      <div class="stat-grid">
        ${ultimo ? statTile('Último resultado', ultimo.consolidado.scoreGeneral + '/5', ultimo.consolidado.pctGeneral + '% · ' + ultimo.periodo.nombre, 'red') : statTile('Último resultado', '—')}
        ${ultimo ? statTile('Nivel alcanzado', ultimo.consolidado.descriptor) : ''}
        ${tendencia !== null ? statTile('Frente al período anterior', (tendencia >= 0 ? '+' : '') + tendencia, tendencia >= 0 ? 'Mejorando' : 'En descenso', tendencia >= 0 ? 'green' : 'amber') : ''}
        ${subalternos.length ? statTile('Personas a cargo', subalternos.length) : ''}
      </div>

      <p class="grid-label section-label">Módulos disponibles</p>
      <div class="modules-grid">
        ${moduleCard('evaluaciones', 'evaluaciones', 'Realizar evaluación', 'Autoevaluación y evaluación 360° del ciclo actual.', 'red')}
        ${moduleCard('resultados', 'resultados', 'Consultar resultados', 'Tu resultado por evaluador (Auto/Jefe/Par/Subalterno) y consolidado.')}
        ${moduleCard('seguimiento', 'seguimiento', 'Consultar seguimiento', 'Tu evolución entre períodos.')}
        ${moduleCard('ia', 'ia', 'Recomendaciones de IA', 'Sugerencias generadas a partir de tus resultados.')}
      </div>
    `;

    wireShortcuts(root, ctx);
  }

  window.Modules.dashboard = function (root, ctx) {
    if (ctx.usuario.rolId === 'admin') return renderAdmin(root, ctx);
    return renderColaborador(root, ctx);
  };

})();
