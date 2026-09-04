package com.talentohumano.evaluacion.controller;

import com.talentohumano.evaluacion.dto.comportamiento.ComportamientoRequest;
import com.talentohumano.evaluacion.dto.comportamiento.ComportamientoResponse;
import com.talentohumano.evaluacion.service.ComportamientoService;
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
 * RF-06: CRUD de Comportamientos (catalogo maestro).
 */
@RestController
@RequestMapping("/api/v1/comportamientos")
@RequiredArgsConstructor
@Tag(name = "Comportamientos")
public class ComportamientoController {

    private final ComportamientoService comportamientoService;

    @GetMapping
    public List<ComportamientoResponse> listar() {
        return comportamientoService.listar();
    }

    @GetMapping("/{id}")
    public ComportamientoResponse obtener(@PathVariable Long id) {
        return comportamientoService.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ComportamientoResponse crear(@Valid @RequestBody ComportamientoRequest request) {
        return comportamientoService.crear(request);
    }

    @PutMapping("/{id}")
    public ComportamientoResponse actualizar(@PathVariable Long id, @Valid @RequestBody ComportamientoRequest request) {
        return comportamientoService.actualizar(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        comportamientoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
