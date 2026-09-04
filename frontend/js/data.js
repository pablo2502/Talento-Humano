/* =========================================================================
   DATA.JS
   Base de datos simulada del Sistema Integral de Evaluación por
   Competencias y Desempeño (Talento Humano).

   No hay backend real conectado: todo vive en memoria y se persiste
   en localStorage para que los cambios sobrevivan a un refresco de
   página. Esto sustenta el prototipo frontend; el backend Spring Boot
   en /backend reproduce este mismo modelo de datos para una futura
   integración real (ver backend/README.md).
========================================================================= */

(function (global) {
  'use strict';

  const STORAGE_KEY = 'th_db_v1';

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

  function nivelPara(score) {
    if (score >= 90) return 'Sobresaliente';
    if (score >= 75) return 'Competente';
    if (score >= 60) return 'En desarrollo';
    return 'Inicial';
  }

  function promedio(arr) {
    if (!arr.length) return 0;
    return arr.reduce((s, n) => s + n, 0) / arr.length;
  }

  /* =======================================================================
     ROLES (RF-03)
     El id de rol coincide con el "tipoEvaluador" cuando el rol actúa
     como evaluador (jefe, gerente, cliente).
  ======================================================================= */

  const ROLES = [
    {
      id: 'admin',
      nombre: 'Administrador',
      permisos: [
        'Gestionar usuarios', 'Gestionar roles y permisos', 'Crear competencias',
        'Crear comportamientos', 'Crear perfiles', 'Configurar períodos',
        'Consultar todos los resultados', 'Generar informes'
      ]
    },
    {
      id: 'jefe',
      nombre: 'Jefe / Evaluador',
      permisos: [
        'Consultar colaboradores asignados', 'Realizar evaluaciones',
        'Consultar evaluaciones realizadas', 'Realizar seguimiento',
        'Consultar resultados autorizados'
      ]
    },
    {
      id: 'gerente',
      nombre: 'Gerente',
      permisos: [
        'Consultar resultados de su área', 'Realizar evaluaciones',
        'Consultar indicadores consolidados', 'Generar informes de su nivel jerárquico'
      ]
    },
    {
      id: 'cliente',
      nombre: 'Cliente / Evaluador externo',
      permisos: [
        'Realizar las evaluaciones que le sean asignadas',
        'Evaluar competencias y comportamiento',
        'Consultar únicamente el proceso que tenga autorizado'
      ]
    },
    {
      id: 'colaborador',
      nombre: 'Colaborador',
      permisos: [
        'Consultar su perfil', 'Consultar resultados propios',
        'Consultar historial de evaluaciones', 'Consultar recomendaciones y planes de mejora'
      ]
    }
  ];

  /* =======================================================================
     COMPETENCIAS (RF-05)
  ======================================================================= */

  const COMPETENCIAS = [
    { id: 'comp-01', codigo: 'COMP-001', nombre: 'Trabajo en equipo', descripcion: 'Capacidad para colaborar con otros miembros de la organización y alcanzar objetivos comunes.', categoria: 'Genérica', nivelEsperado: 'Avanzado', estado: 'Activo' },
    { id: 'comp-02', codigo: 'COMP-002', nombre: 'Comunicación', descripcion: 'Capacidad para transmitir ideas de forma clara, efectiva y oportuna.', categoria: 'Genérica', nivelEsperado: 'Avanzado', estado: 'Activo' },
    { id: 'comp-03', codigo: 'COMP-003', nombre: 'Resolución de problemas', descripcion: 'Capacidad para identificar, analizar y resolver situaciones complejas.', categoria: 'Genérica', nivelEsperado: 'Intermedio', estado: 'Activo' },
    { id: 'comp-04', codigo: 'COMP-004', nombre: 'Conocimiento técnico', descripcion: 'Dominio de los conocimientos y herramientas propias del cargo.', categoria: 'Técnica', nivelEsperado: 'Avanzado', estado: 'Activo' },
    { id: 'comp-05', codigo: 'COMP-005', nombre: 'Adaptabilidad', descripcion: 'Capacidad para ajustarse a cambios en el entorno de trabajo.', categoria: 'Genérica', nivelEsperado: 'Intermedio', estado: 'Activo' },
    { id: 'comp-06', codigo: 'COMP-006', nombre: 'Liderazgo', descripcion: 'Capacidad para guiar, motivar y desarrollar equipos de trabajo.', categoria: 'Directiva', nivelEsperado: 'Avanzado', estado: 'Activo' }
  ];

  /* =======================================================================
     COMPORTAMIENTOS (RF-06) — misma estructura de campos que Competencias
     más indicadores observables.
  ======================================================================= */

  const COMPORTAMIENTOS = [
    { id: 'com-01', codigo: 'COM-001', nombre: 'Cumplimiento', descripcion: 'Cumple los compromisos y acuerdos establecidos.', indicadores: ['Cumple sus compromisos', 'Entrega las actividades asignadas', 'Respeta los tiempos establecidos'], estado: 'Activo' },
    { id: 'com-02', codigo: 'COM-002', nombre: 'Responsabilidad', descripcion: 'Asume con seriedad las tareas y decisiones a su cargo.', indicadores: ['Cumple sus compromisos', 'Entrega las actividades asignadas', 'Respeta los tiempos establecidos'], estado: 'Activo' },
    { id: 'com-03', codigo: 'COM-003', nombre: 'Puntualidad', descripcion: 'Cumple con los horarios y plazos establecidos.', indicadores: ['Llega a tiempo a reuniones', 'Entrega a tiempo sus actividades'], estado: 'Activo' },
    { id: 'com-04', codigo: 'COM-004', nombre: 'Actitud', descripcion: 'Mantiene una disposición positiva ante el trabajo y los cambios.', indicadores: ['Muestra disposición al trabajo', 'Reacciona positivamente ante los cambios'], estado: 'Activo' },
    { id: 'com-05', codigo: 'COM-005', nombre: 'Colaboración', descripcion: 'Apoya activamente a sus compañeros y a otras áreas.', indicadores: ['Apoya a sus compañeros', 'Comparte conocimiento con el equipo'], estado: 'Activo' }
  ];

  /* =======================================================================
     PERFILES DE CARGO (RF-04)
  ======================================================================= */

  const PERFILES = [
    {
      id: 'perfil-analista', nombre: 'Analista de Procesos', cargo: 'Analista de Procesos', area: 'Tecnología',
      descripcion: 'Responsable de analizar, documentar y mejorar los procesos internos del área.',
      competencias: ['comp-01', 'comp-02', 'comp-03', 'comp-04', 'comp-05'],
      comportamientos: ['com-01', 'com-02', 'com-03', 'com-04', 'com-05'],
      nivelEsperado: 'Intermedio', estado: 'Activo', fechaCreacion: '2024-02-10'
    },
    {
      id: 'perfil-desarrollador', nombre: 'Desarrollador de Software', cargo: 'Desarrollador de Software', area: 'Tecnología',
      descripcion: 'Diseña, construye y mantiene soluciones de software del sistema.',
      competencias: ['comp-03', 'comp-04', 'comp-05', 'comp-01'],
      comportamientos: ['com-01', 'com-02', 'com-05'],
      nivelEsperado: 'Avanzado', estado: 'Activo', fechaCreacion: '2024-02-10'
    },
    {
      id: 'perfil-comercial', nombre: 'Ejecutivo Comercial', cargo: 'Ejecutivo Comercial', area: 'Comercial',
      descripcion: 'Gestiona la relación con clientes y el cumplimiento de metas comerciales.',
      competencias: ['comp-01', 'comp-02', 'comp-05'],
      comportamientos: ['com-01', 'com-03', 'com-04'],
      nivelEsperado: 'Intermedio', estado: 'Activo', fechaCreacion: '2024-03-01'
    },
    {
      id: 'perfil-jefe', nombre: 'Jefe de Área', cargo: 'Jefe de Área', area: 'Tecnología',
      descripcion: 'Lidera un equipo de colaboradores y participa como evaluador dentro del ciclo de desempeño.',
      competencias: ['comp-01', 'comp-02', 'comp-06'],
      comportamientos: ['com-01', 'com-02'],
      nivelEsperado: 'Avanzado', estado: 'Activo', fechaCreacion: '2024-01-15'
    }
  ];

  /* =======================================================================
     USUARIOS (RF-02) + estructura organizacional (para RF-28)
     jefeId: jefe inmediato · areaGerenteId: gerente del área
  ======================================================================= */

  const USUARIOS = [
    {
      id: 'u-admin', nombre: 'Ana Torres', correo: 'ana.torres@empresa.com', password: 'admin123', documento: '1010001',
      rolId: 'admin', cargo: 'Administradora del sistema', area: 'Dirección', perfilId: null,
      jefeId: null, estado: 'Activo', fechaIngreso: '2022-03-01'
    },
    {
      id: 'u-gerente1', nombre: 'Carlos Mendoza', correo: 'carlos.mendoza@empresa.com', password: '123456', documento: '1010002',
      rolId: 'gerente', cargo: 'Gerente de Tecnología', area: 'Tecnología', perfilId: null,
      jefeId: null, estado: 'Activo', fechaIngreso: '2021-06-15'
    },
    {
      id: 'u-gerente2', nombre: 'Diana Ruiz', correo: 'diana.ruiz@empresa.com', password: '123456', documento: '1010003',
      rolId: 'gerente', cargo: 'Gerente Comercial', area: 'Comercial', perfilId: null,
      jefeId: null, estado: 'Activo', fechaIngreso: '2021-09-01'
    },
    {
      id: 'u-jefe1', nombre: 'Marta Gil', correo: 'marta.gil@empresa.com', password: '123456', documento: '1010004',
      rolId: 'jefe', cargo: 'Jefe de Área', area: 'Tecnología', perfilId: 'perfil-jefe',
      jefeId: 'u-gerente1', estado: 'Activo', fechaIngreso: '2022-01-10'
    },
    {
      id: 'u-jefe2', nombre: 'Pedro Salas', correo: 'pedro.salas@empresa.com', password: '123456', documento: '1010005',
      rolId: 'jefe', cargo: 'Jefe de Área', area: 'Comercial', perfilId: 'perfil-jefe',
      jefeId: 'u-gerente2', estado: 'Activo', fechaIngreso: '2022-04-20'
    },
    {
      id: 'u-cliente1', nombre: 'Roberto Vidal', correo: 'roberto.vidal@clienteexterno.com', password: '123456', documento: '1010006',
      rolId: 'cliente', cargo: 'Representante de cliente', area: 'Externo', perfilId: null,
      jefeId: null, estado: 'Activo', fechaIngreso: '2023-05-05'
    },
    {
      id: 'u-colab1', nombre: 'Laura Ramírez', correo: 'laura.ramirez@empresa.com', password: '123456', documento: '1010007',
      rolId: 'colaborador', cargo: 'Analista de Procesos', area: 'Tecnología', perfilId: 'perfil-analista',
      jefeId: 'u-jefe1', estado: 'Activo', fechaIngreso: '2023-02-01',
      clienteEvaluadorId: 'u-cliente1'
    },
    {
      id: 'u-colab2', nombre: 'Andrés Peña', correo: 'andres.pena@empresa.com', password: '123456', documento: '1010008',
      rolId: 'colaborador', cargo: 'Desarrollador de Software', area: 'Tecnología', perfilId: 'perfil-desarrollador',
      jefeId: 'u-jefe1', estado: 'Activo', fechaIngreso: '2023-08-14'
    },
    {
      id: 'u-colab3', nombre: 'Sofía Herrera', correo: 'sofia.herrera@empresa.com', password: '123456', documento: '1010009',
      rolId: 'colaborador', cargo: 'Ejecutivo Comercial', area: 'Comercial', perfilId: 'perfil-comercial',
      jefeId: 'u-jefe2', estado: 'Activo', fechaIngreso: '2024-01-08'
    },
    {
      id: 'u-colab4', nombre: 'Julián Torres', correo: 'julian.torres@empresa.com', password: '123456', documento: '1010010',
      rolId: 'colaborador', cargo: 'Analista de Procesos', area: 'Tecnología', perfilId: 'perfil-analista',
      jefeId: 'u-jefe1', estado: 'Inactivo', fechaIngreso: '2022-11-20'
    }
  ];

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
     EVALUACIONES (RF-09 a RF-13) + RESULTADOS (RF-14)
     calificaciones: { competencias:{id:valor}, comportamientos:{id:valor} }
     resultadoGeneral = resultadoCompetencias*0.6 + resultadoComportamiento*0.4
  ======================================================================= */

  function calcResultado(calificaciones) {
    const compVals = Object.values(calificaciones.competencias || {});
    const comportVals = Object.values(calificaciones.comportamientos || {});
    const resultadoCompetencias = round1(promedio(compVals));
    const resultadoComportamiento = round1(promedio(comportVals));
    const resultadoGeneral = round1(resultadoCompetencias * 0.6 + resultadoComportamiento * 0.4);
    return { resultadoCompetencias, resultadoComportamiento, resultadoGeneral };
  }

  function califica(ids, valor) {
    const out = {};
    ids.forEach(id => { out[id] = valor; });
    return out;
  }

  const perfilAnalista = PERFILES.find(p => p.id === 'perfil-analista');

  // --- Evaluaciones históricas y activas de Laura Ramírez (u-colab1) ---
  // Cierre 2026-1 replica el ejemplo exacto de la Propuesta de Proyecto.
  const EVALUACIONES = [
    // 2025-1: consolidado ~76%
    { id: uid('ev'), periodoId: 'per-2025-1', colaboradorId: 'u-colab1', evaluadorId: 'u-jefe1', tipoEvaluador: 'JEFE', estado: 'Consolidada',
      fecha: '2025-06-28',
      calificaciones: { competencias: califica(perfilAnalista.competencias, 76), comportamientos: califica(perfilAnalista.comportamientos, 78) } },

    // 2025-2: consolidado ~81%
    { id: uid('ev'), periodoId: 'per-2025-2', colaboradorId: 'u-colab1', evaluadorId: 'u-jefe1', tipoEvaluador: 'JEFE', estado: 'Consolidada',
      fecha: '2025-12-20',
      calificaciones: { competencias: califica(perfilAnalista.competencias, 80), comportamientos: califica(perfilAnalista.comportamientos, 83) } },

    // 2026-1: ejemplo textual de la propuesta — Jefe 82/88, Gerente 78/85, Cliente 85/90
    { id: uid('ev'), periodoId: 'per-2026-1', colaboradorId: 'u-colab1', evaluadorId: 'u-jefe1', tipoEvaluador: 'JEFE', estado: 'Consolidada',
      fecha: '2026-06-25',
      calificaciones: {
        competencias: { 'comp-01': 85, 'comp-02': 80, 'comp-03': 78, 'comp-04': 84, 'comp-05': 83 },
        comportamientos: { 'com-01': 90, 'com-02': 88, 'com-03': 85, 'com-04': 90, 'com-05': 87 }
      } },
    { id: uid('ev'), periodoId: 'per-2026-1', colaboradorId: 'u-colab1', evaluadorId: 'u-gerente1', tipoEvaluador: 'GERENTE', estado: 'Consolidada',
      fecha: '2026-06-27',
      calificaciones: {
        competencias: { 'comp-01': 80, 'comp-02': 76, 'comp-03': 75, 'comp-04': 80, 'comp-05': 79 },
        comportamientos: { 'com-01': 86, 'com-02': 84, 'com-03': 83, 'com-04': 87, 'com-05': 85 }
      } },
    { id: uid('ev'), periodoId: 'per-2026-1', colaboradorId: 'u-colab1', evaluadorId: 'u-cliente1', tipoEvaluador: 'CLIENTE', estado: 'Consolidada',
      fecha: '2026-06-29',
      calificaciones: {
        competencias: { 'comp-01': 87, 'comp-02': 84, 'comp-03': 82, 'comp-04': 88, 'comp-05': 84 },
        comportamientos: { 'com-01': 92, 'com-02': 90, 'com-03': 88, 'com-04': 91, 'com-05': 89 }
      } },

    // 2026-2 (activo): en curso — Jefe En proceso, Gerente y Cliente Pendientes
    { id: uid('ev'), periodoId: 'per-2026-2', colaboradorId: 'u-colab1', evaluadorId: 'u-jefe1', tipoEvaluador: 'JEFE', estado: 'En proceso',
      fecha: null,
      calificaciones: {
        competencias: { 'comp-01': 86, 'comp-02': 82, 'comp-03': 79, 'comp-04': 85, 'comp-05': 81 },
        comportamientos: { 'com-01': 90, 'com-02': 87, 'com-03': 86, 'com-04': 89, 'com-05': 88 }
      } },
    { id: uid('ev'), periodoId: 'per-2026-2', colaboradorId: 'u-colab1', evaluadorId: 'u-gerente1', tipoEvaluador: 'GERENTE', estado: 'Pendiente',
      fecha: null, calificaciones: { competencias: {}, comportamientos: {} } },
    { id: uid('ev'), periodoId: 'per-2026-2', colaboradorId: 'u-colab1', evaluadorId: 'u-cliente1', tipoEvaluador: 'CLIENTE', estado: 'Pendiente',
      fecha: null, calificaciones: { competencias: {}, comportamientos: {} } },

    // --- Andrés Peña (u-colab2): evaluador único (jefe), historial más corto ---
    { id: uid('ev'), periodoId: 'per-2025-2', colaboradorId: 'u-colab2', evaluadorId: 'u-jefe1', tipoEvaluador: 'JEFE', estado: 'Consolidada',
      fecha: '2025-12-18',
      calificaciones: { competencias: califica(['comp-03', 'comp-04', 'comp-05', 'comp-01'], 74), comportamientos: califica(['com-01', 'com-02', 'com-05'], 77) } },
    { id: uid('ev'), periodoId: 'per-2026-1', colaboradorId: 'u-colab2', evaluadorId: 'u-jefe1', tipoEvaluador: 'JEFE', estado: 'Consolidada',
      fecha: '2026-06-22',
      calificaciones: { competencias: califica(['comp-03', 'comp-04', 'comp-05', 'comp-01'], 79), comportamientos: califica(['com-01', 'com-02', 'com-05'], 80) } },
    { id: uid('ev'), periodoId: 'per-2026-2', colaboradorId: 'u-colab2', evaluadorId: 'u-jefe1', tipoEvaluador: 'JEFE', estado: 'Pendiente',
      fecha: null, calificaciones: { competencias: {}, comportamientos: {} } },

    // --- Sofía Herrera (u-colab3): otra área (Comercial) ---
    { id: uid('ev'), periodoId: 'per-2026-1', colaboradorId: 'u-colab3', evaluadorId: 'u-jefe2', tipoEvaluador: 'JEFE', estado: 'Consolidada',
      fecha: '2026-06-20',
      calificaciones: { competencias: califica(['comp-01', 'comp-02', 'comp-05'], 88), comportamientos: califica(['com-01', 'com-03', 'com-04'], 90) } },
    { id: uid('ev'), periodoId: 'per-2026-1', colaboradorId: 'u-colab3', evaluadorId: 'u-gerente2', tipoEvaluador: 'GERENTE', estado: 'Consolidada',
      fecha: '2026-06-24',
      calificaciones: { competencias: califica(['comp-01', 'comp-02', 'comp-05'], 85), comportamientos: califica(['com-01', 'com-03', 'com-04'], 87) } },
    { id: uid('ev'), periodoId: 'per-2026-2', colaboradorId: 'u-colab3', evaluadorId: 'u-jefe2', tipoEvaluador: 'JEFE', estado: 'En proceso',
      fecha: null,
      calificaciones: { competencias: califica(['comp-01', 'comp-02', 'comp-05'], 84), comportamientos: califica(['com-01', 'com-03', 'com-04'], 86) } }
  ];

  /* =======================================================================
     NOTIFICACIONES (RF-26)
  ======================================================================= */

  const NOTIFICACIONES = [
    { id: uid('not'), usuarioId: 'u-colab1', tipo: 'Evaluación pendiente', mensaje: 'Tu jefe inmediato está evaluando tu desempeño del ciclo 2026-II.', fecha: '2026-08-20', leida: false },
    { id: uid('not'), usuarioId: 'u-colab1', tipo: 'Resultado publicado', mensaje: 'Se publicó el resultado consolidado del ciclo 2026-I: 84.07%.', fecha: '2026-07-02', leida: true },
    { id: uid('not'), usuarioId: 'u-jefe1', tipo: 'Nueva evaluación asignada', mensaje: 'Se te asignó como evaluador de Laura Ramírez, Andrés Peña para el ciclo 2026-II.', fecha: '2026-07-01', leida: false },
    { id: uid('not'), usuarioId: 'u-jefe1', tipo: 'Evaluación próxima a vencer', mensaje: 'La evaluación de Andrés Peña (2026-II) está próxima a vencer.', fecha: '2026-08-28', leida: false },
    { id: uid('not'), usuarioId: 'u-gerente1', tipo: 'Nueva evaluación asignada', mensaje: 'Se te asignó como evaluador de Laura Ramírez para el ciclo 2026-II.', fecha: '2026-07-01', leida: false },
    { id: uid('not'), usuarioId: 'u-cliente1', tipo: 'Nueva evaluación asignada', mensaje: 'Se te asignó una evaluación de cliente externo para el ciclo 2026-II.', fecha: '2026-07-01', leida: false },
    { id: uid('not'), usuarioId: 'u-admin', tipo: 'Período cerrado', mensaje: 'El período 2026 - Primer semestre fue cerrado con 9 evaluaciones consolidadas.', fecha: '2026-06-30', leida: true },
    { id: uid('not'), usuarioId: 'u-admin', tipo: 'Informe generado', mensaje: 'Se generó el informe general del período 2026 - Primer semestre.', fecha: '2026-07-01', leida: false }
  ];

  /* =======================================================================
     PERSISTENCIA (localStorage)
  ======================================================================= */

  const SEED = {
    roles: ROLES, competencias: COMPETENCIAS, comportamientos: COMPORTAMIENTOS,
    perfiles: PERFILES, usuarios: USUARIOS, periodos: PERIODOS, evaluaciones: EVALUACIONES,
    notificaciones: NOTIFICACIONES
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('No se pudo leer la base local, se recrea desde la semilla.', e);
    }
    const fresh = JSON.parse(JSON.stringify(SEED));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }

  const state = load();

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function resetDemo() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }

  /* =======================================================================
     API DE CONSULTA / MUTACIÓN
  ======================================================================= */

  const DB = {
    // ---- lecturas directas ----
    roles: () => state.roles,
    competencias: () => state.competencias,
    comportamientos: () => state.comportamientos,
    perfiles: () => state.perfiles,
    usuarios: () => state.usuarios,
    periodos: () => state.periodos,
    evaluaciones: () => state.evaluaciones,
    notificaciones: () => state.notificaciones,

    rol: id => state.roles.find(r => r.id === id),
    usuario: id => state.usuarios.find(u => u.id === id),
    perfil: id => state.perfiles.find(p => p.id === id),
    competencia: id => state.competencias.find(c => c.id === id),
    comportamiento: id => state.comportamientos.find(c => c.id === id),
    periodo: id => state.periodos.find(p => p.id === id),

    periodoActivo: () => state.periodos.find(p => p.estado === 'Activo'),

    // ---- estructura organizacional ----
    equipoDe(jefeId) {
      return state.usuarios.filter(u => u.jefeId === jefeId);
    },
    areaDe(gerenteId) {
      const gerente = DB.usuario(gerenteId);
      if (!gerente) return [];
      return state.usuarios.filter(u => u.rolId === 'colaborador' && u.area === gerente.area);
    },
    jefesDelArea(area) {
      return state.usuarios.filter(u => u.rolId === 'jefe' && u.area === area);
    },

    // Alcance de visibilidad de resultados por rol (RF-16)
    colaboradoresVisiblesPara(usuario) {
      if (usuario.rolId === 'admin') return state.usuarios.filter(u => u.rolId === 'colaborador');
      if (usuario.rolId === 'jefe') return DB.equipoDe(usuario.id);
      if (usuario.rolId === 'gerente') return DB.areaDe(usuario.id);
      if (usuario.rolId === 'cliente') {
        return state.usuarios.filter(u => u.clienteEvaluadorId === usuario.id);
      }
      if (usuario.rolId === 'colaborador') return [usuario];
      return [];
    },

    // RF-28: sugerencia automática de evaluadores según estructura organizacional
    sugerirEvaluadores(colaboradorId) {
      const colaborador = DB.usuario(colaboradorId);
      if (!colaborador) return [];
      const sugeridos = [];
      if (colaborador.jefeId) sugeridos.push({ evaluadorId: colaborador.jefeId, tipoEvaluador: 'JEFE' });
      const jefe = DB.usuario(colaborador.jefeId);
      const gerente = jefe ? state.usuarios.find(u => u.rolId === 'gerente' && u.area === jefe.area) : null;
      if (gerente) sugeridos.push({ evaluadorId: gerente.id, tipoEvaluador: 'GERENTE' });
      if (colaborador.clienteEvaluadorId) sugeridos.push({ evaluadorId: colaborador.clienteEvaluadorId, tipoEvaluador: 'CLIENTE' });
      return sugeridos;
    },

    // ---- evaluaciones ----
    evaluacionesDe(colaboradorId, periodoId) {
      return state.evaluaciones.filter(e => e.colaboradorId === colaboradorId && (!periodoId || e.periodoId === periodoId));
    },
    evaluacionesAsignadasA(evaluadorId, periodoId) {
      return state.evaluaciones.filter(e => e.evaluadorId === evaluadorId && (!periodoId || e.periodoId === periodoId));
    },
    resultado(evaluacion) {
      return calcResultado(evaluacion.calificaciones);
    },
    guardarCalificacion(evaluacionId, tipo, itemId, valor) {
      const ev = state.evaluaciones.find(e => e.id === evaluacionId);
      if (!ev) return;
      ev.calificaciones[tipo][itemId] = clamp(Number(valor) || 0, 0, 100);
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
      const ev = Object.assign({
        id: uid('ev'), estado: 'Pendiente', fecha: null,
        calificaciones: { competencias: {}, comportamientos: {} }
      }, data);
      state.evaluaciones.push(ev);
      save();
      return ev;
    },

    // ---- consolidación (RF-15) ----
    // Solo se promedian las evaluaciones que ya tienen al menos una
    // calificación registrada; una evaluación "Pendiente" sin datos no
    // cuenta como 0 dentro del promedio (evita distorsionar el resultado
    // mientras el ciclo sigue en curso).
    consolidar(colaboradorId, periodoId) {
      const asignadas = DB.evaluacionesDe(colaboradorId, periodoId);
      const conDatos = asignadas.filter(ev => Object.keys(ev.calificaciones.competencias).length > 0);
      if (!conDatos.length) return null;
      const resultados = conDatos.map(ev => DB.resultado(ev));
      return {
        colaboradorId, periodoId,
        evaluadores: asignadas.length,
        evaluadoresConDatos: conDatos.length,
        completas: asignadas.filter(e => ['Finalizada', 'Consolidada', 'Cerrada'].includes(e.estado)).length,
        resultadoCompetencias: round1(promedio(resultados.map(r => r.resultadoCompetencias))),
        resultadoComportamiento: round1(promedio(resultados.map(r => r.resultadoComportamiento))),
        resultadoGeneral: round1(promedio(resultados.map(r => r.resultadoGeneral))),
        reglaConsolidacion: 'Promedio simple entre evaluadores con calificación registrada'
      };
    },

    // Historial consolidado de un colaborador a través de todos los períodos (RF-17, RF-18)
    historialDe(colaboradorId) {
      return state.periodos
        .map(p => ({ periodo: p, consolidado: DB.consolidar(colaboradorId, p.id) }))
        .filter(h => h.consolidado);
    },

    // ---- catálogos CRUD genéricos (RF-02, RF-04, RF-05, RF-06, RF-08) ----
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
    DB, uid, clamp, round1, nivelPara, promedio,
    ESTADOS_EVALUACION, siguienteEstadoValido, calcResultado
  };

})(window);
