package com.talentohumano.evaluacion.dto.datos;

/** Mismo formato { ok, error } que devolvia el login local del frontend. */
public record LoginDatosResponse(boolean ok, String error, String token, String usuarioId) {

    public static LoginDatosResponse exito(String token, String usuarioId) {
        return new LoginDatosResponse(true, null, token, usuarioId);
    }

    public static LoginDatosResponse fallo(String error) {
        return new LoginDatosResponse(false, error, null, null);
    }
}
