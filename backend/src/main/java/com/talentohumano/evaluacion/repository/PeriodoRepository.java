package com.talentohumano.evaluacion.repository;

import com.talentohumano.evaluacion.entity.Periodo;
import com.talentohumano.evaluacion.entity.enums.EstadoPeriodo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PeriodoRepository extends JpaRepository<Periodo, Long> {
    List<Periodo> findByEstado(EstadoPeriodo estado);
}
