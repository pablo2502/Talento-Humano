package com.talentohumano.evaluacion.dto.informe;

import com.talentohumano.evaluacion.entity.enums.TipoInforme;

import java.time.LocalDateTime;

public record InformeResponse(
        Long id,
        TipoInforme tipo,
        String formato,
        LocalDateTime fechaGeneracion,
        Long colaboradorId,
        String area,
        String urlDescarga
) {
}
