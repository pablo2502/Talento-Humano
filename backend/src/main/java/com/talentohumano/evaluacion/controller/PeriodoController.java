package com.talentohumano.evaluacion.controller;

import com.talentohumano.evaluacion.dto.periodo.PeriodoRequest;
import com.talentohumano.evaluacion.dto.periodo.PeriodoResponse;
import com.talentohumano.evaluacion.service.PeriodoService;
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
 * RF-08: CRUD de Periodos + activar/cerrar.
 */
@RestController
@RequestMapping("/api/v1/periodos")
@RequiredArgsConstructor
@Tag(name = "Periodos")
public class PeriodoController {

    private final PeriodoService periodoService;

    @GetMapping
    public List<PeriodoResponse> listar() {
        return periodoService.listar();
    }

    @GetMapping("/{id}")
    public PeriodoResponse obtener(@PathVariable Long id) {
        return periodoService.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PeriodoResponse crear(@Valid @RequestBody PeriodoRequest request) {
        return periodoService.crear(request);
    }

    @PutMapping("/{id}")
    public PeriodoResponse actualizar(@PathVariable Long id, @Valid @RequestBody PeriodoRequest request) {
        return periodoService.actualizar(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        periodoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/activar")
    public PeriodoResponse activar(@PathVariable Long id) {
        return periodoService.activar(id);
    }

    @PostMapping("/{id}/cerrar")
    public PeriodoResponse cerrar(@PathVariable Long id) {
        return periodoService.cerrar(id);
    }
}
