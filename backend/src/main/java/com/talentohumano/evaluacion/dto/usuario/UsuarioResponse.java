package com.talentohumano.evaluacion.dto.usuario;

import com.talentohumano.evaluacion.entity.enums.EstadoUsuario;

import java.time.LocalDate;

public record UsuarioResponse(
        Long id,
        String nombre,
        String correo,
        EstadoUsuario estado,
        LocalDate fechaIngreso,
        Long rolId,
        String rolNombre,
        Long perfilId,
        String perfilNombre
) {
}
