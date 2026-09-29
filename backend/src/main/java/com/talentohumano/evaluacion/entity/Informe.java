package com.talentohumano.evaluacion.entity;

import com.talentohumano.evaluacion.entity.enums.TipoInforme;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;

/**
 * Informe generado (individual, por area o general). RF-19 a RF-21.
 * <p>
 * Segun {@link TipoInforme}: INDIVIDUAL referencia un {@link #colaborador},
 * AREA referencia un {@link #area} (texto libre, igual al campo Perfil.area),
 * GENERAL no requiere ninguna referencia adicional. {@link #periodo} indica
 * el ciclo de evaluacion sobre el que se calculo el contenido, y
 * {@link #contenidoPdf} el documento ya renderizado (ver InformePdfRenderer)
 * listo para descargar sin necesidad de regenerarlo.
 */
@Entity
@Table(name = "informes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Informe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoInforme tipo;

    @Column(nullable = false, length = 20)
    private String formato;

    @Column(name = "fecha_generacion", nullable = false)
    private LocalDateTime fechaGeneracion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "colaborador_id")
    private Usuario colaborador;

    @Column(length = 150)
    private String area;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "periodo_id")
    private Periodo periodo;

    @Lob
    @Column(name = "contenido_pdf")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private byte[] contenidoPdf;
}
