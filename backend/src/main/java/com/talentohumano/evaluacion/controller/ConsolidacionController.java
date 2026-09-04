package com.talentohumano.evaluacion.controller;

import com.talentohumano.evaluacion.dto.consolidacion.ConsolidacionRequest;
import com.talentohumano.evaluacion.dto.consolidacion.ConsolidacionResponse;
import com.talentohumano.evaluacion.service.ConsolidacionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * RF-15: consolidacion de resultados de todos los evaluadores de un
 * colaborador, en un periodo, en un unico resultado final.
 */
@RestController
@RequestMapping("/api/v1/consolidaciones")
@RequiredArgsConstructor
@Tag(name = "Consolidaciones")
public class ConsolidacionController {

    private final ConsolidacionService consolidacionService;

    @GetMapping("/periodo/{periodoId}")
    public List<ConsolidacionResponse> listarPorPeriodo(@PathVariable Long periodoId) {
        return consolidacionService.listarPorPeriodo(periodoId);
    }

    @GetMapping("/colaborador/{colaboradorId}/periodo/{periodoId}")
    public ConsolidacionResponse obtener(@PathVariable Long colaboradorId, @PathVariable Long periodoId) {
        return consolidacionService.obtener(colaboradorId, periodoId);
    }

    @PostMapping
    @Operation(summary = "Consolida (PROMEDIO) los resultados de todos los evaluadores de un colaborador en un periodo")
    public ConsolidacionResponse consolidar(@Valid @RequestBody ConsolidacionRequest request) {
        return consolidacionService.consolidar(request.colaboradorId(), request.periodoId());
    }
}
