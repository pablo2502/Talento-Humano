package com.talentohumano.evaluacion.dto.auth;

public record LoginResponse(
        String token,
        String tipo,
        Long usuarioId,
        String nombre,
        String correo,
        String rol,
        long expiraEnMs
) {
}
