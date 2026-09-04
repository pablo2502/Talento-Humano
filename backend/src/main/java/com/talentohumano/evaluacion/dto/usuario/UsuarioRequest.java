package com.talentohumano.evaluacion.dto.usuario;

import com.talentohumano.evaluacion.entity.enums.EstadoUsuario;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * DTO de entrada para crear/actualizar un Usuario.
 * En actualizacion, {@code password} puede omitirse para no cambiar la contrasena.
 */
public record UsuarioRequest(
        @NotBlank String nombre,
        @NotBlank @Email String correo,
        String password,
        @NotNull EstadoUsuario estado,
        LocalDate fechaIngreso,
        @NotNull Long rolId,
        Long perfilId
) {
}
