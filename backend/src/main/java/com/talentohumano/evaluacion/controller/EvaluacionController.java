package com.talentohumano.evaluacion.controller;

import com.talentohumano.evaluacion.dto.evaluacion.CalificacionesRequest;
import com.talentohumano.evaluacion.dto.evaluacion.CambiarEstadoRequest;
import com.talentohumano.evaluacion.dto.evaluacion.EvaluacionRequest;
import com.talentohumano.evaluacion.dto.evaluacion.EvaluacionResponse;
import com.talentohumano.evaluacion.service.EvaluacionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * RF-09 a RF-13, RF-27: ciclo de vida de las Evaluaciones.
 */
@RestController
@RequestMapping("/api/v1/evaluaciones")
@RequiredArgsConstructor
@Tag(name = "Evaluaciones")
public class EvaluacionController {

    private final EvaluacionService evaluacionService;

    @GetMapping("/{id}")
    public EvaluacionResponse obtener(@PathVariable Long id) {
        return evaluacionService.obtener(id);
    }

    @GetMapping
    @Operation(summary = "Lista evaluaciones filtrando por periodo, colaborador o evaluador (un parametro a la vez)")
    public List<EvaluacionResponse> listar(
            @RequestParam(required = false) Long periodoId,
            @RequestParam(required = false) Long colaboradorId,
            @RequestParam(required = false) Long evaluadorId
    ) {
        if (periodoId != null) {
            return evaluacionService.listarPorPeriodo(periodoId);
        }
        if (colaboradorId != null) {
            return evaluacionService.listarPorColaborador(colaboradorId);
        }
        if (evaluadorId != null) {
            return evaluacionService.listarPorEvaluador(evaluadorId);
        }
        throw new IllegalArgumentException("Debe indicar al menos uno de: periodoId, colaboradorId, evaluadorId");
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Crea una evaluacion; si no se indica evaluadorId, se intenta asignar automaticamente (RF-09)")
    public EvaluacionResponse crear(@Valid @RequestBody EvaluacionRequest request) {
        return evaluacionService.crear(request);
    }

    @PutMapping("/{id}/calificaciones")
    @Operation(summary = "Registra/actualiza calificaciones de competencias y comportamientos (RF-10 a RF-12)")
    public EvaluacionResponse registrarCalificaciones(@PathVariable Long id, @Valid @RequestBody CalificacionesRequest request) {
        return evaluacionService.registrarCalificaciones(id, request);
    }

    @PatchMapping("/{id}/estado")
    @Operation(summary = "Avanza el estado de la evaluacion un paso (RF-13, RF-27)")
    public EvaluacionResponse cambiarEstado(@PathVariable Long id, @Valid @RequestBody CambiarEstadoRequest request) {
        return evaluacionService.cambiarEstado(id, request.nuevoEstado());
    }
}
