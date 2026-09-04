package com.talentohumano.evaluacion.dto.rol;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record RolRequest(
        @NotBlank String nombre,
        List<String> permisos
) {
}
