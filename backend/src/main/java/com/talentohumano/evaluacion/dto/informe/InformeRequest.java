package com.talentohumano.evaluacion.dto.informe;

import com.talentohumano.evaluacion.entity.enums.TipoInforme;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Solicitud de generacion de informe. Segun {@code tipo}:
 * INDIVIDUAL requiere {@code colaboradorId}; AREA requiere {@code area};
 * GENERAL no requiere ninguno de los dos.
 */
public record InformeRequest(
        @NotNull TipoInforme tipo,
        @NotBlank String formato,
        Long colaboradorId,
        String area
) {
}
