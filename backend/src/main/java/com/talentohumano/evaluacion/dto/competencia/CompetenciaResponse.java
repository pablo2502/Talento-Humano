package com.talentohumano.evaluacion.dto.competencia;

import com.talentohumano.evaluacion.entity.enums.EstadoRegistro;

public record CompetenciaResponse(
        Long id,
        String codigo,
        String nombre,
        String descripcion,
        String categoria,
        String nivelEsperado,
        EstadoRegistro estado
) {
}
