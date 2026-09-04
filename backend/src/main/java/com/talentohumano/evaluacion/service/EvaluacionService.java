package com.talentohumano.evaluacion.service;

import com.talentohumano.evaluacion.dto.evaluacion.CalificacionesRequest;
import com.talentohumano.evaluacion.dto.evaluacion.EvaluacionRequest;
import com.talentohumano.evaluacion.dto.evaluacion.EvaluacionResponse;
import com.talentohumano.evaluacion.entity.Competencia;
import com.talentohumano.evaluacion.entity.Comportamiento;
import com.talentohumano.evaluacion.entity.Evaluacion;
import com.talentohumano.evaluacion.entity.EvaluacionCompetencia;
import com.talentohumano.evaluacion.entity.EvaluacionComportamiento;
import com.talentohumano.evaluacion.entity.Periodo;
import com.talentohumano.evaluacion.entity.Usuario;
import com.talentohumano.evaluacion.entity.enums.EstadoEvaluacion;
import com.talentohumano.evaluacion.entity.enums.EstadoPeriodo;
import com.talentohumano.evaluacion.exception.BusinessException;
import com.talentohumano.evaluacion.exception.ResourceNotFoundException;
import com.talentohumano.evaluacion.repository.EvaluacionCompetenciaRepository;
import com.talentohumano.evaluacion.repository.EvaluacionComportamientoRepository;
import com.talentohumano.evaluacion.repository.EvaluacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Ciclo de vida de las Evaluaciones: creacion, registro de calificaciones y
 * transicion de estado. RF-09 a RF-13, RF-27.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class EvaluacionService {

    private final EvaluacionRepository evaluacionRepository;
    private final EvaluacionCompetenciaRepository evaluacionCompetenciaRepository;
    private final EvaluacionComportamientoRepository evaluacionComportamientoRepository;
    private final UsuarioService usuarioService;
    private final PeriodoService periodoService;
    private final CompetenciaService competenciaService;
    private final ComportamientoService comportamientoService;
    private final AsignacionEvaluadorService asignacionEvaluadorService;
    private final ResultadoService resultadoService;
    private final NotificacionService notificacionService;

    public List<EvaluacionResponse> listarPorPeriodo(Long periodoId) {
        return evaluacionRepository.findByPeriodoId(periodoId).stream().map(this::toResponse).toList();
    }

    public List<EvaluacionResponse> listarPorColaborador(Long colaboradorId) {
        return evaluacionRepository.findByColaboradorId(colaboradorId).stream().map(this::toResponse).toList();
    }

    public List<EvaluacionResponse> listarPorEvaluador(Long evaluadorId) {
        return evaluacionRepository.findByEvaluadorId(evaluadorId).stream().map(this::toResponse).toList();
    }

    public EvaluacionResponse obtener(Long id) {
        return toResponse(buscarEntidad(id));
    }

    public Evaluacion buscarEntidad(Long id) {
        return evaluacionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Evaluacion", id));
    }

    public EvaluacionResponse crear(EvaluacionRequest request) {
        Periodo periodo = periodoService.buscarEntidad(request.periodoId());
        if (periodo.getEstado() != EstadoPeriodo.ACTIVO) {
            throw new BusinessException("No se pueden crear evaluaciones en un periodo que no esta ACTIVO");
        }
        Usuario colaborador = usuarioService.buscarEntidad(request.colaboradorId());

        Usuario evaluador;
        if (request.evaluadorId() != null) {
            evaluador = usuarioService.buscarEntidad(request.evaluadorId());
        } else {
            evaluador = asignacionEvaluadorService.sugerirEvaluador(colaborador, request.tipoEvaluador())
                    .orElseThrow(() -> new BusinessException(
                            "No se pudo asignar automaticamente un evaluador de tipo " + request.tipoEvaluador()
                                    + "; especifique evaluadorId manualmente"));
        }

        Evaluacion evaluacion = Evaluacion.builder()
                .periodo(periodo)
                .colaborador(colaborador)
                .evaluador(evaluador)
                .tipoEvaluador(request.tipoEvaluador())
                .estado(EstadoEvaluacion.PENDIENTE)
                .fecha(request.fecha() != null ? request.fecha() : LocalDate.now())
                .build();
        Evaluacion guardada = evaluacionRepository.save(evaluacion);

        notificacionService.notificar(evaluador, "EVALUACION_ASIGNADA",
                "Se le ha asignado una evaluacion pendiente para " + colaborador.getNombre()
                        + " en el periodo " + periodo.getNombre());

        return toResponse(guardada);
    }

    /**
     * Registra/actualiza las calificaciones de competencias y comportamientos
     * de una evaluacion. Solo permitido mientras la evaluacion este en
     * PENDIENTE o EN_PROCESO; al guardar la primera calificacion la
     * evaluacion pasa automaticamente a EN_PROCESO. RF-10 a RF-12.
     */
    public EvaluacionResponse registrarCalificaciones(Long evaluacionId, CalificacionesRequest request) {
        Evaluacion evaluacion = buscarEntidad(evaluacionId);
        if (evaluacion.getEstado() != EstadoEvaluacion.PENDIENTE && evaluacion.getEstado() != EstadoEvaluacion.EN_PROCESO) {
            throw new BusinessException(
                    "Solo se pueden registrar calificaciones en evaluaciones PENDIENTE o EN_PROCESO (estado actual: "
                            + evaluacion.getEstado() + ")");
        }

        if (request.competencias() != null) {
            for (CalificacionesRequest.ItemCalificado item : request.competencias()) {
                Competencia competencia = competenciaService.buscarEntidad(item.id());
                EvaluacionCompetencia ec = EvaluacionCompetencia.builder()
                        .evaluacion(evaluacion)
                        .competencia(competencia)
                        .calificacion(item.calificacion())
                        .build();
                evaluacionCompetenciaRepository.save(ec);
            }
        }
        if (request.comportamientos() != null) {
            for (CalificacionesRequest.ItemCalificado item : request.comportamientos()) {
                Comportamiento comportamiento = comportamientoService.buscarEntidad(item.id());
                EvaluacionComportamiento ec = EvaluacionComportamiento.builder()
                        .evaluacion(evaluacion)
                        .comportamiento(comportamiento)
                        .calificacion(item.calificacion())
                        .build();
                evaluacionComportamientoRepository.save(ec);
            }
        }

        if (evaluacion.getEstado() == EstadoEvaluacion.PENDIENTE) {
            evaluacion.setEstado(EstadoEvaluacion.EN_PROCESO);
            evaluacionRepository.save(evaluacion);
        }

        return toResponse(evaluacion);
    }

    /**
     * Cambia el estado de la evaluacion, respetando el orden de avance
     * declarado en {@link EstadoEvaluacion}: PENDIENTE -> EN_PROCESO ->
     * FINALIZADA -> CONSOLIDADA -> CERRADA. No se permite retroceder ni
     * saltar mas de un paso a la vez. RF-13, RF-27.
     */
    public EvaluacionResponse cambiarEstado(Long evaluacionId, EstadoEvaluacion nuevoEstado) {
        Evaluacion evaluacion = buscarEntidad(evaluacionId);
        EstadoEvaluacion actual = evaluacion.getEstado();

        if (nuevoEstado.ordinal() != actual.ordinal() + 1) {
            throw new BusinessException(
                    "Transicion invalida de " + actual + " a " + nuevoEstado
                            + ". Las evaluaciones solo pueden avanzar un paso a la vez en el orden: "
                            + "PENDIENTE -> EN_PROCESO -> FINALIZADA -> CONSOLIDADA -> CERRADA");
        }

        evaluacion.setEstado(nuevoEstado);
        Evaluacion guardada = evaluacionRepository.save(evaluacion);

        if (nuevoEstado == EstadoEvaluacion.FINALIZADA) {
            // Al finalizar, se calcula automaticamente el Resultado individual (RF-14).
            resultadoService.calcular(evaluacionId);
        }

        return toResponse(guardada);
    }

    private EvaluacionResponse toResponse(Evaluacion evaluacion) {
        return new EvaluacionResponse(
                evaluacion.getId(),
                evaluacion.getPeriodo().getId(),
                evaluacion.getPeriodo().getNombre(),
                evaluacion.getColaborador().getId(),
                evaluacion.getColaborador().getNombre(),
                evaluacion.getEvaluador().getId(),
                evaluacion.getEvaluador().getNombre(),
                evaluacion.getTipoEvaluador(),
                evaluacion.getEstado(),
                evaluacion.getFecha()
        );
    }
}
