/* =========================================================================
   MODULES.dashboard — Panel principal (RF-24), distinto según el rol.
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  function cicloAvance(colaboradorId, periodoId) {
    const evs = TH.DB.evaluacionesDe(colaboradorId, periodoId);
    if (!evs.length) return 0;
    const puntos = evs.reduce((sum, e) => {
      if (['Finalizada', 'Consolidada', 'Cerrada'].includes(e.estado)) return sum + 1;
      if (e.estado === 'En proceso') return sum + 0.5;
      return sum;
    }, 0);
    return Math.round((puntos / evs.length) * 100);
  }

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
    const promedioGeneral = TH.round1(TH.promedio(consolidados.map(c => c.resultadoGeneral)));

    const areas = [...new Set(activos.map(c => c.area))];
    const porArea = areas.map(area => {
      const cons = activos.filter(c => c.area === area).map(c => TH.DB.consolidar(c.id, periodoBase.id)).filter(Boolean);
      return { area, promedio: TH.round1(TH.promedio(cons.map(c => c.resultadoGeneral))) };
    });

    const porPeriodo = TH.DB.periodos().map(p => {
      const cons = activos.map(c => TH.DB.consolidar(c.id, p.id)).filter(Boolean);
      return { periodo: p, promedio: cons.length ? TH.round1(TH.promedio(cons.map(c => c.resultadoGeneral))) : null };
    }).filter(p => p.promedio !== null);

    root.innerHTML = `
      <div class="stat-grid">
        ${statTile('Colaboradores', activos.length, colaboradores.length - activos.length + ' inactivos')}
        ${statTile('Evaluaciones totales', evaluaciones.length)}
        ${statTile('Pendientes / en curso', pendientes, null, 'amber')}
        ${statTile('Finalizadas', finalizadas, null, 'green')}
        ${statTile('Promedio general', promedioGeneral + '%', periodoBase.nombre, 'red')}
      </div>

      <div class="panel" style="margin-bottom:18px;">
        <p class="section-label">Promedio por área — ${periodoBase.nombre}</p>
        <div class="results">
          ${porArea.map(a => `
            <div class="result-row">
              <div class="result-row__label">${a.area}</div>
              <div class="result-row__bar"><div class="result-row__fill" style="width:${a.promedio}%"></div></div>
              <div class="result-row__value">${a.promedio}%</div>
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
        ${moduleCard('perfiles', 'perfiles', 'Perfiles de cargo', 'Define competencias y comportamientos por cargo.')}
        ${moduleCard('periodos', 'periodos', 'Períodos', 'Crea, activa y cierra ciclos de evaluación.')}
        ${moduleCard('evaluadores', 'evaluadores', 'Evaluadores', 'Asigna evaluadores por estructura organizacional.')}
        ${moduleCard('busqueda', 'busqueda', 'Búsqueda', 'Filtra colaboradores y resultados.')}
        ${moduleCard('informes', 'informes', 'Informes', 'Genera el informe general en PDF.')}
      </div>
    `;

    wireShortcuts(root, ctx);
  }

  /* ---------------------------------------------------------------------
     JEFE / GERENTE
  --------------------------------------------------------------------- */

  function renderEvaluador(root, ctx) {
    const usuario = ctx.usuario;
    const equipo = usuario.rolId === 'jefe' ? TH.DB.equipoDe(usuario.id) : TH.DB.areaDe(usuario.id);
    const activos = equipo.filter(c => c.estado === 'Activo');
    const periodoActivo = TH.DB.periodoActivo();
    const misEvaluaciones = TH.DB.evaluacionesAsignadasA(usuario.id, periodoActivo.id);
    const pendientes = misEvaluaciones.filter(e => e.estado === 'Pendiente').length;
    const enProceso = misEvaluaciones.filter(e => e.estado === 'En proceso').length;
    const finalizadas = misEvaluaciones.filter(e => ['Finalizada', 'Consolidada', 'Cerrada'].includes(e.estado)).length;
    const avanceCiclo = misEvaluaciones.length ? Math.round(((finalizadas + enProceso * 0.5) / misEvaluaciones.length) * 100) : 0;

    const periodoBase = TH.DB.periodos().slice().reverse().find(p => p.estado === 'Cerrado');
    const consolidados = activos.map(c => TH.DB.consolidar(c.id, periodoBase ? periodoBase.id : periodoActivo.id)).filter(Boolean);
    const promedioEquipo = consolidados.length ? TH.round1(TH.promedio(consolidados.map(c => c.resultadoGeneral))) : null;

    root.innerHTML = `
      <div class="stat-grid">
        ${statTile(usuario.rolId === 'jefe' ? 'Colaboradores a cargo' : 'Colaboradores del área', activos.length)}
        ${statTile('Evaluaciones por realizar', pendientes + enProceso, null, 'amber')}
        ${statTile('Sin iniciar', pendientes, null, 'amber')}
        ${promedioEquipo !== null ? statTile('Promedio del equipo', promedioEquipo + '%', periodoBase.nombre, 'red') : ''}
      </div>

      ${(pendientes + enProceso) > 0 ? `
        <div class="hero">
          <div class="hero__ring">${ringSvg(avanceCiclo)}<div class="hero__ring-label">${avanceCiclo}%</div></div>
          <div class="hero__body">
            <p class="eyebrow">Ciclo activo · ${periodoActivo.nombre}</p>
            <h2>Tienes ${pendientes + enProceso} evaluación(es) por completar</h2>
            <p class="desc">Ingresa a "Realizar evaluación" para calificar a tu equipo por competencias y comportamiento en el ciclo actual.</p>
          </div>
        </div>
      ` : `
        <div class="panel" style="margin-bottom:24px;">
          <p style="color:var(--ink-soft);font-size:.88rem;margin:0;">No tienes evaluaciones pendientes en el período activo (${periodoActivo.nombre}).</p>
        </div>
      `}

      <p class="grid-label section-label">Accesos rápidos</p>
      <div class="modules-grid">
        ${moduleCard('evaluaciones', 'evaluaciones', 'Realizar evaluación', 'Evalúa a tu equipo en el ciclo actual.', 'red')}
        ${moduleCard('resultados', 'resultados', 'Resultados', 'Consulta los resultados de tu equipo o área.')}
        ${moduleCard('seguimiento', 'seguimiento', 'Seguimiento', 'Revisa la evolución histórica del desempeño.')}
        ${moduleCard('busqueda', 'busqueda', 'Búsqueda', 'Filtra colaboradores por distintos criterios.')}
      </div>
    `;

    wireShortcuts(root, ctx);
  }

  /* ---------------------------------------------------------------------
     CLIENTE / EVALUADOR EXTERNO
  --------------------------------------------------------------------- */

  function renderCliente(root, ctx) {
    const usuario = ctx.usuario;
    const periodoActivo = TH.DB.periodoActivo();
    const misEvaluaciones = TH.DB.evaluacionesAsignadasA(usuario.id, periodoActivo.id);
    const pendientes = misEvaluaciones.filter(e => e.estado !== 'Cerrada' && e.estado !== 'Consolidada').length;

    root.innerHTML = `
      <div class="stat-grid">
        ${statTile('Evaluaciones asignadas', misEvaluaciones.length)}
        ${statTile('Por completar', pendientes, null, 'amber')}
      </div>
      <div class="panel" style="margin-bottom:24px;">
        <p style="color:var(--ink-soft);font-size:.88rem;margin:0 0 16px;">Como evaluador externo, solo puedes consultar y completar el proceso de evaluación que te fue autorizado para el ciclo ${periodoActivo.nombre}.</p>
        <div class="modules-grid">
          ${moduleCard('evaluaciones', 'evaluaciones', 'Realizar evaluación', 'Completa las evaluaciones que te fueron asignadas.', 'red')}
          ${moduleCard('ia', 'ia', 'Recomendaciones IA', 'Consulta el análisis generado sobre tus evaluaciones.')}
        </div>
      </div>
    `;

    wireShortcuts(root, ctx);
  }

  /* ---------------------------------------------------------------------
     COLABORADOR
  --------------------------------------------------------------------- */

  function renderColaborador(root, ctx) {
    const usuario = ctx.usuario;
    const periodoActivo = TH.DB.periodoActivo();
    const avance = cicloAvance(usuario.id, periodoActivo.id);

    const historial = TH.DB.historialDe(usuario.id).filter(h => h.periodo.estado === 'Cerrado');
    const ultimo = historial[historial.length - 1];
    const anterior = historial[historial.length - 2];
    const tendencia = ultimo && anterior ? TH.round1(ultimo.consolidado.resultadoGeneral - anterior.consolidado.resultadoGeneral) : null;

    root.innerHTML = `
      <div class="hero">
        <div class="hero__ring">${ringSvg(avance)}<div class="hero__ring-label">${avance}%</div></div>
        <div class="hero__body">
          <p class="eyebrow">Ciclo activo · ${periodoActivo.nombre}</p>
          <h2>Tu evaluación de desempeño está en curso</h2>
          <p class="desc">Llevas un avance del ${avance}% en el proceso del ciclo actual (evaluadores que ya iniciaron o finalizaron tu calificación). Consulta tus resultados del último período cerrado y tus recomendaciones de IA.</p>
        </div>
      </div>

      <div class="stat-grid">
        ${ultimo ? statTile('Último resultado', ultimo.consolidado.resultadoGeneral + '%', ultimo.periodo.nombre, 'red') : statTile('Último resultado', '—')}
        ${ultimo ? statTile('Nivel alcanzado', TH.nivelPara(ultimo.consolidado.resultadoGeneral)) : ''}
        ${tendencia !== null ? statTile('Frente al período anterior', (tendencia >= 0 ? '+' : '') + tendencia + '%', tendencia >= 0 ? 'Mejorando' : 'En descenso', tendencia >= 0 ? 'green' : 'amber') : ''}
      </div>

      <p class="grid-label section-label">Módulos disponibles</p>
      <div class="modules-grid">
        ${moduleCard('resultados', 'resultados', 'Consultar resultados', 'Revisa tu puntaje por competencia y comportamiento.', 'red')}
        ${moduleCard('seguimiento', 'seguimiento', 'Consultar seguimiento', 'Consulta tu evolución entre períodos.')}
        ${moduleCard('miperfil', 'perfil', 'Mi perfil', 'Consulta tu información personal y de desempeño.')}
        ${moduleCard('ia', 'ia', 'Recomendaciones de IA', 'Sugerencias generadas a partir de tus resultados.')}
      </div>
    `;

    wireShortcuts(root, ctx);
  }

  window.Modules.dashboard = function (root, ctx) {
    if (ctx.usuario.rolId === 'admin') return renderAdmin(root, ctx);
    if (ctx.usuario.rolId === 'jefe' || ctx.usuario.rolId === 'gerente') return renderEvaluador(root, ctx);
    if (ctx.usuario.rolId === 'cliente') return renderCliente(root, ctx);
    return renderColaborador(root, ctx);
  };

})();
