package com.talentohumano.evaluacion.dto.indicador;

import jakarta.validation.constraints.NotBlank;

public record IndicadorRequest(
        @NotBlank String nombre,
        String descripcion,
        Long competenciaId,
        Long comportamientoId
) {
}
