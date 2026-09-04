package com.talentohumano.evaluacion.repository;

import com.talentohumano.evaluacion.entity.Indicador;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IndicadorRepository extends JpaRepository<Indicador, Long> {
    List<Indicador> findByCompetenciaId(Long competenciaId);
    List<Indicador> findByComportamientoId(Long comportamientoId);
}
