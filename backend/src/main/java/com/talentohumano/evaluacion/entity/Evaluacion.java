package com.talentohumano.evaluacion.entity;

import com.talentohumano.evaluacion.entity.enums.EstadoEvaluacion;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

import java.time.LocalDate;

/**
 * Una evaluacion de un colaborador, realizada por un evaluador, dentro de un
 * periodo. RF-09 a RF-13, RF-27.
 */
@Entity
@Table(name = "evaluaciones")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Evaluacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "periodo_id", nullable = false)
    private Periodo periodo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "colaborador_id", nullable = false)
    private Usuario colaborador;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "evaluador_id", nullable = false)
    private Usuario evaluador;

    /**
     * Tipo de evaluador para esta evaluacion especifica: JEFE, GERENTE o CLIENTE.
     * Se modela como String (segun especificacion de dominio) en vez de enum
     * para permitir nuevos tipos de evaluador sin migracion de esquema.
     */
    @Column(name = "tipo_evaluador", nullable = false, length = 30)
    private String tipoEvaluador;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoEvaluacion estado;

    @Column(nullable = false)
    private LocalDate fecha;
}
