package com.talentohumano.evaluacion.dto.evaluacion;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * {@code evaluadorId} es opcional: si se omite, el servicio intenta
 * asignar automaticamente un evaluador segun {@code tipoEvaluador}
 * (ver {@code AsignacionEvaluadorService}, RF-09).
 */
public record EvaluacionRequest(
        @NotNull Long periodoId,
        @NotNull Long colaboradorId,
        Long evaluadorId,
        @NotBlank String tipoEvaluador,
        LocalDate fecha
) {
}
