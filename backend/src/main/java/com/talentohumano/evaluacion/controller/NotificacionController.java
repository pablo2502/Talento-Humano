package com.talentohumano.evaluacion.controller;

import com.talentohumano.evaluacion.dto.notificacion.NotificacionResponse;
import com.talentohumano.evaluacion.service.NotificacionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * RF-26: Notificaciones.
 */
@RestController
@RequestMapping("/api/v1/notificaciones")
@RequiredArgsConstructor
@Tag(name = "Notificaciones")
public class NotificacionController {

    private final NotificacionService notificacionService;

    @GetMapping("/usuario/{usuarioId}")
    public List<NotificacionResponse> listarPorUsuario(
            @PathVariable Long usuarioId,
            @RequestParam(required = false, defaultValue = "false") boolean soloNoLeidas
    ) {
        return soloNoLeidas
                ? notificacionService.listarNoLeidasPorUsuario(usuarioId)
                : notificacionService.listarPorUsuario(usuarioId);
    }

    @PatchMapping("/{id}/leida")
    public NotificacionResponse marcarLeida(@PathVariable Long id) {
        return notificacionService.marcarLeida(id);
    }
}
