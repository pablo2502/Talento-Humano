package com.talentohumano.evaluacion.dto.comportamiento;

import com.talentohumano.evaluacion.entity.enums.EstadoRegistro;

public record ComportamientoResponse(
        Long id,
        String codigo,
        String nombre,
        String descripcion,
        EstadoRegistro estado
) {
}
