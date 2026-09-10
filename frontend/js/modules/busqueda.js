/* =========================================================================
   MODULES.busqueda — Filtros y búsqueda avanzada (RF-22)
========================================================================= */

(function () {
  'use strict';
  window.Modules = window.Modules || {};

  window.Modules.busqueda = function (root, ctx) {
    const colaboradoresVisibles = TH.DB.colaboradoresVisiblesPara(ctx.usuario).filter(u => u.rolId === 'colaborador');
    const visibleIds = new Set(colaboradoresVisibles.map(c => c.id));
    const evaluadoresPosibles = TH.DB.usuarios().filter(u => u.rolId === 'colaborador');

    function filas() {
      return TH.DB.evaluaciones()
        .filter(ev => visibleIds.has(ev.colaboradorId))
        .map(ev => {
          const colaborador = TH.DB.usuario(ev.colaboradorId);
          const evaluador = TH.DB.usuario(ev.evaluadorId);
          const periodo = TH.DB.periodo(ev.periodoId);
          const r = TH.DB.resultado(ev);
          return { ev, colaborador, evaluador, periodo, resultado: r ? r.score : null };
        });
    }

    function pintar() {
      root.innerHTML = `
        <div class="panel" style="margin-bottom:18px;">
          <div class="form-grid" id="filterForm">
            <div class="field"><label>Nombre del colaborador</label><input id="fNombre" placeholder="Ej: Fernando"></div>
            <div class="field"><label>Documento</label><input id="fDoc" placeholder="Ej: 1010002"></div>
            <div class="field"><label>Cargo</label><input id="fCargo" placeholder="Ej: Coordinador"></div>
            <div class="field">
              <label>Área</label>
              <select id="fArea"><option value="">Todas</option>${[...new Set(colaboradoresVisibles.map(c => c.area))].map(a => `<option>${a}</option>`).join('')}</select>
            </div>
            <div class="field">
              <label>Nivel de cargo</label>
              <select id="fNivel"><option value="">Todos</option>${Object.entries(TH.TIPO_CARGO_LABEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
            </div>
            <div class="field">
              <label>Evaluador</label>
              <select id="fEvaluador"><option value="">Todos</option>${evaluadoresPosibles.map(u => `<option value="${u.id}">${u.nombre}</option>`).join('')}</select>
            </div>
            <div class="field">
              <label>Tipo de evaluador</label>
              <select id="fTipo"><option value="">Todos</option>${Object.entries(TH.TIPOS_EVALUADOR).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
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
              <select id="fCompetencia"><option value="">Todas</option>${TH.DB.competenciasTodas().map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}</select>
            </div>
            <div class="field"><label>Resultado mínimo (1-5)</label><input id="fMin" type="number" min="1" max="5" step="0.1" placeholder="1"></div>
            <div class="field"><label>Resultado máximo (1-5)</label><input id="fMax" type="number" min="1" max="5" step="0.1" placeholder="5"></div>
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
      const nombre = val('fNombre'), doc = val('fDoc'), cargo = val('fCargo');
      const area = root.querySelector('#fArea').value, nivel = root.querySelector('#fNivel').value;
      const evaluadorId = root.querySelector('#fEvaluador').value, tipo = root.querySelector('#fTipo').value;
      const periodoId = root.querySelector('#fPeriodo').value, estado = root.querySelector('#fEstado').value;
      const competenciaId = root.querySelector('#fCompetencia').value;
      const min = root.querySelector('#fMin').value, max = root.querySelector('#fMax').value;

      const resultados = filas().filter(f => {
        if (nombre && !f.colaborador.nombre.toLowerCase().includes(nombre)) return false;
        if (doc && !(f.colaborador.documento || '').includes(doc)) return false;
        if (cargo && !f.colaborador.cargo.toLowerCase().includes(cargo)) return false;
        if (area && f.colaborador.area !== area) return false;
        if (nivel && f.colaborador.tipoCargo !== nivel) return false;
        if (evaluadorId && f.ev.evaluadorId !== evaluadorId) return false;
        if (tipo && f.ev.tipoEvaluador !== tipo) return false;
        if (periodoId && f.ev.periodoId !== periodoId) return false;
        if (estado && f.ev.estado !== estado) return false;
        if (competenciaId) {
          const ids = Object.keys(f.ev.calificaciones.indicadores || {});
          const pertenece = ids.some(id => { const info = TH.DB.indicadorInfo(id); return info && info.competenciaId === competenciaId; });
          if (!pertenece) return false;
        }
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
                  <td>${TH.TIPOS_EVALUADOR[f.ev.tipoEvaluador] || f.ev.tipoEvaluador}</td>
                  <td>${f.periodo.nombre}</td>
                  <td><span class="pill ${f.ev.estado === 'Pendiente' ? 'pill--pend' : (f.ev.estado === 'En proceso' ? 'pill--amber' : 'pill--ok')}">${f.ev.estado}</span></td>
                  <td>${f.resultado !== null ? f.resultado + '/5' : '—'}</td>
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
