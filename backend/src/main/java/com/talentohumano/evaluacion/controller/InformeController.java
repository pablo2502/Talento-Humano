package com.talentohumano.evaluacion.controller;

import com.talentohumano.evaluacion.dto.informe.InformeRequest;
import com.talentohumano.evaluacion.dto.informe.InformeResponse;
import com.talentohumano.evaluacion.service.InformeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * RF-19 a RF-21: generacion de informes (individual/area/general).
 * <p>
 * STUB: la metadata del informe se persiste, pero NO se genera un
 * PDF/documento real. Ver TODO en {@link InformeService}.
 */
@RestController
@RequestMapping("/api/v1/informes")
@RequiredArgsConstructor
@Tag(name = "Informes (stub)")
public class InformeController {

    private final InformeService informeService;

    @GetMapping
    public List<InformeResponse> listar() {
        return informeService.listar();
    }

    @GetMapping("/{id}")
    public InformeResponse obtener(@PathVariable Long id) {
        return informeService.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Genera (registra) un informe. STUB: no produce un PDF real todavia; ver TODO en InformeService")
    public InformeResponse generar(@Valid @RequestBody InformeRequest request) {
        return informeService.generar(request);
    }
}
