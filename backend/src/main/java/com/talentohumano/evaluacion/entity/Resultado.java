package com.talentohumano.evaluacion.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Resultado calculado de una Evaluacion individual (un evaluador -> un
 * colaborador). RF-14, RF-16.
 */
@Entity
@Table(name = "resultados")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Resultado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "evaluacion_id", nullable = false, unique = true)
    private Evaluacion evaluacion;

    @Column(name = "resultado_competencias", precision = 5, scale = 2)
    private BigDecimal resultadoCompetencias;

    @Column(name = "resultado_comportamiento", precision = 5, scale = 2)
    private BigDecimal resultadoComportamiento;

    @Column(name = "resultado_general", precision = 5, scale = 2)
    private BigDecimal resultadoGeneral;
}
