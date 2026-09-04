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
 * Consolidacion de los resultados de todos los evaluadores de un colaborador
 * para un periodo dado, en un unico resultado final. RF-15.
 */
@Entity
@Table(name = "consolidaciones")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Consolidacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "colaborador_id", nullable = false)
    private Usuario colaborador;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "periodo_id", nullable = false)
    private Periodo periodo;

    @Column(name = "resultado_consolidado", precision = 5, scale = 2)
    private BigDecimal resultadoConsolidado;

    /**
     * Regla usada para consolidar, p.ej. "PROMEDIO". Ver TODO en
     * ConsolidacionService para reglas ponderadas futuras.
     */
    @Column(name = "regla_consolidacion", nullable = false, length = 60)
    private String reglaConsolidacion;
}
