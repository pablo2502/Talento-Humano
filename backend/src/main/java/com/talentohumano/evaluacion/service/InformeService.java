package com.talentohumano.evaluacion.service;

import com.talentohumano.evaluacion.dto.informe.InformeRequest;
import com.talentohumano.evaluacion.dto.informe.InformeResponse;
import com.talentohumano.evaluacion.entity.Consolidacion;
import com.talentohumano.evaluacion.entity.Evaluacion;
import com.talentohumano.evaluacion.entity.EvaluacionCompetencia;
import com.talentohumano.evaluacion.entity.Informe;
import com.talentohumano.evaluacion.entity.Periodo;
import com.talentohumano.evaluacion.entity.Usuario;
import com.talentohumano.evaluacion.entity.enums.EstadoEvaluacion;
import com.talentohumano.evaluacion.entity.enums.EstadoPeriodo;
import com.talentohumano.evaluacion.entity.enums.TipoInforme;
import com.talentohumano.evaluacion.exception.BusinessException;
import com.talentohumano.evaluacion.exception.ResourceNotFoundException;
import com.talentohumano.evaluacion.repository.ConsolidacionRepository;
import com.talentohumano.evaluacion.repository.EvaluacionCompetenciaRepository;
import com.talentohumano.evaluacion.repository.EvaluacionRepository;
import com.talentohumano.evaluacion.repository.InformeRepository;
import com.talentohumano.evaluacion.repository.PeriodoRepository;
import com.talentohumano.evaluacion.repository.UsuarioRepository;
import com.talentohumano.evaluacion.service.pdf.InformePdfData;
import com.talentohumano.evaluacion.service.pdf.InformePdfRenderer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Generacion de informes (individual/area/general). RF-19 a RF-21.
 * <p>
 * Cada informe se renderiza con la plantilla unica "Perfil de competencias"
 * (ver {@link InformePdfRenderer} y Documentos/Plantilla Formato pdf.docx en
 * la raiz del proyecto). Lo que cambia segun {@link TipoInforme} es
 * exclusivamente el contenido armado aqui: el colaborador/area/organizacion
 * de referencia, los puntajes de competencia promediados sobre ese alcance,
 * y las acciones del plan de desarrollo.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class InformeService {

    private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final BigDecimal ESCALA_MAXIMA = BigDecimal.valueOf(5);

    private final InformeRepository informeRepository;
    private final UsuarioService usuarioService;
    private final UsuarioRepository usuarioRepository;
    private final PeriodoRepository periodoRepository;
    private final EvaluacionRepository evaluacionRepository;
    private final EvaluacionCompetenciaRepository evaluacionCompetenciaRepository;
    private final ConsolidacionRepository consolidacionRepository;
    private final InformePdfRenderer informePdfRenderer;

    public List<InformeResponse> listar() {
        return informeRepository.findAll().stream().map(this::toResponse).toList();
    }

    public InformeResponse obtener(Long id) {
        Informe informe = buscarEntidad(id);
        return toResponse(informe);
    }

    public InformeService.InformeArchivo descargar(Long id) {
        Informe informe = buscarEntidad(id);
        if (informe.getContenidoPdf() == null) {
            throw new BusinessException("El informe " + id + " no tiene un archivo PDF generado");
        }
        String nombre = "informe-" + informe.getTipo().name().toLowerCase() + "-" + informe.getId() + ".pdf";
        return new InformeArchivo(informe.getContenidoPdf(), nombre);
    }

    public InformeResponse generar(InformeRequest request) {
        validarReferencia(request);

        Usuario colaborador = request.colaboradorId() != null ? usuarioService.buscarEntidad(request.colaboradorId()) : null;
        Periodo periodo = resolverPeriodo(request.periodoId());

        InformePdfData data = switch (request.tipo()) {
            case INDIVIDUAL -> datosIndividual(colaborador, periodo);
            case AREA -> datosArea(request.area(), periodo);
            case GENERAL -> datosGeneral(periodo);
        };
        byte[] pdf = informePdfRenderer.render(data);

        Informe informe = Informe.builder()
                .tipo(request.tipo())
                .formato(request.formato())
                .fechaGeneracion(java.time.LocalDateTime.now())
                .colaborador(colaborador)
                .area(request.area())
                .periodo(periodo)
                .contenidoPdf(pdf)
                .build();
        Informe guardado = informeRepository.save(informe);

        return toResponse(guardado);
    }

    private Informe buscarEntidad(Long id) {
        return informeRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Informe", id));
    }

    private void validarReferencia(InformeRequest request) {
        if (request.tipo() == TipoInforme.INDIVIDUAL && request.colaboradorId() == null) {
            throw new BusinessException("Un informe INDIVIDUAL requiere colaboradorId");
        }
        if (request.tipo() == TipoInforme.AREA && (request.area() == null || request.area().isBlank())) {
            throw new BusinessException("Un informe AREA requiere el campo area");
        }
    }

    private Periodo resolverPeriodo(Long periodoId) {
        if (periodoId != null) {
            return periodoRepository.findById(periodoId)
                    .orElseThrow(() -> ResourceNotFoundException.of("Periodo", periodoId));
        }
        List<Periodo> activos = periodoRepository.findByEstado(EstadoPeriodo.ACTIVO);
        if (!activos.isEmpty()) {
            return activos.get(0);
        }
        return periodoRepository.findAll().stream()
                .max(Comparator.comparing(Periodo::getFechaFin))
                .orElseThrow(() -> new BusinessException("No hay periodos configurados para generar el informe"));
    }

    // -------------------------------------------------------------------
    // Calculo de contenido por tipo de informe
    // -------------------------------------------------------------------

    private InformePdfData datosIndividual(Usuario colaborador, Periodo periodo) {
        List<Evaluacion> evaluaciones = evaluacionesFinalizadas(
                evaluacionRepository.findByColaboradorIdAndPeriodoId(colaborador.getId(), periodo.getId()));

        List<InformePdfData.PuntajeCompetencia> competencias = promedioCompetencias(evaluaciones);
        BigDecimal resultado = consolidacionRepository.findByColaboradorIdAndPeriodoId(colaborador.getId(), periodo.getId())
                .map(Consolidacion::getResultadoConsolidado)
                .orElseGet(() -> promedioGeneral(competencias));

        String cargo = colaborador.getPerfil() != null ? colaborador.getPerfil().getCargo() : "Sin perfil asignado";
        List<InformePdfData.CampoInfo> campos = List.of(
                new InformePdfData.CampoInfo("Colaborador", colaborador.getNombre()),
                new InformePdfData.CampoInfo("Cargo", cargo),
                new InformePdfData.CampoInfo("Periodo", periodo.getNombre()),
                new InformePdfData.CampoInfo("Nivel", nivelDesde(resultado))
        );

        List<InformePdfData.AccionPlan> plan = planIndividual(colaborador, competencias, periodo);

        return new InformePdfData(
                "Perfil de competencias",
                "Evaluacion de desempeno - " + periodo.getNombre(),
                campos,
                competencias,
                plan
        );
    }

    private InformePdfData datosArea(String area, Periodo periodo) {
        List<Usuario> colaboradoresArea = usuarioRepository.findAll().stream()
                .filter(u -> u.getPerfil() != null && area.equalsIgnoreCase(u.getPerfil().getArea()))
                .toList();

        List<Evaluacion> evaluaciones = colaboradoresArea.stream()
                .flatMap(u -> evaluacionesFinalizadas(
                        evaluacionRepository.findByColaboradorIdAndPeriodoId(u.getId(), periodo.getId())).stream())
                .toList();

        List<InformePdfData.PuntajeCompetencia> competencias = promedioCompetencias(evaluaciones);
        BigDecimal resultado = promedioGeneral(competencias);

        long colaboradoresEvaluados = evaluaciones.stream().map(e -> e.getColaborador().getId()).distinct().count();

        List<InformePdfData.CampoInfo> campos = List.of(
                new InformePdfData.CampoInfo("Area", area),
                new InformePdfData.CampoInfo("Colaboradores evaluados", String.valueOf(colaboradoresEvaluados)),
                new InformePdfData.CampoInfo("Periodo", periodo.getNombre()),
                new InformePdfData.CampoInfo("Nivel promedio", nivelDesde(resultado))
        );

        List<InformePdfData.AccionPlan> plan = planAgregado(competencias, periodo, "Lider de area", "Gestion Humana");

        return new InformePdfData(
                "Informe de area: " + area,
                "Evaluacion de desempeno - " + periodo.getNombre(),
                campos,
                competencias,
                plan
        );
    }

    private InformePdfData datosGeneral(Periodo periodo) {
        List<Evaluacion> evaluaciones = evaluacionesFinalizadas(evaluacionRepository.findByPeriodoId(periodo.getId()));

        List<InformePdfData.PuntajeCompetencia> competencias = promedioCompetencias(evaluaciones);
        BigDecimal resultado = promedioGeneral(competencias);

        long colaboradoresEvaluados = evaluaciones.stream().map(e -> e.getColaborador().getId()).distinct().count();

        List<InformePdfData.CampoInfo> campos = List.of(
                new InformePdfData.CampoInfo("Organizacion", "Todas las areas"),
                new InformePdfData.CampoInfo("Colaboradores evaluados", String.valueOf(colaboradoresEvaluados)),
                new InformePdfData.CampoInfo("Periodo", periodo.getNombre()),
                new InformePdfData.CampoInfo("Nivel promedio", nivelDesde(resultado))
        );

        List<InformePdfData.AccionPlan> plan = planAgregado(competencias, periodo, "Direccion de area", "Gestion Humana");

        return new InformePdfData(
                "Informe general de desempeno",
                "Evaluacion de desempeno - " + periodo.getNombre(),
                campos,
                competencias,
                plan
        );
    }

    // -------------------------------------------------------------------
    // Helpers de calculo
    // -------------------------------------------------------------------

    private List<Evaluacion> evaluacionesFinalizadas(List<Evaluacion> evaluaciones) {
        return evaluaciones.stream()
                .filter(e -> e.getEstado().ordinal() >= EstadoEvaluacion.FINALIZADA.ordinal())
                .toList();
    }

    private List<InformePdfData.PuntajeCompetencia> promedioCompetencias(List<Evaluacion> evaluaciones) {
        Map<String, List<BigDecimal>> porCompetencia = new LinkedHashMap<>();
        for (Evaluacion evaluacion : evaluaciones) {
            for (EvaluacionCompetencia ec : evaluacionCompetenciaRepository.findByEvaluacionId(evaluacion.getId())) {
                porCompetencia.computeIfAbsent(ec.getCompetencia().getNombre(), k -> new ArrayList<>())
                        .add(ec.getCalificacion());
            }
        }
        List<InformePdfData.PuntajeCompetencia> resultado = new ArrayList<>();
        porCompetencia.forEach((nombre, calificaciones) -> {
            BigDecimal promedio = promedio(calificaciones);
            resultado.add(new InformePdfData.PuntajeCompetencia(nombre, promedio.doubleValue()));
        });
        return resultado;
    }

    private BigDecimal promedio(List<BigDecimal> valores) {
        if (valores.isEmpty()) {
            return BigDecimal.ZERO;
        }
        BigDecimal suma = valores.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return suma.divide(BigDecimal.valueOf(valores.size()), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal promedioGeneral(List<InformePdfData.PuntajeCompetencia> competencias) {
        if (competencias.isEmpty()) {
            return null;
        }
        double promedio = competencias.stream().mapToDouble(InformePdfData.PuntajeCompetencia::puntaje).average().orElse(0);
        return BigDecimal.valueOf(promedio).setScale(2, RoundingMode.HALF_UP);
    }

    private String nivelDesde(BigDecimal resultado) {
        if (resultado == null) {
            return "Sin datos";
        }
        double valor = resultado.doubleValue();
        if (valor >= 4.5) {
            return "Excelente";
        }
        if (valor >= 4.0) {
            return "Bueno";
        }
        if (valor >= 3.0) {
            return "Regular";
        }
        return "Bajo desempeno";
    }

    private List<InformePdfData.AccionPlan> planIndividual(Usuario colaborador,
                                                             List<InformePdfData.PuntajeCompetencia> competencias,
                                                             Periodo periodo) {
        if (competencias.isEmpty()) {
            return List.of();
        }
        InformePdfData.PuntajeCompetencia masBaja = competencias.stream()
                .min(Comparator.comparingDouble(InformePdfData.PuntajeCompetencia::puntaje))
                .orElseThrow();
        LocalDate base = periodo.getFechaFin();
        return List.of(
                new InformePdfData.AccionPlan(
                        "Fortalecer la competencia \"" + masBaja.nombre() + "\"",
                        colaborador.getNombre(),
                        base.plusDays(30).format(FORMATO_FECHA)),
                new InformePdfData.AccionPlan(
                        "Acompanamiento y mentoria con el jefe inmediato",
                        "Jefe inmediato",
                        base.plusDays(60).format(FORMATO_FECHA)),
                new InformePdfData.AccionPlan(
                        "Curso o actividad de formacion para el proximo periodo",
                        "Gestion Humana",
                        base.plusDays(90).format(FORMATO_FECHA))
        );
    }

    private List<InformePdfData.AccionPlan> planAgregado(List<InformePdfData.PuntajeCompetencia> competencias,
                                                           Periodo periodo, String responsablePrincipal,
                                                           String responsableFormacion) {
        if (competencias.isEmpty()) {
            return List.of();
        }
        LocalDate base = periodo.getFechaFin();
        List<InformePdfData.PuntajeCompetencia> masBajas = competencias.stream()
                .sorted(Comparator.comparingDouble(InformePdfData.PuntajeCompetencia::puntaje))
                .limit(2)
                .toList();

        List<InformePdfData.AccionPlan> plan = new ArrayList<>();
        for (InformePdfData.PuntajeCompetencia c : masBajas) {
            plan.add(new InformePdfData.AccionPlan(
                    "Reforzar la competencia \"" + c.nombre() + "\" en el equipo",
                    responsablePrincipal,
                    base.plusDays(45).format(FORMATO_FECHA)));
        }
        plan.add(new InformePdfData.AccionPlan(
                "Plan de formacion para el proximo periodo",
                responsableFormacion,
                base.plusDays(90).format(FORMATO_FECHA)));
        return plan;
    }

    private InformeResponse toResponse(Informe informe) {
        String urlDescarga = "/api/v1/informes/" + informe.getId() + "/descargar";
        return new InformeResponse(
                informe.getId(),
                informe.getTipo(),
                informe.getFormato(),
                informe.getFechaGeneracion(),
                informe.getColaborador() != null ? informe.getColaborador().getId() : null,
                informe.getArea(),
                informe.getPeriodo() != null ? informe.getPeriodo().getId() : null,
                urlDescarga
        );
    }

    public record InformeArchivo(byte[] contenido, String nombreArchivo) {
    }
}
