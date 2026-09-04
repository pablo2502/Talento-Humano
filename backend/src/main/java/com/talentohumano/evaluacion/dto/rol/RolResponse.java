package com.talentohumano.evaluacion.dto.rol;

import java.util.List;

public record RolResponse(
        Long id,
        String nombre,
        List<String> permisos
) {
}
