package com.talentohumano.evaluacion.dto.evaluacion;

import com.talentohumano.evaluacion.entity.enums.EstadoEvaluacion;
import jakarta.validation.constraints.NotNull;

public record CambiarEstadoRequest(
        @NotNull EstadoEvaluacion nuevoEstado
) {
}
