package com.talentohumano.evaluacion.service;

import com.talentohumano.evaluacion.dto.resultado.ResultadoResponse;
import com.talentohumano.evaluacion.entity.Evaluacion;
import com.talentohumano.evaluacion.entity.EvaluacionCompetencia;
import com.talentohumano.evaluacion.entity.EvaluacionComportamiento;
import com.talentohumano.evaluacion.entity.Resultado;
import com.talentohumano.evaluacion.exception.BusinessException;
import com.talentohumano.evaluacion.exception.ResourceNotFoundException;
import com.talentohumano.evaluacion.repository.EvaluacionCompetenciaRepository;
import com.talentohumano.evaluacion.repository.EvaluacionComportamientoRepository;
import com.talentohumano.evaluacion.repository.EvaluacionRepository;
import com.talentohumano.evaluacion.repository.ResultadoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Calculo y consulta de Resultados por Evaluacion individual. RF-14, RF-16.
 * <p>
 * Regla de calculo actual (simple, RF-14 base): promedio aritmetico de las
 * calificaciones de competencias, promedio aritmetico de las calificaciones
 * de comportamientos, y resultado general = promedio de ambos subtotales.
 * TODO: sustituir por la formula oficial de ponderacion definida por RRHH
 * (p.ej. 60% competencias / 40% comportamiento, o pesos por indicador) una
 * vez este definida en el detalle funcional de RF-14.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ResultadoService {

    private static final int ESCALA = 2;

    private final ResultadoRepository resultadoRepository;
    private final EvaluacionRepository evaluacionRepository;
    private final EvaluacionCompetenciaRepository evaluacionCompetenciaRepository;
    private final EvaluacionComportamientoRepository evaluacionComportamientoRepository;

    public ResultadoResponse obtenerPorEvaluacion(Long evaluacionId) {
        Resultado resultado = resultadoRepository.findByEvaluacionId(evaluacionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No existe un Resultado calculado para la evaluacion " + evaluacionId));
        return toResponse(resultado);
    }

    /**
     * Calcula (o recalcula) el Resultado de una Evaluacion a partir de sus
     * EvaluacionCompetencia/EvaluacionComportamiento registradas.
     */
    public ResultadoResponse calcular(Long evaluacionId) {
        Evaluacion evaluacion = evaluacionRepository.findById(evaluacionId)
                .orElseThrow(() -> ResourceNotFoundException.of("Evaluacion", evaluacionId));

        List<EvaluacionCompetencia> competencias = evaluacionCompetenciaRepository.findByEvaluacionId(evaluacionId);
        List<EvaluacionComportamiento> comportamientos = evaluacionComportamientoRepository.findByEvaluacionId(evaluacionId);

        if (competencias.isEmpty() && comportamientos.isEmpty()) {
            throw new BusinessException("La evaluacion " + evaluacionId + " no tiene calificaciones registradas");
        }

        BigDecimal resultadoCompetencias = promedio(competencias.stream().map(EvaluacionCompetencia::getCalificacion).toList());
        BigDecimal resultadoComportamiento = promedio(comportamientos.stream().map(EvaluacionComportamiento::getCalificacion).toList());
        BigDecimal resultadoGeneral = promedio(List.of(resultadoCompetencias, resultadoComportamiento));

        Resultado resultado = resultadoRepository.findByEvaluacionId(evaluacionId)
                .orElseGet(() -> Resultado.builder().evaluacion(evaluacion).build());
        resultado.setResultadoCompetencias(resultadoCompetencias);
        resultado.setResultadoComportamiento(resultadoComportamiento);
        resultado.setResultadoGeneral(resultadoGeneral);

        return toResponse(resultadoRepository.save(resultado));
    }

    private BigDecimal promedio(List<BigDecimal> valores) {
        List<BigDecimal> noNulos = valores.stream().filter(v -> v != null).toList();
        if (noNulos.isEmpty()) {
            return BigDecimal.ZERO.setScale(ESCALA, RoundingMode.HALF_UP);
        }
        BigDecimal suma = noNulos.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return suma.divide(BigDecimal.valueOf(noNulos.size()), ESCALA, RoundingMode.HALF_UP);
    }

    private ResultadoResponse toResponse(Resultado resultado) {
        Evaluacion evaluacion = resultado.getEvaluacion();
        return new ResultadoResponse(
                resultado.getId(),
                evaluacion.getId(),
                evaluacion.getColaborador().getId(),
                evaluacion.getColaborador().getNombre(),
                evaluacion.getEvaluador().getId(),
                evaluacion.getEvaluador().getNombre(),
                resultado.getResultadoCompetencias(),
                resultado.getResultadoComportamiento(),
                resultado.getResultadoGeneral()
        );
    }
}
