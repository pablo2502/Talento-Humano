package com.talentohumano.evaluacion.controller;

import com.talentohumano.evaluacion.dto.usuario.UsuarioResponse;
import com.talentohumano.evaluacion.service.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * RF-22: busqueda avanzada / filtrada.
 * <p>
 * STUB PARCIAL: por ahora solo implementa filtrado basico de Usuario por
 * nombre (contiene, sin distinguir mayusculas) y/o estado exacto, via
 * {@link UsuarioService#buscar}.
 * <p>
 * TODO: extender a busqueda combinada sobre Evaluacion/Resultado/Perfil
 * (p.ej. por area, rango de fechas, rango de calificacion, competencia
 * especifica) una vez se defina el detalle completo de RF-22.
 */
@RestController
@RequestMapping("/api/v1/busqueda")
@RequiredArgsConstructor
@Tag(name = "Busqueda (stub parcial)")
public class BusquedaController {

    private final UsuarioService usuarioService;

    @GetMapping("/usuarios")
    @Operation(summary = "Filtra usuarios por nombre parcial y/o estado. STUB parcial de RF-22")
    public List<UsuarioResponse> buscarUsuarios(
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String estado
    ) {
        return usuarioService.buscar(nombre, estado);
    }
}
