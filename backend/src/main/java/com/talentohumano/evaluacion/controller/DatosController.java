package com.talentohumano.evaluacion.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.talentohumano.evaluacion.dto.datos.LoginDatosRequest;
import com.talentohumano.evaluacion.dto.datos.LoginDatosResponse;
import com.talentohumano.evaluacion.security.JwtService;
import com.talentohumano.evaluacion.service.DatosService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

/**
 * API que usa el frontend actual (modelo 360° real) como su capa de datos:
 * login, lectura de la base y guardado de cambios. Reemplaza a localStorage
 * sin cambiar ninguna regla de negocio del frontend.
 */
@RestController
@RequestMapping("/api/v2")
@RequiredArgsConstructor
@Tag(name = "Datos (frontend 360)")
public class DatosController {

    private final DatosService datosService;
    private final JwtService jwtService;

    @PostMapping("/auth/login")
    public ResponseEntity<LoginDatosResponse> login(@RequestBody LoginDatosRequest request) {
        Optional<JsonNode> encontrado = datosService.usuarioPorCorreo(request.correo());
        if (encontrado.isEmpty()) return noAutorizado("Usuario o contraseña incorrectos.");
        JsonNode usuario = encontrado.get();
        if (!"Activo".equals(usuario.path("estado").asText())) {
            return noAutorizado("Este usuario se encuentra inactivo. Contacta al administrador.");
        }
        if (!datosService.passwordCorrecta(usuario, request.password())) {
            return noAutorizado("Usuario o contraseña incorrectos.");
        }
        String usuarioId = usuario.path("id").asText();
        boolean admin = "admin".equals(usuario.path("rolId").asText());
        return ResponseEntity.ok(LoginDatosResponse.exito(jwtService.generarTokenDatos(usuarioId, admin), usuarioId));
    }

    /** Publico: el frontend lo usa para saber si hay backend y si ya tiene datos. */
    @GetMapping("/datos/estado")
    public Map<String, Boolean> estado() {
        return Map.of("inicializado", datosService.estaInicializado());
    }

    /** Publico, pero solo funciona una vez: con la base vacia (primer arranque). */
    @PostMapping(value = "/datos/inicializar", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public void inicializar(@RequestBody String cuerpo) {
        datosService.inicializar(cuerpo);
    }

    @GetMapping(value = "/datos", produces = MediaType.APPLICATION_JSON_VALUE)
    public String obtener() {
        return datosService.obtenerTodo();
    }

    @PostMapping(value = "/datos/cambios", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void guardarCambios(@RequestBody String cuerpo) {
        datosService.aplicarCambios(cuerpo);
    }

    /** Equivalente en servidor de TH.DB.resetDemo(): solo administradores. */
    @DeleteMapping("/datos")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void borrarTodo() {
        datosService.borrarTodo();
    }

    private static ResponseEntity<LoginDatosResponse> noAutorizado(String error) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(LoginDatosResponse.fallo(error));
    }
}
