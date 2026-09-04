package com.talentohumano.evaluacion.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Calificacion otorgada a un Comportamiento dentro de una Evaluacion.
 * Una fila por (evaluacion, comportamiento).
 */
@Entity
@Table(name = "evaluacion_comportamientos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EvaluacionComportamiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "evaluacion_id", nullable = false)
    private Evaluacion evaluacion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "comportamiento_id", nullable = false)
    private Comportamiento comportamiento;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal calificacion;
}
