/* =========================================================================
   DATA.JS
   Base de datos simulada del Sistema Integral de Evaluación por
   Competencias y Desempeño — modelo 360° real (Autoevaluación, Jefe, Par,
   Subalterno + SST transversal), construido a partir de
   AJUSTE_DE_COMPETENCIAS_2025_360...xlsx (ver frontend/js/data/competencias.js,
   generado de ese archivo).

   No hay backend real conectado: todo vive en memoria y se persiste en
   localStorage para que los cambios sobrevivan a un refresco de página.
   El roster de personas es FICTICIO (mismos cargos y proporción real de
   niveles de cargo, nombres inventados) — ver README para el porqué.
========================================================================= */

(function (global) {
  'use strict';

  const STORAGE_KEY = 'th_db_v2';
  const COMPETENCIAS_360 = global.COMPETENCIAS_360 || [];

  /* =======================================================================
     UTILIDADES
  ======================================================================= */

  function uid(prefix) {
    return prefix + '-' + Math.random().toString(36).slice(2, 9);
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  function promedio(arr) {
    if (!arr.length) return 0;
    return arr.reduce((s, n) => s + n, 0) / arr.length;
  }

  function pctLabel(x) {
    return Math.round(x * 100) + '%';
  }

  /* =======================================================================
     ESCALA DE CALIFICACIÓN (real, tomada de la hoja CATALOGOS)
  ======================================================================= */

  const ESCALA = [
    { valor: 1, descriptor: 'No cumple', detalle: 'La conducta no se evidencia o se presenta de manera insuficiente.' },
    { valor: 2, descriptor: 'Cumple parcialmente', detalle: 'La conducta se evidencia de forma irregular o requiere mejora.' },
    { valor: 3, descriptor: 'Cumple', detalle: 'La conducta se evidencia de acuerdo con lo esperado.' },
    { valor: 4, descriptor: 'Supera', detalle: 'La conducta se evidencia de manera consistente y por encima de lo esperado.' },
    { valor: 5, descriptor: 'Sobresale', detalle: 'La conducta se evidencia de manera ejemplar y genera un impacto positivo.' }
  ];

  const NO_OBSERVADO = { valor: 'NO', descriptor: 'No observado', detalle: 'El evaluador no tuvo oportunidad suficiente para observar la conducta.' };

  function descriptorPara(score) {
    if (score === null || score === undefined) return '—';
    if (score >= 4.5) return 'Sobresale';
    if (score >= 3.5) return 'Supera';
    if (score >= 2.5) return 'Cumple';
    if (score >= 1.5) return 'Cumple parcialmente';
    return 'No cumple';
  }

  /* =======================================================================
     TIPOS DE EVALUADOR (360°) Y PESOS POR TIPO DE CARGO
     (RF-03 real: Autoevaluación / Jefe / Par / Subalterno + SST transversal)
  ======================================================================= */

  const TIPOS_EVALUADOR = { AUTO: 'Autoevaluación', JEFE: 'Jefe', PAR: 'Par', SUBALTERNO: 'Subalterno', SST: 'SST' };

  const TIPO_CARGO_LABEL = { estrategico: 'Estratégico', tactico: 'Táctico', apoyo: 'Apoyo' };

  // 50% del 90% = .45 Jefe · 20% del 90% = .18 Par · 20% del 90% = .18 Auto
  // 10% del 90% = .09 Subalterno · SST 10% como ítem transversal independiente.
  // Apoyo no tiene personal a cargo: su peso de Subalterno se redistribuye en Jefe (60% del 90%).
  const PESOS = {
    estrategico: { jefe: 0.45, par: 0.18, auto: 0.18, subalterno: 0.09, sst: 0.10 },
    tactico: { jefe: 0.45, par: 0.18, auto: 0.18, subalterno: 0.09, sst: 0.10 },
    apoyo: { jefe: 0.54, par: 0.18, auto: 0.18, subalterno: 0, sst: 0.10 }
  };

  function reglaConsolidacionTexto(tipoCargo) {
    const p = PESOS[tipoCargo];
    const partes = ['Jefe ' + pctLabel(p.jefe), 'Par ' + pctLabel(p.par), 'Autoevaluación ' + pctLabel(p.auto)];
    if (p.subalterno) partes.push('Subalterno ' + pctLabel(p.subalterno));
    partes.push('SST ' + pctLabel(p.sst) + ' (ítem transversal)');
    return 'Promedio ponderado 360° · ' + TIPO_CARGO_LABEL[tipoCargo] + ': ' + partes.join(' · ');
  }

  /* =======================================================================
     ÍNDICE DE INDICADORES (a partir del diccionario real de competencias)
  ======================================================================= */

  const SST_COMPETENCIA = COMPETENCIAS_360.find(c => c.tipo === 'sst') || { indicadores: [] };

  const INDICADOR_INDEX = {};
  COMPETENCIAS_360.forEach(comp => {
    comp.indicadores.forEach(ind => {
      INDICADOR_INDEX[ind.id] = {
        competenciaId: comp.id, competenciaNombre: comp.nombre, competenciaTipo: comp.tipo,
        indicadorNombre: ind.nombre, comportamientos: ind.comportamientos, aplica: ind.aplica || null
      };
    });
  });

  function competenciasAplicables(tipoCargo) {
    return COMPETENCIAS_360.filter(c => c.tipo === 'institucional' || c.tipo === tipoCargo);
  }

  function indicadoresAplicables(tipoCargo) {
    const out = [];
    competenciasAplicables(tipoCargo).forEach(c => {
      c.indicadores.forEach(i => out.push(Object.assign({ competenciaId: c.id, competenciaNombre: c.nombre, competenciaTipo: c.tipo }, i)));
    });
    return out;
  }

  function textoComportamiento(indicadorId, tipoEvaluador) {
    const info = INDICADOR_INDEX[indicadorId];
    if (!info) return '';
    return info.comportamientos[String(tipoEvaluador).toLowerCase()] || '';
  }

  function textoComportamientoSST(indicadorId, tipoCargo) {
    const ind = SST_COMPETENCIA.indicadores.find(i => i.id === indicadorId);
    if (!ind) return '';
    return tipoCargo === 'apoyo' ? ind.comportamientos.apoyo : ind.comportamientos.estrategico_tactico;
  }

  /* =======================================================================
     ROLES DEL SISTEMA (acceso) — el "tipo de evaluador" 360° es aparte,
     se deriva de la estructura organizacional, no es un rol de acceso.
  ======================================================================= */

  const ROLES = [
    {
      id: 'admin', nombre: 'Administrador',
      permisos: [
        'Gestionar usuarios', 'Gestionar perfiles de cargo', 'Consultar el catálogo de competencias',
        'Configurar períodos', 'Generar evaluaciones 360° por período', 'Consultar todos los resultados', 'Generar informes'
      ]
    },
    {
      id: 'colaborador', nombre: 'Colaborador',
      permisos: [
        'Autoevaluarse', 'Evaluar a su jefe, pares y subalternos cuando aplique', 'Consultar su perfil',
        'Consultar resultados propios (y de su equipo, si tiene personas a cargo)', 'Consultar historial de evaluaciones',
        'Consultar recomendaciones y planes de mejora'
      ]
    }
  ];

  /* =======================================================================
     PERFILES DE CARGO (RF-04) — plantillas de cargo real de la institución.
     Las competencias aplicables se DERIVAN del tipoCargo (institucionales +
     específicas del nivel), no se eligen manualmente.
  ======================================================================= */

  const PERFILES = [
    { id: 'perfil-01', nombre: 'Rector', area: 'Rectoría', tipoCargo: 'estrategico', descripcion: 'Máxima autoridad ejecutiva de la institución.', estado: 'Activo' },
    { id: 'perfil-02', nombre: 'Director Administrativo y Financiero', area: 'Administrativa y Financiera', tipoCargo: 'estrategico', descripcion: 'Lidera la gestión administrativa y financiera institucional.', estado: 'Activo' },
    { id: 'perfil-03', nombre: 'Directora de Talento Humano', area: 'Talento Humano', tipoCargo: 'estrategico', descripcion: 'Lidera la gestión del talento humano institucional.', estado: 'Activo' },
    { id: 'perfil-04', nombre: 'Jefe de Tecnología', area: 'Tecnología', tipoCargo: 'estrategico', descripcion: 'Lidera la estrategia y operación tecnológica institucional.', estado: 'Activo' },
    { id: 'perfil-05', nombre: 'Coordinador Financiero', area: 'Administrativa y Financiera', tipoCargo: 'tactico', descripcion: 'Coordina la operación financiera del área.', estado: 'Activo' },
    { id: 'perfil-06', nombre: 'Coordinador de Presupuesto y Control', area: 'Administrativa y Financiera', tipoCargo: 'tactico', descripcion: 'Coordina el presupuesto y control institucional.', estado: 'Activo' },
    { id: 'perfil-07', nombre: 'Gestor de Nómina y Contratación', area: 'Talento Humano', tipoCargo: 'tactico', descripcion: 'Gestiona los procesos de nómina y contratación.', estado: 'Activo' },
    { id: 'perfil-08', nombre: 'Coordinador de Comunicaciones', area: 'Tecnología', tipoCargo: 'tactico', descripcion: 'Coordina las comunicaciones institucionales y digitales.', estado: 'Activo' },
    { id: 'perfil-09', nombre: 'Docente Tiempo Completo Asociado', area: 'Académica', tipoCargo: 'tactico', descripcion: 'Docente de planta con dedicación de tiempo completo.', estado: 'Activo' },
    { id: 'perfil-10', nombre: 'Asistente Administrativo', area: 'Administrativa y Financiera', tipoCargo: 'apoyo', descripcion: 'Brinda soporte administrativo al área.', estado: 'Activo' },
    { id: 'perfil-11', nombre: 'Auxiliar de Biblioteca', area: 'Administrativa y Financiera', tipoCargo: 'apoyo', descripcion: 'Apoya la operación de biblioteca y recursos bibliográficos.', estado: 'Activo' },
    { id: 'perfil-12', nombre: 'Profesional de Selección, Formación y Desarrollo', area: 'Talento Humano', tipoCargo: 'apoyo', descripcion: 'Apoya los procesos de selección, formación y desarrollo.', estado: 'Activo' },
    { id: 'perfil-13', nombre: 'Técnico en Sistemas de Información', area: 'Tecnología', tipoCargo: 'apoyo', descripcion: 'Brinda soporte técnico a los sistemas de información.', estado: 'Activo' },
    { id: 'perfil-14', nombre: 'Asistente de Coformación', area: 'Tecnología', tipoCargo: 'apoyo', descripcion: 'Apoya los procesos de coformación empresarial.', estado: 'Activo' },
    { id: 'perfil-15', nombre: 'Aprendiz Etapa Productiva', area: 'Talento Humano', tipoCargo: 'apoyo', descripcion: 'Aprendiz en etapa productiva del área.', estado: 'Activo' }
  ];

  /* =======================================================================
     USUARIOS — roster ficticio (nombres inventados) con los mismos cargos,
     áreas y proporción real de niveles de cargo de la planta activa
     (152 activos: 15 Estratégico · 89 Táctico · 48 Apoyo). No se cargan
     datos personales reales.
  ======================================================================= */

  const USUARIOS = [
    { id: 'u-admin', nombre: 'Ana Torres', correo: 'ana.torres@empresa.com', password: 'admin123', documento: '1010001', rolId: 'admin', cargo: 'Administradora del sistema', area: 'Dirección', perfilId: null, tipoCargo: null, jefeId: null, estado: 'Activo', fechaIngreso: '2022-03-01' },

    { id: 'u-01', nombre: 'Fernando Restrepo', correo: 'fernando.restrepo@empresa.com', password: '123456', documento: '1010002', rolId: 'colaborador', cargo: 'Rector', area: 'Rectoría', perfilId: 'perfil-01', tipoCargo: 'estrategico', jefeId: null, estado: 'Activo', fechaIngreso: '2016-02-01' },
    { id: 'u-02', nombre: 'Patricia Nova', correo: 'patricia.nova@empresa.com', password: '123456', documento: '1010003', rolId: 'colaborador', cargo: 'Director Administrativo y Financiero', area: 'Administrativa y Financiera', perfilId: 'perfil-02', tipoCargo: 'estrategico', jefeId: 'u-01', estado: 'Activo', fechaIngreso: '2019-06-10' },
    { id: 'u-03', nombre: 'Marcela Duarte', correo: 'marcela.duarte@empresa.com', password: '123456', documento: '1010004', rolId: 'colaborador', cargo: 'Directora de Talento Humano', area: 'Talento Humano', perfilId: 'perfil-03', tipoCargo: 'estrategico', jefeId: 'u-01', estado: 'Activo', fechaIngreso: '2020-01-20' },
    { id: 'u-04', nombre: 'Camilo Serrano', correo: 'camilo.serrano@empresa.com', password: '123456', documento: '1010005', rolId: 'colaborador', cargo: 'Jefe de Tecnología', area: 'Tecnología', perfilId: 'perfil-04', tipoCargo: 'estrategico', jefeId: 'u-01', estado: 'Activo', fechaIngreso: '2021-03-15' },

    { id: 'u-05', nombre: 'Diego Palacios', correo: 'diego.palacios@empresa.com', password: '123456', documento: '1010006', rolId: 'colaborador', cargo: 'Coordinador Financiero', area: 'Administrativa y Financiera', perfilId: 'perfil-05', tipoCargo: 'tactico', jefeId: 'u-02', estado: 'Activo', fechaIngreso: '2021-08-02' },
    { id: 'u-06', nombre: 'Liliana Ospina', correo: 'liliana.ospina@empresa.com', password: '123456', documento: '1010007', rolId: 'colaborador', cargo: 'Coordinador de Presupuesto y Control', area: 'Administrativa y Financiera', perfilId: 'perfil-06', tipoCargo: 'tactico', jefeId: 'u-02', estado: 'Activo', fechaIngreso: '2022-02-14' },
    { id: 'u-07', nombre: 'Andrés Miranda', correo: 'andres.miranda@empresa.com', password: '123456', documento: '1010008', rolId: 'colaborador', cargo: 'Gestor de Nómina y Contratación', area: 'Talento Humano', perfilId: 'perfil-07', tipoCargo: 'tactico', jefeId: 'u-03', estado: 'Activo', fechaIngreso: '2022-05-23' },
    { id: 'u-08', nombre: 'Sandra Beltrán', correo: 'sandra.beltran@empresa.com', password: '123456', documento: '1010009', rolId: 'colaborador', cargo: 'Coordinador de Comunicaciones', area: 'Tecnología', perfilId: 'perfil-08', tipoCargo: 'tactico', jefeId: 'u-04', estado: 'Activo', fechaIngreso: '2022-09-01' },

    { id: 'u-09', nombre: 'Julián Cárdenas', correo: 'julian.cardenas@empresa.com', password: '123456', documento: '1010010', rolId: 'colaborador', cargo: 'Asistente Administrativo', area: 'Administrativa y Financiera', perfilId: 'perfil-10', tipoCargo: 'apoyo', jefeId: 'u-05', estado: 'Activo', fechaIngreso: '2023-01-16' },
    { id: 'u-10', nombre: 'Natalia Peña', correo: 'natalia.pena@empresa.com', password: '123456', documento: '1010011', rolId: 'colaborador', cargo: 'Auxiliar de Biblioteca', area: 'Administrativa y Financiera', perfilId: 'perfil-11', tipoCargo: 'apoyo', jefeId: 'u-06', estado: 'Activo', fechaIngreso: '2023-03-06' },
    { id: 'u-11', nombre: 'Ricardo Vega', correo: 'ricardo.vega@empresa.com', password: '123456', documento: '1010012', rolId: 'colaborador', cargo: 'Profesional de Selección, Formación y Desarrollo', area: 'Talento Humano', perfilId: 'perfil-12', tipoCargo: 'apoyo', jefeId: 'u-07', estado: 'Activo', fechaIngreso: '2023-04-18' },
    { id: 'u-12', nombre: 'Daniela Rojas', correo: 'daniela.rojas@empresa.com', password: '123456', documento: '1010013', rolId: 'colaborador', cargo: 'Técnico en Sistemas de Información', area: 'Tecnología', perfilId: 'perfil-13', tipoCargo: 'apoyo', jefeId: 'u-08', estado: 'Activo', fechaIngreso: '2023-07-11' },
    { id: 'u-13', nombre: 'Esteban Molina', correo: 'esteban.molina@empresa.com', password: '123456', documento: '1010014', rolId: 'colaborador', cargo: 'Asistente de Coformación', area: 'Tecnología', perfilId: 'perfil-14', tipoCargo: 'apoyo', jefeId: 'u-08', estado: 'Activo', fechaIngreso: '2024-02-05' },

    { id: 'u-14', nombre: 'Jorge Salamanca', correo: 'jorge.salamanca@empresa.com', password: '123456', documento: '1010015', rolId: 'colaborador', cargo: 'Asistente Administrativo', area: 'Administrativa y Financiera', perfilId: 'perfil-10', tipoCargo: 'apoyo', jefeId: 'u-05', estado: 'Inactivo', fechaIngreso: '2021-11-09' }
  ];

  // Accesos rápidos de demostración en login.html (spread de escenarios: admin,
  // vértice sin jefe, mando medio con pares y subalternos, mando medio con un
  // solo par, base sin subalternos).
  const DEMO_USER_IDS = ['u-admin', 'u-01', 'u-04', 'u-08', 'u-12'];

  /* =======================================================================
     PERÍODOS (RF-08)
  ======================================================================= */

  const PERIODOS = [
    { id: 'per-2025-1', nombre: '2025 - Primer semestre', fechaInicio: '2025-01-01', fechaFin: '2025-06-30', estado: 'Cerrado' },
    { id: 'per-2025-2', nombre: '2025 - Segundo semestre', fechaInicio: '2025-07-01', fechaFin: '2025-12-31', estado: 'Cerrado' },
    { id: 'per-2026-1', nombre: '2026 - Primer semestre', fechaInicio: '2026-01-01', fechaFin: '2026-06-30', estado: 'Cerrado' },
    { id: 'per-2026-2', nombre: '2026 - Segundo semestre', fechaInicio: '2026-07-01', fechaFin: '2026-12-31', estado: 'Activo' }
  ];

  /* =======================================================================
     ESTADOS DE EVALUACIÓN (RF-27) — orden estricto, sin saltos ni retrocesos
  ======================================================================= */

  const ESTADOS_EVALUACION = ['Pendiente', 'En proceso', 'Finalizada', 'Consolidada', 'Cerrada'];

  function siguienteEstadoValido(actual, propuesto) {
    const i = ESTADOS_EVALUACION.indexOf(actual);
    const j = ESTADOS_EVALUACION.indexOf(propuesto);
    return j === i + 1;
  }

  /* =======================================================================
     RESULTADO DE UNA EVALUACIÓN INDIVIDUAL (RF-14)
  ======================================================================= */

  function calcResultado(evaluacion) {
    const indicadores = (evaluacion.calificaciones && evaluacion.calificaciones.indicadores) || {};
    const ids = Object.keys(indicadores);
    if (!ids.length) return null;

    const valoresNumericos = [];
    const instVals = [];
    const espVals = [];

    ids.forEach(id => {
      const v = indicadores[id];
      if (v === 'NO' || v === null || v === undefined) return;
      const n = Number(v);
      valoresNumericos.push(n);
      const info = INDICADOR_INDEX[id];
      if (info) {
        if (info.competenciaTipo === 'institucional') instVals.push(n);
        else if (info.competenciaTipo !== 'sst') espVals.push(n);
      }
    });

    if (!valoresNumericos.length) return null;

    const avg = promedio(valoresNumericos);
    return {
      score: round1(avg),
      pct: round1((avg / 5) * 100),
      descriptor: descriptorPara(avg),
      scoreInstitucional: instVals.length ? round1(promedio(instVals)) : null,
      scoreEspecifico: espVals.length ? round1(promedio(espVals)) : null,
      calificados: valoresNumericos.length + ids.filter(id => indicadores[id] === 'NO').length,
      totalIndicadores: ids.length
    };
  }

  /* =======================================================================
     PERSISTENCIA (localStorage)
  ======================================================================= */

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('No se pudo leer la base local, se recrea desde la semilla.', e);
    }
    return null;
  }

  let state = load();

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function resetDemo() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }

  /* =======================================================================
     ESTRUCTURA ORGANIZACIONAL (deriva jefe / pares / subalternos de jefeId)
  ======================================================================= */

  function jefeDe(usuarioId) {
    const u = state.usuarios.find(x => x.id === usuarioId);
    return u && u.jefeId ? state.usuarios.find(x => x.id === u.jefeId) : null;
  }

  function paresDe(usuarioId) {
    const u = state.usuarios.find(x => x.id === usuarioId);
    if (!u || !u.jefeId) return [];
    return state.usuarios.filter(x => x.jefeId === u.jefeId && x.id !== usuarioId && x.rolId === 'colaborador' && x.estado === 'Activo');
  }

  function subalternosDirectos(usuarioId) {
    return state.usuarios.filter(x => x.jefeId === usuarioId && x.rolId === 'colaborador' && x.estado === 'Activo');
  }

  function subalternosTodos(usuarioId) {
    const directos = subalternosDirectos(usuarioId);
    let all = directos.slice();
    directos.forEach(d => { all = all.concat(subalternosTodos(d.id)); });
    return all;
  }

  /* =======================================================================
     GENERACIÓN DE EVALUACIONES 360° (RF-09, RF-10, RF-28)
     A partir de la estructura organizacional: Auto siempre; Jefe si existe;
     un registro por Par; un registro por Subalterno directo (condicionado a
     que existan); y un ítem SST evaluado por el jefe (o autoevaluado si no
     tiene jefe), transversal e independiente del 360°.
  ======================================================================= */

  function generarEvaluacionesColaborador(colaboradorId, periodoId) {
    const nuevas = [];
    const jefe = jefeDe(colaboradorId);
    const pares = paresDe(colaboradorId);
    const subalternos = subalternosDirectos(colaboradorId);

    function push(tipoEvaluador, evaluadorId) {
      nuevas.push({
        id: uid('ev'), periodoId, colaboradorId, evaluadorId, tipoEvaluador,
        estado: 'Pendiente', fecha: null, calificaciones: { indicadores: {} }
      });
    }

    push('AUTO', colaboradorId);
    if (jefe) push('JEFE', jefe.id);
    pares.forEach(p => push('PAR', p.id));
    subalternos.forEach(s => push('SUBALTERNO', s.id));
    push('SST', jefe ? jefe.id : colaboradorId);

    return nuevas;
  }

  /* =======================================================================
     SEMILLA DE EVALUACIONES (histórico + período activo en curso)
  ======================================================================= */

  const BASE_SCORES = {
    'u-01': 4.4, 'u-02': 4.1, 'u-03': 4.3, 'u-04': 3.8,
    'u-05': 3.9, 'u-06': 3.6, 'u-07': 4.2, 'u-08': 3.7,
    'u-09': 4.0, 'u-10': 3.5, 'u-11': 4.5, 'u-12': 3.2, 'u-13': 3.9
  };

  function indicadoresParaEvaluacion(ev, colaborador) {
    if (ev.tipoEvaluador === 'SST') return SST_COMPETENCIA.indicadores.map(i => i.id);
    return indicadoresAplicables(colaborador.tipoCargo).map(i => i.id);
  }

  function calificarSimulado(ev, colaborador, baseScore, fraccion) {
    const ids = indicadoresParaEvaluacion(ev, colaborador);
    const aCalificar = fraccion >= 1 ? ids : ids.slice(0, Math.max(1, Math.round(ids.length * fraccion)));
    aCalificar.forEach(id => {
      let valor;
      if ((ev.tipoEvaluador === 'PAR' || ev.tipoEvaluador === 'SUBALTERNO') && Math.random() < 0.08) {
        valor = 'NO';
      } else {
        const jitter = (Math.random() - 0.5) * 0.8;
        valor = clamp(Math.round(baseScore + jitter), 1, 5);
      }
      ev.calificaciones.indicadores[id] = valor;
    });
  }

  function construirEvaluacionesSeed(usuarios, periodos) {
    let all = [];
    const colaboradores = usuarios.filter(u => u.rolId === 'colaborador' && u.estado === 'Activo');
    const colabById = {};
    colaboradores.forEach(c => { colabById[c.id] = c; });

    // Necesitamos jefeDe/paresDe/subalternosDirectos operando sobre `usuarios`
    // antes de que `state` exista: usamos un estado temporal.
    const prevState = state;
    state = { usuarios, evaluaciones: [] };

    const periodosCerrados = periodos.filter(p => p.estado === 'Cerrado');
    periodosCerrados.forEach((periodo, idx) => {
      const pasos = periodosCerrados.length - 1 - idx;
      colaboradores.forEach(c => {
        const target = BASE_SCORES[c.id] || 3.8;
        const scorePeriodo = clamp(target - pasos * 0.28, 1.5, 5);
        const evs = generarEvaluacionesColaborador(c.id, periodo.id);
        evs.forEach(ev => {
          calificarSimulado(ev, c, scorePeriodo, 1);
          ev.estado = 'Cerrada';
          ev.fecha = periodo.fechaFin;
        });
        all = all.concat(evs);
      });
    });

    const activo = periodos.find(p => p.estado === 'Activo');
    if (activo) {
      colaboradores.forEach(c => {
        const target = BASE_SCORES[c.id] || 3.8;
        const evs = generarEvaluacionesColaborador(c.id, activo.id);
        evs.forEach(ev => {
          if (ev.tipoEvaluador === 'AUTO') {
            calificarSimulado(ev, c, target, 1);
            ev.estado = 'Finalizada';
            ev.fecha = '2026-08-05';
          } else if (ev.tipoEvaluador === 'JEFE') {
            calificarSimulado(ev, c, target, 0.6);
            ev.estado = 'En proceso';
          }
          // PAR, SUBALTERNO y SST quedan Pendiente para mostrar el flujo en curso.
        });
        all = all.concat(evs);
      });
    }

    state = prevState;
    return all;
  }

  /* =======================================================================
     NOTIFICACIONES (RF-26) — semilla mínima sobre el período activo
  ======================================================================= */

  function construirNotificacionesSeed(usuarios, evaluacionesActivas, periodoActivoNombre) {
    const out = [];
    const colabById = {};
    usuarios.forEach(u => { colabById[u.id] = u; });

    evaluacionesActivas.forEach(ev => {
      if (ev.tipoEvaluador === 'AUTO') return;
      const colaborador = colabById[ev.colaboradorId];
      const evaluador = colabById[ev.evaluadorId];
      if (!colaborador || !evaluador) return;
      if (ev.tipoEvaluador === 'JEFE') {
        out.push({ id: uid('not'), usuarioId: evaluador.id, tipo: 'Nueva evaluación asignada', mensaje: `Tienes pendiente evaluar a ${colaborador.nombre} (como Jefe) en el período ${periodoActivoNombre}.`, fecha: '2026-07-02', leida: evaluador.id !== 'u-04' && evaluador.id !== 'u-08' });
      }
      if (ev.tipoEvaluador === 'PAR') {
        out.push({ id: uid('not'), usuarioId: evaluador.id, tipo: 'Nueva evaluación asignada', mensaje: `Tienes pendiente evaluar a ${colaborador.nombre} (como Par) en el período ${periodoActivoNombre}.`, fecha: '2026-07-03', leida: true });
      }
    });

    out.push({ id: uid('not'), usuarioId: 'u-admin', tipo: 'Período activo', mensaje: `El período ${periodoActivoNombre} está activo con evaluaciones 360° generadas para todos los colaboradores.`, fecha: '2026-07-01', leida: true });

    return out;
  }

  /* =======================================================================
     ENSAMBLADO DE LA SEMILLA
  ======================================================================= */

  function construirSeed() {
    const evaluaciones = construirEvaluacionesSeed(USUARIOS, PERIODOS);
    const activo = PERIODOS.find(p => p.estado === 'Activo');
    const evaluacionesActivas = evaluaciones.filter(e => e.periodoId === activo.id);
    const notificaciones = construirNotificacionesSeed(USUARIOS, evaluacionesActivas, activo.nombre);
    return {
      roles: ROLES, perfiles: PERFILES, usuarios: USUARIOS, periodos: PERIODOS,
      evaluaciones, notificaciones
    };
  }

  if (!state) {
    state = construirSeed();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  /* =======================================================================
     API DE CONSULTA / MUTACIÓN
  ======================================================================= */

  const DB = {
    roles: () => state.roles,
    perfiles: () => state.perfiles,
    usuarios: () => state.usuarios,
    periodos: () => state.periodos,
    evaluaciones: () => state.evaluaciones,
    notificaciones: () => state.notificaciones,

    rol: id => state.roles.find(r => r.id === id),
    usuario: id => state.usuarios.find(u => u.id === id),
    perfil: id => state.perfiles.find(p => p.id === id),
    periodo: id => state.periodos.find(p => p.id === id),

    periodoActivo: () => state.periodos.find(p => p.estado === 'Activo'),

    // ---- estructura organizacional ----
    jefeDe, paresDe, subalternosDirectos, subalternosTodos,

    colaboradoresVisiblesPara(usuario) {
      if (usuario.rolId === 'admin') return state.usuarios.filter(u => u.rolId === 'colaborador');
      const propios = subalternosTodos(usuario.id);
      const set = [usuario].concat(propios);
      const seen = new Set();
      return set.filter(u => (seen.has(u.id) ? false : (seen.add(u.id), true)));
    },

    // ---- catálogo de competencias 360° ----
    competenciasTodas: () => COMPETENCIAS_360,
    competenciaPorId: id => COMPETENCIAS_360.find(c => c.id === id),
    competenciasAplicables,
    indicadoresAplicables,
    indicadorInfo: id => INDICADOR_INDEX[id],
    textoComportamiento,
    textoComportamientoSST,
    sstCompetencia: () => SST_COMPETENCIA,

    // ---- evaluaciones ----
    evaluacionesDe(colaboradorId, periodoId) {
      return state.evaluaciones.filter(e => e.colaboradorId === colaboradorId && (!periodoId || e.periodoId === periodoId));
    },
    evaluacionesAsignadasA(evaluadorId, periodoId) {
      return state.evaluaciones.filter(e => e.evaluadorId === evaluadorId && (!periodoId || e.periodoId === periodoId));
    },
    resultado: calcResultado,
    guardarCalificacion(evaluacionId, indicadorId, valor) {
      const ev = state.evaluaciones.find(e => e.id === evaluacionId);
      if (!ev) return;
      ev.calificaciones.indicadores[indicadorId] = valor;
      if (ev.estado === 'Pendiente') ev.estado = 'En proceso';
      save();
    },
    avanzarEstado(evaluacionId, nuevoEstado) {
      const ev = state.evaluaciones.find(e => e.id === evaluacionId);
      if (!ev) return { ok: false, error: 'Evaluación no encontrada.' };
      if (!siguienteEstadoValido(ev.estado, nuevoEstado)) {
        return { ok: false, error: 'No se puede pasar de "' + ev.estado + '" a "' + nuevoEstado + '" (RF-27: la evaluación solo avanza en orden).' };
      }
      ev.estado = nuevoEstado;
      if (!ev.fecha) ev.fecha = new Date().toISOString().slice(0, 10);
      save();
      return { ok: true };
    },
    crearEvaluacion(data) {
      const ev = Object.assign({ id: uid('ev'), estado: 'Pendiente', fecha: null, calificaciones: { indicadores: {} } }, data);
      state.evaluaciones.push(ev);
      save();
      return ev;
    },
    generarEvaluacionesPeriodo(periodoId) {
      const existentes = state.evaluaciones.filter(e => e.periodoId === periodoId);
      if (existentes.length) return 0;
      const colaboradores = state.usuarios.filter(u => u.rolId === 'colaborador' && u.estado === 'Activo');
      let count = 0;
      colaboradores.forEach(c => {
        const evs = generarEvaluacionesColaborador(c.id, periodoId);
        state.evaluaciones.push.apply(state.evaluaciones, evs);
        count += evs.length;
      });
      save();
      return count;
    },

    // ---- consolidación (RF-15) — promedio ponderado 360° según tipo de cargo ----
    consolidar(colaboradorId, periodoId) {
      const usuario = state.usuarios.find(u => u.id === colaboradorId);
      if (!usuario || !usuario.tipoCargo) return null;
      const pesos = PESOS[usuario.tipoCargo];
      const evaluaciones = DB.evaluacionesDe(colaboradorId, periodoId);
      if (!evaluaciones.length) return null;

      const porTipo = { AUTO: [], JEFE: [], PAR: [], SUBALTERNO: [] };
      let sstEval = null;
      evaluaciones.forEach(e => {
        if (e.tipoEvaluador === 'SST') { sstEval = e; return; }
        if (porTipo[e.tipoEvaluador]) porTipo[e.tipoEvaluador].push(e);
      });

      let weightedSum = 0, usedWeight = 0;
      const detalle = {};
      [['JEFE', 'jefe'], ['PAR', 'par'], ['AUTO', 'auto'], ['SUBALTERNO', 'subalterno']].forEach(([tipo, key]) => {
        const peso = pesos[key];
        if (!peso) return;
        const scores = porTipo[tipo].map(e => calcResultado(e)).filter(Boolean).map(r => r.score);
        if (!scores.length) return;
        const avgScore = promedio(scores);
        detalle[tipo] = round1(avgScore);
        weightedSum += peso * avgScore;
        usedWeight += peso;
      });

      if (sstEval) {
        const r = calcResultado(sstEval);
        if (r) {
          detalle.SST = r.score;
          weightedSum += pesos.sst * r.score;
          usedWeight += pesos.sst;
        }
      }

      if (usedWeight === 0) return null;
      const scoreGeneral = weightedSum / usedWeight;

      return {
        colaboradorId, periodoId,
        tipoCargo: usuario.tipoCargo,
        scoreGeneral: round1(scoreGeneral),
        pctGeneral: round1((scoreGeneral / 5) * 100),
        descriptor: descriptorPara(scoreGeneral),
        detalle,
        evaluadoresAsignados: evaluaciones.length,
        evaluadoresCompletos: evaluaciones.filter(e => ['Finalizada', 'Consolidada', 'Cerrada'].includes(e.estado)).length,
        reglaConsolidacion: reglaConsolidacionTexto(usuario.tipoCargo)
      };
    },

    historialDe(colaboradorId) {
      return state.periodos
        .map(p => ({ periodo: p, consolidado: DB.consolidar(colaboradorId, p.id) }))
        .filter(h => h.consolidado);
    },

    // ---- catálogos CRUD genéricos (RF-02, RF-04, RF-08) ----
    crear(coleccion, data, prefix) {
      const item = Object.assign({ id: uid(prefix) }, data);
      state[coleccion].push(item);
      save();
      return item;
    },
    actualizar(coleccion, id, data) {
      const item = state[coleccion].find(i => i.id === id);
      if (!item) return null;
      Object.assign(item, data);
      save();
      return item;
    },
    eliminar(coleccion, id) {
      state[coleccion] = state[coleccion].filter(i => i.id !== id);
      save();
    },

    // ---- notificaciones ----
    notificacionesDe(usuarioId) {
      return state.notificaciones.filter(n => n.usuarioId === usuarioId).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    },
    marcarLeida(id) {
      const n = state.notificaciones.find(n => n.id === id);
      if (n) { n.leida = true; save(); }
    },
    marcarTodasLeidas(usuarioId) {
      state.notificaciones.filter(n => n.usuarioId === usuarioId).forEach(n => { n.leida = true; });
      save();
    },
    notificar(usuarioId, tipo, mensaje) {
      state.notificaciones.unshift({ id: uid('not'), usuarioId, tipo, mensaje, fecha: new Date().toISOString().slice(0, 10), leida: false });
      save();
    },

    save, resetDemo
  };

  global.TH = {
    DB, uid, clamp, round1, promedio, descriptorPara,
    ESTADOS_EVALUACION, siguienteEstadoValido, calcResultado,
    TIPOS_EVALUADOR, TIPO_CARGO_LABEL, PESOS, ESCALA, NO_OBSERVADO,
    DEMO_USER_IDS
  };

})(window);
