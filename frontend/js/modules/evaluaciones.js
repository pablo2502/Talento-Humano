/* =========================================================================
   MODULES.evaluaciones — "Realizar evaluación" (RF-11, RF-12, RF-13, RF-27)
   Autoevaluación y evaluación 360° (Jefe, Par, Subalterno) + SST,
   generadas automáticamente según la estructura organizacional.
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

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

  function escalaBotones(indicadorId, valorActual, soloLectura) {
    const opciones = TH.ESCALA.map(e => ({ valor: e.valor, label: e.valor, title: e.descriptor }))
      .concat([{ valor: 'NO', label: 'N/O', title: TH.NO_OBSERVADO.descriptor }]);
    return `
      <div class="chip-picker" data-indicador="${indicadorId}" role="radiogroup">
        ${opciones.map(o => `
          <button type="button" class="chip" data-valor="${o.valor}" aria-pressed="${String(valorActual) === String(o.valor)}" title="${o.title}" ${soloLectura ? 'disabled' : ''}>
            ${o.label}
          </button>
        `).join('')}
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
              <p>No tienes evaluaciones 360° asignadas para ${periodo.nombre}.</p>
            </div>
          ` : `
            <div class="table-wrap">
              <table>
                <thead><tr><th>Persona evaluada</th><th>Tipo</th><th>Estado</th><th>Resultado (parcial)</th><th></th></tr></thead>
                <tbody>
                  ${evaluaciones.map(ev => {
                    const colaborador = TH.DB.usuario(ev.colaboradorId);
                    const r = TH.DB.resultado(ev);
                    const esPropia = ev.tipoEvaluador === 'AUTO';
                    return `
                      <tr>
                        <td>${esPropia ? 'Tú mismo' : colaborador.nombre}<span class="cell-sub">${colaborador.cargo}</span></td>
                        <td>${TH.TIPOS_EVALUADOR[ev.tipoEvaluador]}</td>
                        <td>${estadoPill(ev.estado)}</td>
                        <td>${r ? r.score + '/5' : '—'}</td>
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
      const soloLectura = ['Consolidada', 'Cerrada'].includes(ev.estado);
      const esSST = ev.tipoEvaluador === 'SST';

      const grupos = esSST
        ? [{ nombre: 'SST — Control de Riesgos y Peligros Laborales', indicadores: TH.DB.sstCompetencia().indicadores.map(i => ({ id: i.id, nombre: i.nombre, texto: TH.DB.textoComportamientoSST(i.id, colaborador.tipoCargo) })) }]
        : TH.DB.competenciasAplicables(colaborador.tipoCargo).map(c => ({
            nombre: c.nombre,
            indicadores: c.indicadores.map(i => ({ id: i.id, nombre: i.nombre, texto: TH.DB.textoComportamiento(i.id, ev.tipoEvaluador) }))
          }));

      function criterioHtml(item) {
        const valor = ev.calificaciones.indicadores[item.id];
        return `
          <div class="criterion">
            <div class="criterion__top"><h4>${item.nombre}</h4></div>
            <p class="criterion__desc">${item.texto}</p>
            ${escalaBotones(item.id, valor, soloLectura)}
          </div>
        `;
      }

      function totalesHtml() {
        const r = TH.DB.resultado(ev);
        return `
          <div class="summary-chips">
            <div class="summary-chip"><span>Resultado</span><strong id="totScore">${r ? r.score + '/5' : '—'}</strong></div>
            <div class="summary-chip"><span>Descriptor</span><strong id="totDescriptor">${r ? r.descriptor : '—'}</strong></div>
            <div class="summary-chip"><span>Indicadores calificados</span><strong id="totCal">${r ? r.calificados : 0} / ${r ? r.totalIndicadores : gruposTotalIndicadores()}</strong></div>
          </div>
        `;
      }

      function gruposTotalIndicadores() {
        return grupos.reduce((s, g) => s + g.indicadores.length, 0);
      }

      root.innerHTML = `
        <div class="view__head">
          <div class="view__head-title" style="display:flex;align-items:center;gap:12px;">
            <button type="button" class="icon-btn" id="backBtn" aria-label="Volver"><svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg></button>
            <div>
              <h2 style="font-size:1.1rem;">${ev.tipoEvaluador === 'AUTO' ? 'Autoevaluación' : colaborador.nombre} <span style="color:var(--ink-soft);font-weight:400;font-size:.85rem;">· ${colaborador.cargo}</span></h2>
              <p style="margin:2px 0 0;color:var(--ink-soft);font-size:.85rem;">${periodo.nombre} · Evaluador: ${TH.TIPOS_EVALUADOR[ev.tipoEvaluador]}</p>
            </div>
          </div>
        </div>

        <div class="panel">
          ${stepper(ev.estado)}

          ${grupos.map(g => `
            <p class="section-label">${g.nombre}</p>
            <div class="criteria" style="margin-bottom:22px;">
              ${g.indicadores.map(criterioHtml).join('')}
            </div>
          `).join('')}

          <div id="totalesWrap" style="margin-top:4px;padding-top:22px;border-top:1px solid var(--line);">
            ${totalesHtml()}
          </div>

          <div class="modal-actions" style="justify-content:flex-start;margin-top:22px;">
            ${!soloLectura ? `<button type="button" class="btn btn--primary" id="finalizarBtn">Finalizar evaluación</button>` : `<span class="pill pill--ok">Evaluación ${ev.estado.toLowerCase()}</span>`}
          </div>
        </div>
      `;

      root.querySelector('#backBtn').addEventListener('click', pintarLista);

      root.querySelectorAll('[data-indicador]').forEach(grupo => {
        if (soloLectura) return;
        grupo.addEventListener('click', event => {
          const btn = event.target.closest('[data-valor]');
          if (!btn) return;
          const indicadorId = grupo.dataset.indicador;
          const valor = btn.dataset.valor === 'NO' ? 'NO' : Number(btn.dataset.valor);

          TH.DB.guardarCalificacion(ev.id, indicadorId, valor);

          grupo.querySelectorAll('[data-valor]').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));

          const r = TH.DB.resultado(ev);
          if (r) {
            document.getElementById('totScore').textContent = r.score + '/5';
            document.getElementById('totDescriptor').textContent = r.descriptor;
            document.getElementById('totCal').textContent = r.calificados + ' / ' + r.totalIndicadores;
          }
        });
      });

      const finalizarBtn = root.querySelector('#finalizarBtn');
      if (finalizarBtn) finalizarBtn.addEventListener('click', () => {
        const totalItems = gruposTotalIndicadores();
        const calificados = Object.keys(ev.calificaciones.indicadores).length;
        if (calificados < totalItems) {
          UI.toast('Califica todos los criterios antes de finalizar (puedes usar "No observado" si no tuviste oportunidad de observarlo).');
          return;
        }
        const nextEstado = ev.estado === 'Pendiente' ? 'En proceso' : ev.estado;
        if (nextEstado !== ev.estado) TH.DB.avanzarEstado(ev.id, nextEstado);
        const res = TH.DB.avanzarEstado(ev.id, 'Finalizada');
        if (!res.ok) { UI.toast(res.error); return; }
        if (ev.tipoEvaluador !== 'AUTO') {
          TH.DB.notificar(colaborador.id, 'Evaluación finalizada', `${ctx.usuario.nombre} finalizó tu evaluación (${TH.TIPOS_EVALUADOR[ev.tipoEvaluador]}) del período ${periodo.nombre}.`);
        }
        UI.toast('Evaluación finalizada correctamente.');
        pintarLista();
        THPanel.refreshBadges();
      });
    }

    pintarLista();
  };

})();
