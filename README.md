# Sistema Integral de Evaluación por Competencias y Desempeño

Proyecto de Talento Humano construido a partir de:

- `Propuesta Talento Humano.docx` y `Requerimientos_Talento_Humano.docx`
  (RF-01 a RF-28, RNF-01 a RNF-17) — alcance funcional general.
- `Diagramas_Talento_Humano.docx` — casos de uso, flujo, estados y clases UML.
- `AJUSTE_DE_COMPETENCIAS_2025_360_COMPORTAMIENTOS...xlsx` — el **diccionario
  real de competencias 360°** de la institución de origen: 5 competencias
  institucionales + competencias específicas por nivel de cargo (Estratégico
  / Táctico / Apoyo) + una competencia transversal de SST, cada indicador con
  una redacción de comportamiento distinta según quién evalúa (Autoevaluación
  / Jefe / Par / Subalterno) y la fórmula real de ponderación 360°.

El frontend está construido **fiel a ese diccionario real** (ver
`frontend/js/data/competencias.js`, generado directamente de ese Excel), en
lugar del modelo de evaluadores genérico (Jefe/Gerente/Cliente) descrito en
el documento de requerimientos original.

> **Nota sobre datos personales**: el archivo `BASE EVALUACION DE
> DESEMPEÑO...xlsx` que acompaña al diccionario de competencias contiene la
> planta real de personal (152 personas, con nombre completo y cédula) y su
> histórico de retiros. Esos datos **no se usaron**: el roster de personas de
> este proyecto es ficticio (nombres inventados), aunque conserva los mismos
> cargos reales y la misma proporción real de niveles de cargo (15
> Estratégico / 89 Táctico / 48 Apoyo → escalado a una muestra de 13
> personas). Esto evita publicar información personal identificable de
> personas reales en un repositorio público, y es coherente con el propio
> RNF-17 del proyecto (Ley 1581 de 2012).

El proyecto tiene dos partes:

```
Talento/
  frontend/   Prototipo web completo (HTML/CSS/JS), con datos de ejemplo —
              funciona sin instalar nada.
  backend/    Base de un backend en Spring Boot (Java) con un modelo de
              dominio genérico (RF-02 a RF-21) construido ANTES de recibir
              el diccionario de competencias real — ver nota más abajo.
```

Hoy **no están conectados entre sí** y **su modelo de datos ya no coincide
del todo**: el frontend fue reconstruido sobre el diccionario 360° real
(Autoevaluación/Jefe/Par/Subalterno + SST, niveles de cargo Estratégico/
Táctico/Apoyo), mientras que el backend sigue modelando el esquema genérico
original (Jefe/Gerente/Cliente) del documento de requerimientos. Alinear el
backend a este mismo modelo real es el siguiente paso pendiente (ver
"Próximos pasos").

## Frontend (`frontend/`)

Prototipo funcional con dos roles de acceso al sistema — **Administrador**
(gestión) y **Colaborador** (todos los demás) — donde cada colaborador
se autoevalúa y evalúa 360° a quien corresponda según su lugar real en el
organigrama (jefe inmediato, pares que comparten su mismo jefe, y personas
a su cargo si las tiene):

- **Autenticación** (RF-01), con accesos rápidos de demostración que cubren
  distintos escenarios: alguien en la cima sin jefe, un mando medio con
  pares y subalternos, y una persona base sin equipo a cargo.
- **Administración**: usuarios, roles y permisos, perfiles de cargo (con su
  nivel Estratégico/Táctico/Apoyo), catálogo real de competencias e
  indicadores, comportamientos por tipo de evaluador, períodos (RF-02 a
  RF-08).
- **Asignación 360°**: las evaluaciones se generan automáticamente al
  activar un período, a partir de la estructura organizacional — no se
  asignan a mano (RF-09, RF-10, RF-28).
- **Realizar evaluación**: calificación 1-5 con descriptor (No cumple →
  Sobresale) o "No observado" por indicador, con el ciclo de estados
  Pendiente → En proceso → Finalizada → Consolidada → Cerrada (RF-11 a
  RF-13, RF-27).
- **Resultados y consolidación**: por tipo de evaluador y consolidado con la
  fórmula de ponderación real — Jefe 45% / Par 18% / Auto 18% / Subalterno
  9% + SST 10% (Estratégico y Táctico); Jefe 54% / Par 18% / Auto 18% + SST
  10% (Apoyo, sin personal a cargo) (RF-14 a RF-16).
- **Seguimiento** histórico entre períodos, con indicadores de mayor
  crecimiento/disminución (RF-17, RF-18).
- **Informes** individual, de equipo/área y general, en PDF (RF-19 a RF-21).
- **Búsqueda** avanzada (RF-22).
- **Mi perfil** (con tu jefe, pares y subalternos) y **Dashboard**
  diferenciados por rol (RF-23, RF-24).
- **Recomendaciones de IA** como apoyo, nunca como fuente de verdad de los
  cálculos oficiales (RF-25, RNF-14, RNF-16).
- **Notificaciones** (RF-26).

No usa backend: los datos viven en `frontend/js/data.js` (+ el diccionario
de competencias en `frontend/js/data/competencias.js`) y se persisten en
`localStorage` del navegador para que los cambios sobrevivan a un refresco
de página. Bórralos con `TH.DB.resetDemo()` desde la consola del navegador
si quieres reiniciar la demo a sus valores originales.

### Cómo abrirlo

Los módulos usan rutas relativas, así que ábrelo con un servidor local (no
directamente como archivo `file://`):

```bash
cd frontend
python -m http.server 8891
```

Luego entra a `http://localhost:8891/login.html`. Usa cualquiera de los
accesos rápidos de demostración o, manualmente:

| Escenario | Correo | Contraseña |
|---|---|---|
| Administrador | ana.torres@empresa.com | admin123 |
| Rector — cima, sin jefe | fernando.restrepo@empresa.com | 123456 |
| Jefe de Tecnología — con pares y subalternos | camilo.serrano@empresa.com | 123456 |
| Coordinador de Comunicaciones — con pares y subalternos | sandra.beltran@empresa.com | 123456 |
| Técnico en Sistemas — base, sin equipo a cargo | daniela.rojas@empresa.com | 123456 |

### Estructura

```
frontend/
  login.html            Pantalla de acceso
  panel.html             Shell del panel (sidebar, topline, modal genérico)
  css/
    login.css
    panel.css            Sistema visual compartido por todos los módulos
  js/
    data/
      competencias.js      Diccionario real de competencias 360° — generado
                            a partir de AJUSTE_DE_COMPETENCIAS_2025...xlsx,
                            no editar a mano (ver script de extracción abajo)
    data.js                Base de datos simulada + reglas de negocio
                            (pesos 360°, estructura organizacional,
                            consolidación, máquina de estados)
    auth.js                Login / sesión
    ui.js                  Modal genérico, toasts, helpers de formato
    panel.js               Navegación por rol y enrutador de módulos
    modules/
      dashboard.js, miperfil.js, notificaciones.js, usuarios.js, roles.js,
      perfiles.js, competencias.js, comportamientos.js, periodos.js,
      evaluadores.js, evaluaciones.js, resultados.js, seguimiento.js,
      informes.js, busqueda.js, ia.js   — un archivo por módulo del panel
  login.html.bak, panel.html.bak   Versión aún anterior (un solo rol
                                    genérico), conservada de referencia.
```

`frontend/js/data/competencias.js` se generó con un script de extracción
(openpyxl) a partir de las hojas `CARGA_SOFTWARE` y `Comp. SST.` del Excel
de ajuste de competencias; si ese Excel cambia, hay que volver a extraerlo
en lugar de editar el `.js` a mano.

## Backend (`backend/`)

Base de un backend en Spring Boot con el modelo de dominio **genérico**
descrito en el documento de requerimientos original (Usuario, Rol, Perfil,
Competencia, Comportamiento, Indicador, Período, Evaluación con
Jefe/Gerente/Cliente, Resultado, Consolidación, Informe, Notificación) —
construido antes de recibir el diccionario de competencias 360° real, por lo
que **su esquema ya no coincide exactamente** con el del frontend actual
(Autoevaluación/Jefe/Par/Subalterno + SST, niveles Estratégico/Táctico/
Apoyo). Sigue siendo útil como base arquitectónica (JWT, CRUD por capas,
máquina de estados, Swagger) pero su dominio necesita el mismo ajuste 360°
que se le hizo al frontend antes de conectarlos. Detalle completo de qué
está implementado, qué está en stub, y cómo ejecutarlo: ver
[`backend/README.md`](backend/README.md).

Arranque rápido (perfil `dev`, en memoria, sin instalar MySQL):

```bash
cd backend
./mvnw spring-boot:run      # o mvnw.cmd spring-boot:run en Windows
```

Swagger UI: `http://localhost:8080/swagger-ui.html`.

## Próximos pasos sugeridos

1. Ajustar el modelo de dominio del backend al esquema 360° real
   (Autoevaluación/Jefe/Par/Subalterno + SST, niveles de cargo
   Estratégico/Táctico/Apoyo, pesos de consolidación por nivel) para que
   coincida con `frontend/js/data.js`.
2. Conectar `frontend/js/data.js` a la API del backend (reemplazando las
   funciones de `TH.DB` por llamadas `fetch` autenticadas con JWT).
3. Completar los módulos marcados como TODO en el backend (informes en PDF
   real, IA real, búsqueda avanzada, asignación automática de evaluadores
   por organigrama real, reglas de autorización "solo veo lo mío").
4. Si en algún momento se necesita cargar la planta de personal real, hacerlo
   directamente contra una base de datos privada (nunca en el repositorio ni
   en el código fuente), respetando la Ley 1581 de 2012 (RNF-17).
