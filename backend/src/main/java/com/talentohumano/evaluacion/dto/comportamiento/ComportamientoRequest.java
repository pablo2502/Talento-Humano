package com.talentohumano.evaluacion.dto.comportamiento;

import com.talentohumano.evaluacion.entity.enums.EstadoRegistro;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ComportamientoRequest(
        @NotBlank String codigo,
        @NotBlank String nombre,
        String descripcion,
        @NotNull EstadoRegistro estado
) {
}
