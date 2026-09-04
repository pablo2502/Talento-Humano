package com.talentohumano.evaluacion.controller;

import com.talentohumano.evaluacion.dto.ia.RecomendacionResponse;
import com.talentohumano.evaluacion.service.IaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * RF-25: recomendaciones de IA. STUB, unicamente consultivo (RNF-14/RNF-16).
 * Ver TODO en {@link IaService}.
 */
@RestController
@RequestMapping("/api/v1/ia")
@RequiredArgsConstructor
@Tag(name = "IA (stub)")
public class IaController {

    private final IaService iaService;

    @GetMapping("/recomendaciones/{colaboradorId}")
    @Operation(summary = "Recomendaciones de desarrollo generadas por IA. STUB: respuesta placeholder, unicamente consultiva")
    public RecomendacionResponse recomendaciones(@PathVariable Long colaboradorId) {
        return iaService.obtenerRecomendaciones(colaboradorId);
    }
}
