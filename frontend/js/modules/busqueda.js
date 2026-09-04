/* =========================================================================
   MODULES.busqueda — Filtros y búsqueda avanzada (RF-22)
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  const TIPO_LABEL = { JEFE: 'Jefe inmediato', GERENTE: 'Gerente', CLIENTE: 'Cliente / externo' };

  window.Modules.busqueda = function (root, ctx) {
    const colaboradoresVisibles = TH.DB.colaboradoresVisiblesPara(ctx.usuario).filter(u => u.rolId === 'colaborador');
    const visibleIds = new Set(colaboradoresVisibles.map(c => c.id));
    const evaluadoresPosibles = TH.DB.usuarios().filter(u => ['jefe', 'gerente', 'cliente'].includes(u.rolId));

    function filas() {
      return TH.DB.evaluaciones()
        .filter(ev => visibleIds.has(ev.colaboradorId))
        .map(ev => {
          const colaborador = TH.DB.usuario(ev.colaboradorId);
          const evaluador = TH.DB.usuario(ev.evaluadorId);
          const periodo = TH.DB.periodo(ev.periodoId);
          const r = TH.DB.resultado(ev);
          const tieneAlgo = Object.keys(ev.calificaciones.competencias).length > 0;
          return { ev, colaborador, evaluador, periodo, resultado: tieneAlgo ? r.resultadoGeneral : null };
        });
    }

    function pintar() {
      root.innerHTML = `
        <div class="panel" style="margin-bottom:18px;">
          <div class="form-grid" id="filterForm">
            <div class="field"><label>Nombre del colaborador</label><input id="fNombre" placeholder="Ej: Laura"></div>
            <div class="field"><label>Documento</label><input id="fDoc" placeholder="Ej: 1010007"></div>
            <div class="field"><label>Cargo</label><input id="fCargo" placeholder="Ej: Analista"></div>
            <div class="field">
              <label>Área</label>
              <select id="fArea"><option value="">Todas</option>${[...new Set(colaboradoresVisibles.map(c => c.area))].map(a => `<option>${a}</option>`).join('')}</select>
            </div>
            <div class="field">
              <label>Evaluador</label>
              <select id="fEvaluador"><option value="">Todos</option>${evaluadoresPosibles.map(u => `<option value="${u.id}">${u.nombre}</option>`).join('')}</select>
            </div>
            <div class="field">
              <label>Tipo de evaluador</label>
              <select id="fTipo"><option value="">Todos</option>${Object.entries(TIPO_LABEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
            </div>
            <div class="field">
              <label>Período</label>
              <select id="fPeriodo"><option value="">Todos</option>${TH.DB.periodos().map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}</select>
            </div>
            <div class="field">
              <label>Estado de evaluación</label>
              <select id="fEstado"><option value="">Todos</option>${TH.ESTADOS_EVALUACION.map(e => `<option>${e}</option>`).join('')}</select>
            </div>
            <div class="field">
              <label>Competencia</label>
              <select id="fCompetencia"><option value="">Todas</option>${TH.DB.competencias().map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}</select>
            </div>
            <div class="field">
              <label>Comportamiento</label>
              <select id="fComportamiento"><option value="">Todos</option>${TH.DB.comportamientos().map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}</select>
            </div>
            <div class="field"><label>Resultado mínimo</label><input id="fMin" type="number" min="0" max="100" placeholder="0"></div>
            <div class="field"><label>Resultado máximo</label><input id="fMax" type="number" min="0" max="100" placeholder="100"></div>
          </div>
          <div class="modal-actions" style="justify-content:flex-start;">
            <button type="button" class="btn btn--primary" id="searchBtn">Buscar</button>
            <button type="button" class="btn btn--ghost" id="clearBtn">Limpiar filtros</button>
          </div>
        </div>

        <div class="panel" id="resultsPanel"></div>
      `;

      root.querySelector('#searchBtn').addEventListener('click', ejecutar);
      root.querySelector('#clearBtn').addEventListener('click', pintar);
      ejecutar();
    }

    function ejecutar() {
      const val = id => root.querySelector('#' + id).value.trim().toLowerCase();
      const nombre = val('fNombre'), doc = val('fDoc'), cargo = val('fCargo'), area = val('fArea');
      const evaluadorId = val('fEvaluador'), tipo = val('fTipo'), periodoId = val('fPeriodo'), estado = val('fEstado');
      const competenciaId = val('fCompetencia'), comportamientoId = val('fComportamiento');
      const min = root.querySelector('#fMin').value, max = root.querySelector('#fMax').value;

      const resultados = filas().filter(f => {
        if (nombre && !f.colaborador.nombre.toLowerCase().includes(nombre)) return false;
        if (doc && !(f.colaborador.documento || '').includes(doc)) return false;
        if (cargo && !f.colaborador.cargo.toLowerCase().includes(cargo)) return false;
        if (area && f.colaborador.area !== root.querySelector('#fArea').value) return false;
        if (evaluadorId && f.ev.evaluadorId !== evaluadorId) return false;
        if (tipo && f.ev.tipoEvaluador !== root.querySelector('#fTipo').value) return false;
        if (periodoId && f.ev.periodoId !== periodoId) return false;
        if (estado && f.ev.estado !== root.querySelector('#fEstado').value) return false;
        if (competenciaId && !(competenciaId in f.ev.calificaciones.competencias)) return false;
        if (comportamientoId && !(comportamientoId in f.ev.calificaciones.comportamientos)) return false;
        if (min && (f.resultado === null || f.resultado < Number(min))) return false;
        if (max && (f.resultado === null || f.resultado > Number(max))) return false;
        return true;
      });

      const panel = root.querySelector('#resultsPanel');
      panel.innerHTML = resultados.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state__icon">${THPanel.icon('busqueda')}</div>
          <h3>Sin resultados</h3>
          <p>No hay evaluaciones que coincidan con los filtros seleccionados.</p>
        </div>
      ` : `
        <p class="section-label">${resultados.length} resultado(s)</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Colaborador</th><th>Documento</th><th>Cargo</th><th>Área</th><th>Evaluador</th><th>Tipo</th><th>Período</th><th>Estado</th><th>Resultado</th></tr></thead>
            <tbody>
              ${resultados.map(f => `
                <tr>
                  <td>${f.colaborador.nombre}</td>
                  <td>${f.colaborador.documento || '—'}</td>
                  <td>${f.colaborador.cargo}</td>
                  <td>${f.colaborador.area}</td>
                  <td>${f.evaluador ? f.evaluador.nombre : '—'}</td>
                  <td>${TIPO_LABEL[f.ev.tipoEvaluador] || f.ev.tipoEvaluador}</td>
                  <td>${f.periodo.nombre}</td>
                  <td><span class="pill ${f.ev.estado === 'Pendiente' ? 'pill--pend' : (f.ev.estado === 'En proceso' ? 'pill--amber' : 'pill--ok')}">${f.ev.estado}</span></td>
                  <td>${f.resultado !== null ? f.resultado + '%' : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    pintar();
  };

})();
