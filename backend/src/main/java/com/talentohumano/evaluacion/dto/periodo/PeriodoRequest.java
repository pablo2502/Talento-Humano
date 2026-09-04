package com.talentohumano.evaluacion.dto.periodo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record PeriodoRequest(
        @NotBlank String nombre,
        @NotNull LocalDate fechaInicio,
        @NotNull LocalDate fechaFin
) {
}
