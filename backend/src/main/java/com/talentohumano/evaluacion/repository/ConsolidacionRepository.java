package com.talentohumano.evaluacion.repository;

import com.talentohumano.evaluacion.entity.Consolidacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConsolidacionRepository extends JpaRepository<Consolidacion, Long> {
    Optional<Consolidacion> findByColaboradorIdAndPeriodoId(Long colaboradorId, Long periodoId);
    List<Consolidacion> findByPeriodoId(Long periodoId);
    List<Consolidacion> findByColaboradorId(Long colaboradorId);
}
