package com.talentohumano.evaluacion.dto.competencia;

import com.talentohumano.evaluacion.entity.enums.EstadoRegistro;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CompetenciaRequest(
        @NotBlank String codigo,
        @NotBlank String nombre,
        String descripcion,
        String categoria,
        String nivelEsperado,
        @NotNull EstadoRegistro estado
) {
}
