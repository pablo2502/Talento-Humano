/* =========================================================================
   MODULES.evaluadores — Selección de colaboradores y asignación de
   evaluadores (RF-09, RF-10, RF-28).
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  const TIPOS = [
    { tipo: 'JEFE', label: 'Jefe inmediato', rolId: 'jefe' },
    { tipo: 'GERENTE', label: 'Gerente', rolId: 'gerente' },
    { tipo: 'CLIENTE', label: 'Cliente / Evaluador externo', rolId: 'cliente' }
  ];

  window.Modules.evaluadores = function (root, ctx) {
    let periodoId = TH.DB.periodoActivo().id;

    function pintar() {
      const periodo = TH.DB.periodo(periodoId);
      const colaboradores = TH.DB.usuarios().filter(u => u.rolId === 'colaborador' && u.estado === 'Activo');

      root.innerHTML = `
        <div class="filters-bar">
          <div class="field">
            <label>Período</label>
            <select id="periodoSelect">
              ${TH.DB.periodos().map(p => `<option value="${p.id}" ${p.id === periodoId ? 'selected' : ''}>${p.nombre}${p.estado === 'Activo' ? ' · Activo' : ''}</option>`).join('')}
            </select>
          </div>
          <div class="field field--grow"></div>
          <button type="button" class="btn btn--dark" id="autoAllBtn">Sugerir evaluadores para todos (RF-28)</button>
        </div>

        <div class="panel">
          <p class="section-label">Colaboradores seleccionados para ${periodo.nombre} (RF-09)</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Colaborador</th><th>Área</th><th>Jefe inmediato</th><th>Gerente</th><th>Cliente / externo</th><th></th></tr></thead>
              <tbody>
                ${colaboradores.map(c => {
                  const evs = TH.DB.evaluacionesDe(c.id, periodoId);
                  const cell = tipo => {
                    const ev = evs.find(e => e.tipoEvaluador === tipo);
                    if (!ev) return `<span class="pill pill--neutral">Sin asignar</span>`;
                    const ev2 = TH.DB.usuario(ev.evaluadorId);
                    return `${ev2 ? ev2.nombre : '—'}<span class="cell-sub">${ev.estado}</span>`;
                  };
                  return `
                    <tr>
                      <td>${c.nombre}<span class="cell-sub">${c.cargo}</span></td>
                      <td>${c.area}</td>
                      <td>${cell('JEFE')}</td>
                      <td>${cell('GERENTE')}</td>
                      <td>${cell('CLIENTE')}</td>
                      <td class="actions-cell">
                        <button type="button" class="btn btn--ghost btn--sm" data-auto="${c.id}">Sugerir</button>
                        <button type="button" class="btn btn--ghost btn--sm" data-edit="${c.id}">Editar</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      root.querySelector('#periodoSelect').addEventListener('change', e => { periodoId = e.target.value; pintar(); });

      root.querySelector('#autoAllBtn').addEventListener('click', () => {
        let creadas = 0;
        colaboradores.forEach(c => { creadas += sugerirPara(c.id); });
        UI.toast(creadas > 0 ? `Se asignaron ${creadas} evaluador(es) automáticamente.` : 'No hay nuevas asignaciones sugeridas: todos los colaboradores ya tienen evaluadores.');
        pintar();
      });

      root.querySelectorAll('[data-auto]').forEach(b => b.addEventListener('click', () => {
        const n = sugerirPara(b.dataset.auto);
        UI.toast(n > 0 ? `Se asignaron ${n} evaluador(es) automáticamente.` : 'Este colaborador ya tiene evaluadores asignados.');
        pintar();
      }));

      root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => abrirFormulario(TH.DB.usuario(b.dataset.edit))));
    }

    function sugerirPara(colaboradorId) {
      const existentes = TH.DB.evaluacionesDe(colaboradorId, periodoId);
      const sugeridos = TH.DB.sugerirEvaluadores(colaboradorId);
      let creadas = 0;
      sugeridos.forEach(s => {
        if (existentes.some(e => e.tipoEvaluador === s.tipoEvaluador)) return;
        TH.DB.crearEvaluacion({ periodoId, colaboradorId, evaluadorId: s.evaluadorId, tipoEvaluador: s.tipoEvaluador });
        TH.DB.notificar(s.evaluadorId, 'Nueva evaluación asignada', `Se te asignó como evaluador de ${TH.DB.usuario(colaboradorId).nombre} para el período ${TH.DB.periodo(periodoId).nombre}.`);
        creadas++;
      });
      return creadas;
    }

    function abrirFormulario(colaborador) {
      const existentes = TH.DB.evaluacionesDe(colaborador.id, periodoId);

      UI.openModal(`
        <h2>Evaluadores de ${colaborador.nombre}</h2>
        <p>Asignación manual por tipo de evaluador (RF-10). Puedes partir de la sugerencia automática (RF-28) y ajustarla.</p>
        <div class="form-grid">
          ${TIPOS.map(t => {
            const candidatos = TH.DB.usuarios().filter(u => u.rolId === t.rolId && u.estado === 'Activo');
            const actual = existentes.find(e => e.tipoEvaluador === t.tipo);
            return `
              <div class="field field--full">
                <label>${t.label}</label>
                <select data-tipo="${t.tipo}">
                  <option value="">— Sin asignar —</option>
                  ${candidatos.map(u => `<option value="${u.id}" ${actual && actual.evaluadorId === u.id ? 'selected' : ''}>${u.nombre}</option>`).join('')}
                </select>
              </div>
            `;
          }).join('')}
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn--ghost" data-modal-close>Cancelar</button>
          <button type="button" class="btn btn--primary" id="saveBtn">Guardar asignación</button>
        </div>
      `, { onOpen: box => {
        box.querySelector('#saveBtn').addEventListener('click', () => {
          TIPOS.forEach(t => {
            const evaluadorId = box.querySelector(`[data-tipo="${t.tipo}"]`).value;
            const actual = existentes.find(e => e.tipoEvaluador === t.tipo);
            if (!evaluadorId) return;
            if (actual) {
              if (actual.evaluadorId !== evaluadorId) {
                TH.DB.actualizar('evaluaciones', actual.id, { evaluadorId });
                TH.DB.notificar(evaluadorId, 'Nueva evaluación asignada', `Se te asignó como evaluador de ${colaborador.nombre} para el período ${TH.DB.periodo(periodoId).nombre}.`);
              }
            } else {
              TH.DB.crearEvaluacion({ periodoId, colaboradorId: colaborador.id, evaluadorId, tipoEvaluador: t.tipo });
              TH.DB.notificar(evaluadorId, 'Nueva evaluación asignada', `Se te asignó como evaluador de ${colaborador.nombre} para el período ${TH.DB.periodo(periodoId).nombre}.`);
            }
          });
          UI.toast('Asignación de evaluadores guardada.');
          UI.closeModal();
          pintar();
        });
      } });
    }

    pintar();
  };

})();
