package com.talentohumano.evaluacion.controller;

import com.talentohumano.evaluacion.dto.resultado.ResultadoResponse;
import com.talentohumano.evaluacion.service.ResultadoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * RF-14, RF-16: calculo y consulta de Resultados por evaluacion individual.
 */
@RestController
@RequestMapping("/api/v1/resultados")
@RequiredArgsConstructor
@Tag(name = "Resultados")
public class ResultadoController {

    private final ResultadoService resultadoService;

    @GetMapping("/evaluacion/{evaluacionId}")
    public ResultadoResponse obtenerPorEvaluacion(@PathVariable Long evaluacionId) {
        return resultadoService.obtenerPorEvaluacion(evaluacionId);
    }

    @PostMapping("/evaluacion/{evaluacionId}/calcular")
    @Operation(summary = "(Re)calcula el resultado de una evaluacion a partir de sus calificaciones registradas")
    public ResultadoResponse calcular(@PathVariable Long evaluacionId) {
        return resultadoService.calcular(evaluacionId);
    }
}
