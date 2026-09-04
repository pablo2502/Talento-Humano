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

/**
 * Indicador: unidad de observacion en la que se descompone una Competencia
 * o un Comportamiento. Pertenece a exactamente uno de los dos padres; esa
 * regla NO se modela como constraint de base de datos (una FK exclusiva
 * requeriria un CHECK/trigger especifico del motor) sino que se valida en
 * {@code IndicadorService} antes de persistir.
 */
@Entity
@Table(name = "indicadores")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Indicador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String nombre;

    @Column(length = 1000)
    private String descripcion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "competencia_id")
    private Competencia competencia;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comportamiento_id")
    private Comportamiento comportamiento;
}
