package com.talentohumano.evaluacion.controller;

import com.talentohumano.evaluacion.dto.informe.InformeRequest;
import com.talentohumano.evaluacion.dto.informe.InformeResponse;
import com.talentohumano.evaluacion.service.InformeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * RF-19 a RF-21: generacion de informes (individual/area/general) con la
 * plantilla PDF "Perfil de competencias".
 */
@RestController
@RequestMapping("/api/v1/informes")
@RequiredArgsConstructor
@Tag(name = "Informes")
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
    @Operation(summary = "Genera un informe (individual/area/general) y renderiza su PDF con la plantilla del sistema")
    public InformeResponse generar(@Valid @RequestBody InformeRequest request) {
        return informeService.generar(request);
    }

    @GetMapping("/{id}/descargar")
    @Operation(summary = "Descarga el PDF ya generado para un informe")
    public ResponseEntity<byte[]> descargar(@PathVariable Long id) {
        InformeService.InformeArchivo archivo = informeService.descargar(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + archivo.nombreArchivo() + "\"")
                .body(archivo.contenido());
    }
}
