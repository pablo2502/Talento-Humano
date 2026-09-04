package com.talentohumano.evaluacion.dto.consolidacion;

import jakarta.validation.constraints.NotNull;

public record ConsolidacionRequest(
        @NotNull Long colaboradorId,
        @NotNull Long periodoId
) {
}
