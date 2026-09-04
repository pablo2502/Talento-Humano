package com.talentohumano.evaluacion.dto.evaluacion;

import com.talentohumano.evaluacion.entity.enums.EstadoEvaluacion;

import java.time.LocalDate;

public record EvaluacionResponse(
        Long id,
        Long periodoId,
        String periodoNombre,
        Long colaboradorId,
        String colaboradorNombre,
        Long evaluadorId,
        String evaluadorNombre,
        String tipoEvaluador,
        EstadoEvaluacion estado,
        LocalDate fecha
) {
}
