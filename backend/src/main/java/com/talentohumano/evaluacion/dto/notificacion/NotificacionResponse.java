package com.talentohumano.evaluacion.dto.notificacion;

import java.time.LocalDateTime;

public record NotificacionResponse(
        Long id,
        Long usuarioId,
        String tipo,
        String mensaje,
        LocalDateTime fecha,
        boolean leida
) {
}
