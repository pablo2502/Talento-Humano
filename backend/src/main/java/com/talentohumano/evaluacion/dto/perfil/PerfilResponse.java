package com.talentohumano.evaluacion.dto.perfil;

import com.talentohumano.evaluacion.entity.enums.EstadoRegistro;

import java.time.LocalDate;
import java.util.List;

public record PerfilResponse(
        Long id,
        String nombre,
        String cargo,
        String area,
        String descripcion,
        String nivelEsperado,
        EstadoRegistro estado,
        LocalDate fechaCreacion,
        List<String> competencias,
        List<String> comportamientos
) {
}
