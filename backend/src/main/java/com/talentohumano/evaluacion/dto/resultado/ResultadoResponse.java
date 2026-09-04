package com.talentohumano.evaluacion.dto.resultado;

import java.math.BigDecimal;

public record ResultadoResponse(
        Long id,
        Long evaluacionId,
        Long colaboradorId,
        String colaboradorNombre,
        Long evaluadorId,
        String evaluadorNombre,
        BigDecimal resultadoCompetencias,
        BigDecimal resultadoComportamiento,
        BigDecimal resultadoGeneral
) {
}
