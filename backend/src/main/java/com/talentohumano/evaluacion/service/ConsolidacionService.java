package com.talentohumano.evaluacion.service;

import com.talentohumano.evaluacion.dto.consolidacion.ConsolidacionResponse;
import com.talentohumano.evaluacion.entity.Consolidacion;
import com.talentohumano.evaluacion.entity.Evaluacion;
import com.talentohumano.evaluacion.entity.Periodo;
import com.talentohumano.evaluacion.entity.Resultado;
import com.talentohumano.evaluacion.entity.Usuario;
import com.talentohumano.evaluacion.entity.enums.EstadoEvaluacion;
import com.talentohumano.evaluacion.exception.BusinessException;
import com.talentohumano.evaluacion.exception.ResourceNotFoundException;
import com.talentohumano.evaluacion.repository.ConsolidacionRepository;
import com.talentohumano.evaluacion.repository.EvaluacionRepository;
import com.talentohumano.evaluacion.repository.ResultadoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Consolida los Resultado de todos los evaluadores de un colaborador, dentro
 * de un periodo, en un unico resultado final. RF-15.
 * <p>
 * Regla actual: PROMEDIO simple entre los resultadoGeneral de cada
 * evaluacion FINALIZADA (o posterior) del colaborador en el periodo.
 * TODO: la regla de negocio real probablemente requiere ponderar por tipo de
 * evaluador (p.ej. jefe 50%, gerente 30%, cliente 20%) en vez de un promedio
 * simple; parametrizar {@code reglaConsolidacion} cuando se defina esa
 * politica (ver Consolidacion.reglaConsolidacion).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ConsolidacionService {

    private static final String REGLA_PROMEDIO = "PROMEDIO";
    private static final int ESCALA = 2;

    private final ConsolidacionRepository consolidacionRepository;
    private final ResultadoRepository resultadoRepository;
    private final EvaluacionRepository evaluacionRepository;
    private final UsuarioService usuarioService;
    private final PeriodoService periodoService;

    public List<ConsolidacionResponse> listarPorPeriodo(Long periodoId) {
        return consolidacionRepository.findByPeriodoId(periodoId).stream().map(this::toResponse).toList();
    }

    public ConsolidacionResponse obtener(Long colaboradorId, Long periodoId) {
        Consolidacion consolidacion = consolidacionRepository.findByColaboradorIdAndPeriodoId(colaboradorId, periodoId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No existe consolidacion para el colaborador " + colaboradorId + " en el periodo " + periodoId));
        return toResponse(consolidacion);
    }

    public ConsolidacionResponse consolidar(Long colaboradorId, Long periodoId) {
        Usuario colaborador = usuarioService.buscarEntidad(colaboradorId);
        Periodo periodo = periodoService.buscarEntidad(periodoId);

        List<Resultado> resultados = resultadoRepository.findByColaboradorAndPeriodo(colaboradorId, periodoId);
        if (resultados.isEmpty()) {
            throw new BusinessException(
                    "El colaborador " + colaboradorId + " no tiene resultados calculados en el periodo " + periodoId
                            + "; finalice al menos una evaluacion antes de consolidar");
        }

        BigDecimal promedio = resultados.stream()
                .map(Resultado::getResultadoGeneral)
                .filter(v -> v != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(resultados.size()), ESCALA, RoundingMode.HALF_UP);

        Consolidacion consolidacion = consolidacionRepository.findByColaboradorIdAndPeriodoId(colaboradorId, periodoId)
                .orElseGet(() -> Consolidacion.builder().colaborador(colaborador).periodo(periodo).build());
        consolidacion.setResultadoConsolidado(promedio);
        consolidacion.setReglaConsolidacion(REGLA_PROMEDIO);
        Consolidacion guardada = consolidacionRepository.save(consolidacion);

        // Avanza a CONSOLIDADA todas las evaluaciones FINALIZADA de este colaborador/periodo.
        List<Evaluacion> evaluaciones = evaluacionRepository.findByColaboradorIdAndPeriodoId(colaboradorId, periodoId);
        for (Evaluacion evaluacion : evaluaciones) {
            if (evaluacion.getEstado() == EstadoEvaluacion.FINALIZADA) {
                evaluacion.setEstado(EstadoEvaluacion.CONSOLIDADA);
                evaluacionRepository.save(evaluacion);
            }
        }

        return toResponse(guardada, resultados.size());
    }

    private ConsolidacionResponse toResponse(Consolidacion consolidacion) {
        int cantidad = resultadoRepository
                .findByColaboradorAndPeriodo(consolidacion.getColaborador().getId(), consolidacion.getPeriodo().getId())
                .size();
        return toResponse(consolidacion, cantidad);
    }

    private ConsolidacionResponse toResponse(Consolidacion consolidacion, int cantidadEvaluaciones) {
        return new ConsolidacionResponse(
                consolidacion.getId(),
                consolidacion.getColaborador().getId(),
                consolidacion.getColaborador().getNombre(),
                consolidacion.getPeriodo().getId(),
                consolidacion.getPeriodo().getNombre(),
                consolidacion.getResultadoConsolidado(),
                consolidacion.getReglaConsolidacion(),
                cantidadEvaluaciones
        );
    }
}
