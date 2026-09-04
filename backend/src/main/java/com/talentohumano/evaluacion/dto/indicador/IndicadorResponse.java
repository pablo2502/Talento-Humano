package com.talentohumano.evaluacion.dto.indicador;

public record IndicadorResponse(
        Long id,
        String nombre,
        String descripcion,
        Long competenciaId,
        String competenciaNombre,
        Long comportamientoId,
        String comportamientoNombre
) {
}
