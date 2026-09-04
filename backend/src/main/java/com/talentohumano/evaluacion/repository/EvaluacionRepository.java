package com.talentohumano.evaluacion.repository;

import com.talentohumano.evaluacion.entity.Evaluacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EvaluacionRepository extends JpaRepository<Evaluacion, Long> {
    List<Evaluacion> findByPeriodoId(Long periodoId);
    List<Evaluacion> findByColaboradorId(Long colaboradorId);
    List<Evaluacion> findByEvaluadorId(Long evaluadorId);
    List<Evaluacion> findByColaboradorIdAndPeriodoId(Long colaboradorId, Long periodoId);
}
