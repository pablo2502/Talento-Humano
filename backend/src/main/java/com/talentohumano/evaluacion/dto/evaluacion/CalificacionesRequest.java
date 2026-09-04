package com.talentohumano.evaluacion.dto.evaluacion;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

/**
 * Payload para registrar/actualizar las calificaciones de una evaluacion
 * (una lista de competencias calificadas y otra de comportamientos calificados).
 * RF-10 a RF-12.
 */
public record CalificacionesRequest(
        List<@Valid ItemCalificado> competencias,
        List<@Valid ItemCalificado> comportamientos
) {
    public record ItemCalificado(
            @NotNull Long id,
            @NotNull BigDecimal calificacion
    ) {
    }
}
