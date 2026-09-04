package com.talentohumano.evaluacion.repository;

import com.talentohumano.evaluacion.entity.Notificacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {
    List<Notificacion> findByUsuarioIdOrderByFechaDesc(Long usuarioId);
    List<Notificacion> findByUsuarioIdAndLeidaOrderByFechaDesc(Long usuarioId, boolean leida);
}
