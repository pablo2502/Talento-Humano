package com.talentohumano.evaluacion.repository;

import com.talentohumano.evaluacion.entity.Comportamiento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ComportamientoRepository extends JpaRepository<Comportamiento, Long> {
    Optional<Comportamiento> findByCodigo(String codigo);
    boolean existsByCodigo(String codigo);
}
