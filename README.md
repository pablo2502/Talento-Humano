# Sistema Integral de Evaluación por Competencias y Desempeño

Proyecto de Talento Humano construido a partir de tres documentos:
`Propuesta Talento Humano.docx`, `Requerimientos_Talento_Humano.docx`
(RF-01 a RF-28, RNF-01 a RNF-17) y `Diagramas_Talento_Humano.docx`
(casos de uso, flujo, estados y clases UML).

El proyecto tiene dos partes independientes:

```
Talento/
  frontend/   Prototipo web completo (HTML/CSS/JS), multi-rol, con datos de
              ejemplo — funciona sin instalar nada.
  backend/    Base de un backend real en Spring Boot (Java), con el mismo
              modelo de datos, lista para conectarse a una base de datos
              MySQL/PostgreSQL cuando el proyecto pase a producción.
```

Hoy **no están conectados entre sí**: el frontend simula su propia base de
datos en el navegador (ver más abajo) y el backend expone una API
independiente. Conectarlos es el siguiente paso natural del proyecto.

## Frontend (`frontend/`)

Prototipo funcional de los 5 roles definidos en RF-03 (Administrador,
Jefe/Evaluador, Gerente, Cliente/Evaluador externo, Colaborador), con
navegación, módulos y datos propios para cada uno:

- **Autenticación** por rol (RF-01), con accesos rápidos de demostración.
- **Administración**: usuarios, roles y permisos, perfiles de cargo,
  competencias, comportamientos, períodos (RF-02 a RF-08).
- **Evaluadores**: selección de colaboradores y asignación manual o
  automática por estructura organizacional (RF-09, RF-10, RF-28).
- **Realizar evaluación**: calificación por competencias/comportamientos con
  el ciclo de estados Pendiente → En proceso → Finalizada → Consolidada →
  Cerrada (RF-11 a RF-13, RF-27).
- **Resultados y consolidación** por evaluador y consolidados (RF-14 a
  RF-16).
- **Seguimiento** histórico entre períodos, con evolución y variación por
  competencia (RF-17, RF-18).
- **Informes** individual, por área y general, descargables en PDF (RF-19 a
  RF-21).
- **Búsqueda** avanzada con los filtros de RF-22.
- **Mi perfil** y **Dashboard** diferenciados por rol (RF-23, RF-24).
- **Recomendaciones de IA** como apoyo, nunca como fuente de verdad de los
  cálculos oficiales (RF-25, RNF-14, RNF-16).
- **Notificaciones** (RF-26).

No usa backend: los datos de ejemplo viven en `frontend/js/data.js` y se
persisten en `localStorage` del navegador para que los cambios sobrevivan a
un refresco de página. Bórralos con `TH.DB.resetDemo()` desde la consola del
navegador si quieres reiniciar la demo a sus valores originales.

### Cómo abrirlo

Los módulos usan `fetch`/rutas relativas, así que ábrelo con un servidor
local (no directamente como archivo `file://`):

```bash
cd frontend
python -m http.server 8891
```

Luego entra a `http://localhost:8891/login.html`. Usa cualquiera de los
accesos rápidos de demostración o, manualmente:

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | ana.torres@empresa.com | admin123 |
| Jefe / Evaluador | marta.gil@empresa.com | 123456 |
| Gerente | carlos.mendoza@empresa.com | 123456 |
| Cliente / Evaluador externo | roberto.vidal@clienteexterno.com | 123456 |
| Colaborador | laura.ramirez@empresa.com | 123456 |

### Estructura

```
frontend/
  login.html            Pantalla de acceso
  panel.html             Shell del panel (sidebar, topline, modal genérico)
  css/
    login.css
    panel.css            Sistema visual compartido por todos los módulos
  js/
    data.js               Base de datos simulada + reglas de negocio
                           (consolidación, estructura organizacional,
                           máquina de estados de evaluación)
    auth.js                Login / sesión
    ui.js                   Modal genérico, toasts, helpers de formato
    panel.js                 Navegación por rol y enrutador de módulos
    modules/
      dashboard.js, miperfil.js, notificaciones.js, usuarios.js, roles.js,
      perfiles.js, competencias.js, comportamientos.js, periodos.js,
      evaluadores.js, evaluaciones.js, resultados.js, seguimiento.js,
      informes.js, busqueda.js, ia.js   — un archivo por módulo del panel
  login.html.bak, panel.html.bak   Versión anterior (un solo rol), conservada
                                    de referencia — ya no se usa.
```

## Backend (`backend/`)

Base de un backend en Spring Boot con el mismo modelo de dominio (Usuario,
Rol, Perfil, Competencia, Comportamiento, Indicador, Período, Evaluación,
Resultado, Consolidación, Informe, Notificación), pensado para una futura
integración real. **No es una implementación completa de los 28
requerimientos** — es una base arquitectónica con CRUD real para un
subconjunto representativo de módulos y el resto marcado con `TODO`. Detalle
completo de qué está implementado, qué está en stub, y cómo ejecutarlo:
ver [`backend/README.md`](backend/README.md).

Arranque rápido (perfil `dev`, en memoria, sin instalar MySQL):

```bash
cd backend
./mvnw spring-boot:run      # o mvnw.cmd spring-boot:run en Windows
```

Swagger UI: `http://localhost:8080/swagger-ui.html`.

## Próximos pasos sugeridos

1. Conectar `frontend/js/data.js` a la API del backend (reemplazando las
   funciones de `TH.DB` por llamadas `fetch` autenticadas con JWT).
2. Completar los módulos marcados como TODO en el backend (informes en PDF
   real, IA real, búsqueda avanzada, asignación automática de evaluadores
   por organigrama real, reglas de autorización "solo veo lo mío").
3. Definir la fórmula oficial de ponderación de resultados si difiere del
   promedio simple usado hoy en ambos lados (60% competencias / 40%
   comportamiento a nivel de evaluación, promedio simple entre evaluadores
   para la consolidación).
