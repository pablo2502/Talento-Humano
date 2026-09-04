package com.talentohumano.evaluacion.service;

import com.talentohumano.evaluacion.dto.notificacion.NotificacionResponse;
import com.talentohumano.evaluacion.entity.Notificacion;
import com.talentohumano.evaluacion.entity.Usuario;
import com.talentohumano.evaluacion.exception.ResourceNotFoundException;
import com.talentohumano.evaluacion.repository.NotificacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Notificaciones internas del sistema. RF-26.
 * <p>
 * TODO: este servicio solo persiste notificaciones "in-app". Un futuro canal
 * de correo/push (RF-26 extendido) deberia engancharse aqui, por ejemplo
 * publicando un evento de dominio despues de {@link #notificar}.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class NotificacionService {

    private final NotificacionRepository notificacionRepository;

    public List<NotificacionResponse> listarPorUsuario(Long usuarioId) {
        return notificacionRepository.findByUsuarioIdOrderByFechaDesc(usuarioId).stream()
                .map(this::toResponse).toList();
    }

    public List<NotificacionResponse> listarNoLeidasPorUsuario(Long usuarioId) {
        return notificacionRepository.findByUsuarioIdAndLeidaOrderByFechaDesc(usuarioId, false).stream()
                .map(this::toResponse).toList();
    }

    public Notificacion notificar(Usuario usuario, String tipo, String mensaje) {
        Notificacion notificacion = Notificacion.builder()
                .usuario(usuario)
                .tipo(tipo)
                .mensaje(mensaje)
                .fecha(LocalDateTime.now())
                .leida(false)
                .build();
        return notificacionRepository.save(notificacion);
    }

    public NotificacionResponse marcarLeida(Long id) {
        Notificacion notificacion = notificacionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Notificacion", id));
        notificacion.setLeida(true);
        return toResponse(notificacionRepository.save(notificacion));
    }

    private NotificacionResponse toResponse(Notificacion n) {
        return new NotificacionResponse(n.getId(), n.getUsuario().getId(), n.getTipo(), n.getMensaje(),
                n.getFecha(), n.isLeida());
    }
}
