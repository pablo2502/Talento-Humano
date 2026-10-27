package com.talentohumano.evaluacion.repository;

import com.talentohumano.evaluacion.entity.RegistroDato;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RegistroDatoRepository extends JpaRepository<RegistroDato, Long> {
    List<RegistroDato> findAllByOrderByColeccionAscPosicionAscIdAsc();
    List<RegistroDato> findByColeccion(String coleccion);
    Optional<RegistroDato> findByColeccionAndItemId(String coleccion, String itemId);
    void deleteByColeccionAndItemId(String coleccion, String itemId);
}
