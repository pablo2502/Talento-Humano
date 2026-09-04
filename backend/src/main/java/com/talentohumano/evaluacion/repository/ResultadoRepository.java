package com.talentohumano.evaluacion.repository;

import com.talentohumano.evaluacion.entity.Resultado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ResultadoRepository extends JpaRepository<Resultado, Long> {

    Optional<Resultado> findByEvaluacionId(Long evaluacionId);

    @Query("select r from Resultado r where r.evaluacion.colaborador.id = :colaboradorId " +
            "and r.evaluacion.periodo.id = :periodoId")
    List<Resultado> findByColaboradorAndPeriodo(@Param("colaboradorId") Long colaboradorId,
                                                 @Param("periodoId") Long periodoId);
}
