package com.talentohumano.evaluacion.controller;

import com.talentohumano.evaluacion.dto.competencia.CompetenciaRequest;
import com.talentohumano.evaluacion.dto.competencia.CompetenciaResponse;
import com.talentohumano.evaluacion.service.CompetenciaService;
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
 * RF-05: CRUD de Competencias (catalogo maestro).
 */
@RestController
@RequestMapping("/api/v1/competencias")
@RequiredArgsConstructor
@Tag(name = "Competencias")
public class CompetenciaController {

    private final CompetenciaService competenciaService;

    @GetMapping
    public List<CompetenciaResponse> listar() {
        return competenciaService.listar();
    }

    @GetMapping("/{id}")
    public CompetenciaResponse obtener(@PathVariable Long id) {
        return competenciaService.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CompetenciaResponse crear(@Valid @RequestBody CompetenciaRequest request) {
        return competenciaService.crear(request);
    }

    @PutMapping("/{id}")
    public CompetenciaResponse actualizar(@PathVariable Long id, @Valid @RequestBody CompetenciaRequest request) {
        return competenciaService.actualizar(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        competenciaService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
