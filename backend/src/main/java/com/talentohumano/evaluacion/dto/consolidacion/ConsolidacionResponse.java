package com.talentohumano.evaluacion.dto.consolidacion;

import java.math.BigDecimal;

public record ConsolidacionResponse(
        Long id,
        Long colaboradorId,
        String colaboradorNombre,
        Long periodoId,
        String periodoNombre,
        BigDecimal resultadoConsolidado,
        String reglaConsolidacion,
        int cantidadEvaluaciones
) {
}
