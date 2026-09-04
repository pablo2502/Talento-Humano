package com.talentohumano.evaluacion.repository;

import com.talentohumano.evaluacion.entity.EvaluacionComportamiento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EvaluacionComportamientoRepository extends JpaRepository<EvaluacionComportamiento, Long> {
    List<EvaluacionComportamiento> findByEvaluacionId(Long evaluacionId);
}
