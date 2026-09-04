# Backend - Sistema Integral de Evaluacion por Competencias y Desempeno

Backend (skeleton/base) del sistema de evaluacion por competencias y desempeno,
construido con Spring Boot. Este proyecto **no es una implementacion completa
de los 28 requisitos funcionales**: es una base arquitectonica que demuestra
el modelo de dominio completo (entidades JPA + repositorios) y una
implementacion real de CRUD/flujos para un subconjunto representativo de
controladores, dejando el resto claramente marcado con `TODO` para que un
desarrollador futuro los complete.

## Stack tecnico

- Java 17
- Spring Boot 3.3.4
  - Spring Web (`spring-boot-starter-web`)
  - Spring Data JPA (`spring-boot-starter-data-jpa`)
  - Spring Security (`spring-boot-starter-security`)
  - Validation (`spring-boot-starter-validation`)
- Bases de datos: H2 (en memoria, perfil `dev`) y MySQL (`mysql-connector-j`, perfil `prod`)
- JWT: `io.jsonwebtoken` (jjwt) 0.11.5
- OpenAPI/Swagger UI: `springdoc-openapi-starter-webmvc-ui` 2.6.0
- Lombok
- Maven (con Maven Wrapper incluido)

## Como ejecutar

### Opcion A: Maven Wrapper (recomendado, no requiere Maven instalado)

Perfil `dev` (H2 en memoria, datos de demo precargados):

```bash
# Windows
mvnw.cmd spring-boot:run

# Git Bash / WSL / macOS / Linux
./mvnw spring-boot:run
```

La primera ejecucion de `mvnw`/`mvnw.cmd` descarga automaticamente el
distribuible de Maven (definido en `.mvn/wrapper/maven-wrapper.properties`) y
todas las dependencias del `pom.xml`; **requiere conexion a internet la
primera vez**. El jar del wrapper (`.mvn/wrapper/maven-wrapper.jar`) ya viene
incluido en el repositorio, asi que no hace falta descargarlo aparte.

Si no hay conexion a internet disponible, o `mvnw` falla por cualquier
motivo, abra la carpeta `backend/` directamente en **IntelliJ IDEA** (ya
instalado en esta maquina): IntelliJ detecta el `pom.xml` y resuelve/instala
Maven y las dependencias automaticamente, sin necesidad de la linea de
comandos.

Perfil `prod` (MySQL), con variables de entorno:

```bash
# Windows PowerShell
$env:DB_URL="jdbc:mysql://localhost:3306/talento_evaluacion"
$env:DB_USER="root"
$env:DB_PASSWORD="tu_password"
$env:JWT_SECRET="una-clave-secreta-base64-o-texto-de-al-menos-32-caracteres"
mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=prod"
```

```bash
# Bash
DB_URL="jdbc:mysql://localhost:3306/talento_evaluacion" \
DB_USER="root" \
DB_PASSWORD="tu_password" \
JWT_SECRET="una-clave-secreta-base64-o-texto-de-al-menos-32-caracteres" \
./mvnw spring-boot:run -Dspring-boot.run.profiles=prod
```

### Opcion B: IntelliJ IDEA

Abrir la carpeta `backend/` como proyecto Maven, dejar que IntelliJ importe
las dependencias, y ejecutar `EvaluacionDesempenoApplication` directamente
desde el IDE. Para elegir el perfil, editar la configuracion de ejecucion y
anadir `-Dspring-boot.run.profiles=dev` (o `prod`) en "VM options"/"Program
arguments" segun corresponda, o definir la variable de entorno
`SPRING_PROFILES_ACTIVE`.

## Documentacion interactiva (Swagger UI)

Con la app corriendo:

- Swagger UI: http://localhost:8080/swagger-ui.html
- OpenAPI JSON: http://localhost:8080/v3/api-docs
- Consola H2 (solo perfil `dev`): http://localhost:8080/h2-console
  (JDBC URL: `jdbc:h2:mem:talentodb`, usuario `sa`, password vacio)

## Autenticacion

`POST /api/v1/auth/login` con `{ "correo": "...", "password": "..." }`
devuelve un JWT (`Authorization: Bearer <token>` en las siguientes
peticiones). El perfil `dev` precarga estos usuarios de demo (contrasena
`Talento123!` para todos):

| Correo | Rol |
|---|---|
| admin@talento.com | ADMINISTRADOR |
| jefe@talento.com | JEFE_EVALUADOR |
| gerente@talento.com | GERENTE |
| cliente@talento.com | CLIENTE_EVALUADOR |
| colaborador@talento.com | COLABORADOR |

## Layout de paquetes

```
src/main/java/com/talentohumano/evaluacion/
  EvaluacionDesempenoApplication.java   Clase principal
  entity/            Entidades JPA (Rol, Usuario, Perfil, Competencia,
                      Comportamiento, Indicador, Periodo, Evaluacion,
                      EvaluacionCompetencia, EvaluacionComportamiento,
                      Resultado, Consolidacion, Informe, Notificacion)
  entity/enums/       Enumeraciones (EstadoUsuario, EstadoPeriodo,
                      EstadoEvaluacion, EstadoRegistro, TipoInforme)
  repository/         Repositorios Spring Data JPA (uno por entidad)
  dto/                DTOs de request/response por dominio (nunca se
                      exponen entidades directamente en los controladores)
  service/            Logica de negocio (CRUD, maquina de estados de
                      Evaluacion, consolidacion, asignacion de evaluador,
                      autenticacion)
  controller/         Controladores REST bajo /api/v1/...
  security/           JWT (emision/validacion), filtro de autenticacion,
                      configuracion de Spring Security, UserDetailsService
  config/             OpenAPI/Swagger, CORS, siembra de datos de demo
  exception/          Manejo global de excepciones (ApiError estandar)
```

## Que esta completamente implementado

CRUD real (persistencia, validacion, DTOs propios, manejo de errores) para:

- **AuthController** - login + emision de JWT (RF-01)
- **UsuarioController** - CRUD de usuarios (RF-02)
- **RolController** - CRUD de roles (RF-03)
- **PerfilController** - CRUD de perfiles de cargo, con competencias/comportamientos asociados (RF-04)
- **CompetenciaController** - CRUD de competencias (RF-05)
- **ComportamientoController** - CRUD de comportamientos (RF-06)
- **IndicadorController** - CRUD de indicadores, con validacion de negocio "pertenece a exactamente una Competencia o un Comportamiento" (bonus, completa el modelo de dominio)
- **PeriodoController** - CRUD + `activar`/`cerrar` (RF-08)
- **EvaluacionController** - creacion (con intento de asignacion automatica de evaluador), registro de calificaciones, listado por periodo/colaborador/evaluador, y transicion de estado forzando el orden PENDIENTE -> EN_PROCESO -> FINALIZADA -> CONSOLIDADA -> CERRADA (RF-09 a RF-13, RF-27)
- **ResultadoController** - calculo (promedio simple) y consulta de resultados por evaluacion (RF-14, RF-16)
- **ConsolidacionController** - consolidacion (promedio simple) de resultados de todos los evaluadores de un colaborador en un periodo (RF-15)
- **NotificacionController** - listado por usuario (con filtro de no leidas) y marcar como leida (RF-26); las evaluaciones creadas generan automaticamente una notificacion al evaluador asignado

Seguridad: JWT + BCrypt + Spring Security con reglas de acceso basicas por
rol (ADMINISTRADOR con acceso total a administracion de usuarios/roles;
GERENTE con acceso a catalogos/perfiles/periodos; el resto de endpoints
requieren solo estar autenticado).

## Que esta en STUB / TODO (para un desarrollador futuro)

Todos estos endpoints estan **conectados y responden** (no son 404), pero su
logica de negocio real esta pendiente. Cada uno tiene un comentario `TODO`
en el codigo explicando que falta:

- **InformeController / InformeService** (RF-19 a RF-21): persiste metadata
  del informe pero NO genera un PDF/documento real. TODO: integrar una
  libreria como OpenPDF o iText y almacenamiento de archivos.
- **IaController / IaService** (RF-25): devuelve una estructura de
  recomendaciones "placeholder". TODO: integrar un proveedor de IA real.
  **Importante**: por RNF-14/RNF-16, la IA debe seguir siendo siempre
  consultiva/orientativa, nunca la fuente de verdad de una calificacion.
- **BusquedaController** (RF-22): solo filtra Usuario por nombre parcial
  y/o estado exacto. TODO: extender a busqueda combinada sobre
  Evaluacion/Resultado/Perfil con mas criterios.
- **AsignacionEvaluadorService** (usado por RF-09): mock simple tipo
  "primer usuario activo con el Rol correspondiente al tipoEvaluador
  solicitado". TODO: reemplazar por logica real derivada del organigrama
  (jefe directo, gerente de area, clientes configurados por proyecto).
- **ResultadoService / ConsolidacionService** (RF-14, RF-15): usan
  **promedio aritmetico simple**. TODO: sustituir por la formula oficial de
  ponderacion (p.ej. pesos distintos por competencia/comportamiento, o por
  tipo de evaluador) una vez este definida por el negocio.
- Reglas de autorizacion "solo veo lo mio" (p.ej. un COLABORADOR solo
  deberia ver sus propias evaluaciones/resultados/notificaciones): hoy la
  mayoria de endpoints de operacion solo exigen estar autenticado, sin
  filtrar por identidad del usuario logueado. TODO: anadir esa
  comprobacion en cada servicio (comparando el usuario del JWT contra
  `colaboradorId`/`usuarioId` del recurso solicitado).

## Que NO se implemento (fuera de alcance de este skeleton)

- Migraciones de esquema con Flyway/Liquibase (se usa `ddl-auto: update` en
  ambos perfiles como conveniencia de skeleton; en produccion real esto
  deberia reemplazarse por migraciones versionadas).
- Tests de integracion por controlador (solo hay un test de humo que
  verifica que el contexto de Spring levanta).
- Paginacion/ordenamiento en los listados (todos los `listar()` devuelven
  la lista completa; aceptable para un skeleton, pero no para produccion
  con volumenes grandes de datos).

## Notas de diseno

- Los DTOs (`dto/`) nunca exponen entidades JPA directamente: cada
  controlador recibe/devuelve records de `dto/`, y el mapeo entidad<->DTO
  vive en el servicio correspondiente.
- La transicion de estado de `Evaluacion` se valida comparando
  `ordinal()` en el enum `EstadoEvaluacion` (declarado en el orden valido
  de avance), y solo permite avanzar exactamente un paso a la vez -- ver
  `EvaluacionService.cambiarEstado`.
- La regla "un Indicador pertenece a exactamente una Competencia o a
  exactamente un Comportamiento" se valida en `IndicadorService`, no como
  constraint de base de datos (un CHECK de "exactamente una FK no nula" es
  especifico de motor y fragil frente a JPA/Hibernate genericos).
