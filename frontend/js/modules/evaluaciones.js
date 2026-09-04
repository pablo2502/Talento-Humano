/* =========================================================================
   MODULES.evaluaciones — "Realizar evaluación" (RF-11, RF-12, RF-13, RF-27)
   Disponible para Jefe/Evaluador, Gerente y Cliente/Evaluador externo:
   los tres pueden actuar como evaluadores.
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  function itemsDe(colaborador) {
    const perfil = colaborador.perfilId ? TH.DB.perfil(colaborador.perfilId) : null;
    const competencias = (perfil ? perfil.competencias : TH.DB.competencias().map(c => c.id)).map(id => TH.DB.competencia(id)).filter(Boolean);
    const comportamientos = (perfil ? perfil.comportamientos : TH.DB.comportamientos().map(c => c.id)).map(id => TH.DB.comportamiento(id)).filter(Boolean);
    return { competencias, comportamientos };
  }

  function estadoPill(estado) {
    const map = { 'Pendiente': 'pill--pend', 'En proceso': 'pill--amber', 'Finalizada': 'pill--ok', 'Consolidada': 'pill--ok', 'Cerrada': 'pill--neutral' };
    return `<span class="pill ${map[estado] || 'pill--neutral'}">${estado}</span>`;
  }

  function stepper(estado) {
    const idx = TH.ESTADOS_EVALUACION.indexOf(estado);
    return `
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:20px;">
        ${TH.ESTADOS_EVALUACION.map((e, i) => `
          <span class="pill ${i <= idx ? 'pill--ok' : 'pill--neutral'}" style="${i === idx ? 'outline:2px solid var(--red-600);outline-offset:1px;' : ''}">${i + 1}. ${e}</span>
        `).join('<span style="color:var(--line);">→</span>')}
      </div>
    `;
  }

  window.Modules.evaluaciones = function (root, ctx) {
    let periodoId = TH.DB.periodoActivo().id;

    function pintarLista() {
      const periodo = TH.DB.periodo(periodoId);
      const evaluaciones = TH.DB.evaluacionesAsignadasA(ctx.usuario.id, periodoId);

      root.innerHTML = `
        <div class="filters-bar">
          <div class="field">
            <label>Período</label>
            <select id="periodoSelect">
              ${TH.DB.periodos().map(p => `<option value="${p.id}" ${p.id === periodoId ? 'selected' : ''}>${p.nombre}${p.estado === 'Activo' ? ' · Activo' : ''}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="panel">
          ${evaluaciones.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state__icon">${THPanel.icon('evaluaciones')}</div>
              <h3>No tienes evaluaciones asignadas</h3>
              <p>No se te ha asignado ningún colaborador para evaluar en ${periodo.nombre}.</p>
            </div>
          ` : `
            <div class="table-wrap">
              <table>
                <thead><tr><th>Colaborador</th><th>Cargo</th><th>Estado</th><th>Resultado (parcial)</th><th></th></tr></thead>
                <tbody>
                  ${evaluaciones.map(ev => {
                    const colaborador = TH.DB.usuario(ev.colaboradorId);
                    const r = TH.DB.resultado(ev);
                    const tieneAlgo = Object.keys(ev.calificaciones.competencias).length || Object.keys(ev.calificaciones.comportamientos).length;
                    return `
                      <tr>
                        <td>${colaborador.nombre}</td>
                        <td>${colaborador.cargo}</td>
                        <td>${estadoPill(ev.estado)}</td>
                        <td>${tieneAlgo ? r.resultadoGeneral + '%' : '—'}</td>
                        <td><button type="button" class="btn btn--primary btn--sm" data-open="${ev.id}">${ev.estado === 'Pendiente' ? 'Evaluar' : (['Consolidada', 'Cerrada'].includes(ev.estado) ? 'Ver' : 'Continuar')}</button></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `;

      root.querySelector('#periodoSelect').addEventListener('change', e => { periodoId = e.target.value; pintarLista(); });
      root.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => pintarFormulario(b.dataset.open)));
    }

    function pintarFormulario(evaluacionId) {
      const ev = TH.DB.evaluaciones().find(e => e.id === evaluacionId);
      const colaborador = TH.DB.usuario(ev.colaboradorId);
      const periodo = TH.DB.periodo(ev.periodoId);
      const { competencias, comportamientos } = itemsDe(colaborador);
      const soloLectura = ['Consolidada', 'Cerrada'].includes(ev.estado);

      function criterioHtml(item, tipo) {
        const valor = ev.calificaciones[tipo][item.id] ?? 0;
        const indicadores = tipo === 'comportamientos' ? item.indicadores : null;
        return `
          <div class="criterion">
            <div class="criterion__top">
              <h4>${item.codigo} · ${item.nombre}</h4>
              <span class="crit-row__value" id="val-${item.id}">${valor}%</span>
            </div>
            <p class="criterion__desc">${item.descripcion}${indicadores ? ' — Indicadores: ' + indicadores.join(', ') : ''}</p>
            <div class="crit-row">
              <input type="range" min="0" max="100" value="${valor}" data-tipo="${tipo}" data-id="${item.id}" ${soloLectura ? 'disabled' : ''}>
            </div>
            <div class="crit-bar"><div class="crit-bar__fill" id="bar-${item.id}" style="width:${valor}%"></div></div>
          </div>
        `;
      }

      function totalesHtml() {
        const r = TH.DB.resultado(ev);
        return `
          <div class="summary-chips">
            <div class="summary-chip"><span>Resultado competencias</span><strong id="totComp">${r.resultadoCompetencias}%</strong></div>
            <div class="summary-chip"><span>Resultado comportamiento</span><strong id="totComport">${r.resultadoComportamiento}%</strong></div>
            <div class="summary-chip"><span>Resultado general</span><strong id="totGeneral">${r.resultadoGeneral}%</strong></div>
          </div>
        `;
      }

      root.innerHTML = `
        <div class="view__head">
          <div class="view__head-title" style="display:flex;align-items:center;gap:12px;">
            <button type="button" class="icon-btn" id="backBtn" aria-label="Volver"><svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg></button>
            <div>
              <h2 style="font-size:1.1rem;">${colaborador.nombre} <span style="color:var(--ink-soft);font-weight:400;font-size:.85rem;">· ${colaborador.cargo}</span></h2>
              <p style="margin:2px 0 0;color:var(--ink-soft);font-size:.85rem;">${periodo.nombre} · Evaluador: ${ctx.rol.nombre}</p>
            </div>
          </div>
        </div>

        <div class="panel">
          ${stepper(ev.estado)}

          <p class="section-label">Competencias (RF-05)</p>
          <div class="criteria" style="margin-bottom:22px;">
            ${competencias.map(c => criterioHtml(c, 'competencias')).join('')}
          </div>

          <p class="section-label">Comportamiento (RF-06)</p>
          <div class="criteria">
            ${comportamientos.map(c => criterioHtml(c, 'comportamientos')).join('')}
          </div>

          <div id="totalesWrap" style="margin-top:24px;padding-top:22px;border-top:1px solid var(--line);">
            ${totalesHtml()}
          </div>

          <div class="modal-actions" style="justify-content:flex-start;margin-top:22px;">
            ${!soloLectura ? `<button type="button" class="btn btn--primary" id="finalizarBtn">Finalizar evaluación</button>` : `<span class="pill pill--ok">Evaluación ${ev.estado.toLowerCase()}</span>`}
          </div>
        </div>
      `;

      root.querySelector('#backBtn').addEventListener('click', pintarLista);

      root.querySelectorAll('input[type="range"]').forEach(input => {
        input.addEventListener('input', () => {
          const tipo = input.dataset.tipo, id = input.dataset.id, valor = Number(input.value);
          document.getElementById('val-' + id).textContent = valor + '%';
          document.getElementById('bar-' + id).style.width = valor + '%';
          TH.DB.guardarCalificacion(ev.id, tipo, id, valor);

          const r = TH.DB.resultado(ev);
          document.getElementById('totComp').textContent = r.resultadoCompetencias + '%';
          document.getElementById('totComport').textContent = r.resultadoComportamiento + '%';
          document.getElementById('totGeneral').textContent = r.resultadoGeneral + '%';
        });
      });

      const finalizarBtn = root.querySelector('#finalizarBtn');
      if (finalizarBtn) finalizarBtn.addEventListener('click', () => {
        const totalItems = competencias.length + comportamientos.length;
        const calificados = Object.keys(ev.calificaciones.competencias).length + Object.keys(ev.calificaciones.comportamientos).length;
        if (calificados < totalItems) {
          UI.toast('Califica todos los criterios antes de finalizar.');
          return;
        }
        const nextEstado = ev.estado === 'Pendiente' ? 'En proceso' : ev.estado;
        if (nextEstado !== ev.estado) TH.DB.avanzarEstado(ev.id, nextEstado);
        const res = TH.DB.avanzarEstado(ev.id, 'Finalizada');
        if (!res.ok) { UI.toast(res.error); return; }
        TH.DB.notificar(colaborador.id, 'Evaluación finalizada', `${ctx.usuario.nombre} finalizó tu evaluación del período ${periodo.nombre}.`);
        UI.toast('Evaluación finalizada correctamente.');
        pintarLista();
        THPanel.refreshBadges();
      });
    }

    pintarLista();
  };

})();
