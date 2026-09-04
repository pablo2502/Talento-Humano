package com.talentohumano.evaluacion.controller;

import com.talentohumano.evaluacion.dto.indicador.IndicadorRequest;
import com.talentohumano.evaluacion.dto.indicador.IndicadorResponse;
import com.talentohumano.evaluacion.service.IndicadorService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * CRUD de Indicadores (descomposicion de Competencia/Comportamiento).
 * No corresponde a un RF numerado independiente en el documento de
 * requisitos, pero se expone para completar el modelo de dominio y
 * demostrar la regla de negocio "pertenece a exactamente uno de los dos
 * padres" (ver IndicadorService).
 */
@RestController
@RequestMapping("/api/v1/indicadores")
@RequiredArgsConstructor
@Tag(name = "Indicadores")
public class IndicadorController {

    private final IndicadorService indicadorService;

    @GetMapping
    public List<IndicadorResponse> listar() {
        return indicadorService.listar();
    }

    @GetMapping("/{id}")
    public IndicadorResponse obtener(@PathVariable Long id) {
        return indicadorService.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public IndicadorResponse crear(@Valid @RequestBody IndicadorRequest request) {
        return indicadorService.crear(request);
    }

    @PutMapping("/{id}")
    public IndicadorResponse actualizar(@PathVariable Long id, @Valid @RequestBody IndicadorRequest request) {
        return indicadorService.actualizar(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        indicadorService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
