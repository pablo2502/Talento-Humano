package com.talentohumano.evaluacion.repository;

import com.talentohumano.evaluacion.entity.EvaluacionCompetencia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EvaluacionCompetenciaRepository extends JpaRepository<EvaluacionCompetencia, Long> {
    List<EvaluacionCompetencia> findByEvaluacionId(Long evaluacionId);
}
