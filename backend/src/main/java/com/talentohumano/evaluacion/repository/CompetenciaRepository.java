package com.talentohumano.evaluacion.repository;

import com.talentohumano.evaluacion.entity.Competencia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CompetenciaRepository extends JpaRepository<Competencia, Long> {
    Optional<Competencia> findByCodigo(String codigo);
    boolean existsByCodigo(String codigo);
}
