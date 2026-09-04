package com.talentohumano.evaluacion.dto.perfil;

import com.talentohumano.evaluacion.entity.enums.EstadoRegistro;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record PerfilRequest(
        @NotBlank String nombre,
        @NotBlank String cargo,
        @NotBlank String area,
        String descripcion,
        String nivelEsperado,
        @NotNull EstadoRegistro estado,
        List<Long> competenciaIds,
        List<Long> comportamientoIds
) {
}
