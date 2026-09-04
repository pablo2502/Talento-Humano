package com.talentohumano.evaluacion.controller;

import com.talentohumano.evaluacion.dto.perfil.PerfilRequest;
import com.talentohumano.evaluacion.dto.perfil.PerfilResponse;
import com.talentohumano.evaluacion.service.PerfilService;
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
 * RF-04: CRUD de Perfiles de cargo.
 */
@RestController
@RequestMapping("/api/v1/perfiles")
@RequiredArgsConstructor
@Tag(name = "Perfiles")
public class PerfilController {

    private final PerfilService perfilService;

    @GetMapping
    public List<PerfilResponse> listar() {
        return perfilService.listar();
    }

    @GetMapping("/{id}")
    public PerfilResponse obtener(@PathVariable Long id) {
        return perfilService.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PerfilResponse crear(@Valid @RequestBody PerfilRequest request) {
        return perfilService.crear(request);
    }

    @PutMapping("/{id}")
    public PerfilResponse actualizar(@PathVariable Long id, @Valid @RequestBody PerfilRequest request) {
        return perfilService.actualizar(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        perfilService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
