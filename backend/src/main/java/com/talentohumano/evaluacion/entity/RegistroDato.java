package com.talentohumano.evaluacion.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Un registro del modelo 360° que usa el frontend (frontend/js/data.js):
 * cada elemento de cada coleccion (usuarios, evaluaciones, periodos,
 * objetivos, ...) se guarda como una fila con su JSON tal cual.
 * <p>
 * Guardarlo por elemento (y no la base entera en un solo bloque) permite
 * que varias personas trabajen a la vez sin pisarse: cada guardado solo
 * toca los elementos que esa persona realmente cambio.
 */
@Entity
@Table(name = "th_datos",
        uniqueConstraints = @UniqueConstraint(columnNames = {"coleccion", "item_id"}),
        indexes = @Index(name = "idx_th_datos_orden", columnList = "coleccion, posicion"))
@Data
@NoArgsConstructor
public class RegistroDato {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 60)
    private String coleccion;

    @Column(name = "item_id", nullable = false, length = 120)
    private String itemId;

    /** Posicion dentro de la coleccion (el frontend depende del orden). */
    @Column(nullable = false)
    private int posicion;

    // LONGTEXT explicito: con @Lob, Hibernate crea TINYTEXT (255 bytes) en MySQL.
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String datos;

    @Column(nullable = false)
    private Instant actualizado;
}
