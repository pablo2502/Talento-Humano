package com.talentohumano.evaluacion.dto.periodo;

import com.talentohumano.evaluacion.entity.enums.EstadoPeriodo;

import java.time.LocalDate;

public record PeriodoResponse(
        Long id,
        String nombre,
        LocalDate fechaInicio,
        LocalDate fechaFin,
        EstadoPeriodo estado
) {
}
