package com.talentohumano.evaluacion.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.talentohumano.evaluacion.entity.RegistroDato;
import com.talentohumano.evaluacion.exception.BusinessException;
import com.talentohumano.evaluacion.repository.RegistroDatoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

/**
 * Capa de datos del modelo 360° del frontend. Guarda y entrega las
 * colecciones de frontend/js/data.js sin reinterpretarlas, de modo que el
 * frontend funcione exactamente igual que cuando usaba localStorage.
 * <p>
 * Lo unico que cambia respecto a localStorage: las contrasenas se guardan
 * con BCrypt y nunca salen del servidor (el login se valida aqui).
 */
@Service
@RequiredArgsConstructor
public class DatosService {

    public static final String USUARIOS = "usuarios";
    private static final String CAMPO_PASSWORD = "password";

    /**
     * Mapper propio (no el de Spring, que omite nulls): el JSON debe volver
     * identico a como lo envio el frontend, incluidos los null y los decimales.
     */
    private static final ObjectMapper JSON = new ObjectMapper()
            .enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
            .setNodeFactory(JsonNodeFactory.withExactBigDecimals(true));

    private final RegistroDatoRepository repository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public boolean estaInicializado() {
        return repository.count() > 0;
    }

    /** Todas las colecciones, en su orden, como { "colecciones": { nombre: [ ... ] } }. */
    @Transactional(readOnly = true)
    public String obtenerTodo() {
        Map<String, List<String>> porColeccion = new LinkedHashMap<>();
        for (RegistroDato r : repository.findAllByOrderByColeccionAscPosicionAscIdAsc()) {
            String datos = USUARIOS.equals(r.getColeccion()) ? sinPassword(r.getDatos()) : r.getDatos();
            porColeccion.computeIfAbsent(r.getColeccion(), k -> new ArrayList<>()).add(datos);
        }
        StringBuilder sb = new StringBuilder("{\"colecciones\":{");
        boolean primera = true;
        for (Map.Entry<String, List<String>> e : porColeccion.entrySet()) {
            if (!primera) sb.append(',');
            primera = false;
            sb.append(texto(e.getKey())).append(":[").append(String.join(",", e.getValue())).append(']');
        }
        return sb.append("}}").toString();
    }

    /** Carga inicial: solo se permite con la base vacia (primer arranque). */
    @Transactional
    public void inicializar(String cuerpo) {
        if (estaInicializado()) {
            throw new BusinessException("La base de datos ya esta inicializada.");
        }
        JsonNode colecciones = leer(cuerpo).path("colecciones");
        if (!colecciones.isObject()) throw new IllegalArgumentException("Falta el objeto 'colecciones'.");
        colecciones.fields().forEachRemaining(e -> {
            if (!e.getValue().isArray()) return;
            int posicion = 0;
            for (JsonNode item : e.getValue()) {
                guardar(e.getKey(), idDe(item), posicion++, (ObjectNode) item);
            }
        });
    }

    /**
     * Aplica los cambios que el frontend detecto desde su ultimo guardado:
     * { cambios: [{ coleccion, id, posicion, datos? }], eliminados: [{ coleccion, id }] }.
     * Un cambio sin "datos" solo mueve la posicion del elemento.
     */
    @Transactional
    public void aplicarCambios(String cuerpo) {
        JsonNode raiz = leer(cuerpo);
        for (JsonNode c : raiz.path("cambios")) {
            String coleccion = c.path("coleccion").asText();
            String id = c.path("id").asText();
            int posicion = c.path("posicion").asInt();
            JsonNode datos = c.get("datos");
            if (datos != null && datos.isObject()) {
                guardar(coleccion, id, posicion, (ObjectNode) datos);
            } else {
                repository.findByColeccionAndItemId(coleccion, id).ifPresent(r -> {
                    r.setPosicion(posicion);
                    repository.save(r);
                });
            }
        }
        for (JsonNode e : raiz.path("eliminados")) {
            repository.deleteByColeccionAndItemId(e.path("coleccion").asText(), e.path("id").asText());
        }
    }

    @Transactional
    public void borrarTodo() {
        repository.deleteAllInBatch();
    }

    /** Busca un usuario por correo (sin distinguir mayusculas), como lo hacia auth.js. */
    @Transactional(readOnly = true)
    public Optional<JsonNode> usuarioPorCorreo(String correo) {
        String buscado = correo == null ? "" : correo.trim().toLowerCase(Locale.ROOT);
        return repository.findByColeccion(USUARIOS).stream()
                .map(r -> leer(r.getDatos()))
                .filter(u -> u.path("correo").asText().toLowerCase(Locale.ROOT).equals(buscado))
                .findFirst();
    }

    public boolean passwordCorrecta(JsonNode usuario, String password) {
        String hash = usuario.path(CAMPO_PASSWORD).asText("");
        return password != null && !hash.isEmpty() && passwordEncoder.matches(password, hash);
    }

    // ---------------------------------------------------------------------

    private void guardar(String coleccion, String id, int posicion, ObjectNode datos) {
        RegistroDato registro = repository.findByColeccionAndItemId(coleccion, id).orElseGet(() -> {
            RegistroDato nuevo = new RegistroDato();
            nuevo.setColeccion(coleccion);
            nuevo.setItemId(id);
            return nuevo;
        });
        if (USUARIOS.equals(coleccion)) protegerPassword(datos, registro.getDatos());
        registro.setPosicion(posicion);
        registro.setDatos(escribir(datos));
        registro.setActualizado(Instant.now());
        repository.save(registro);
    }

    /**
     * El frontend ya no recibe las contrasenas: si el usuario llega sin ella
     * se conserva la guardada; si llega en texto plano (usuario nuevo) se cifra.
     */
    private void protegerPassword(ObjectNode usuario, String datosPrevios) {
        JsonNode password = usuario.get(CAMPO_PASSWORD);
        if (password == null || password.isNull()) {
            if (datosPrevios != null) {
                JsonNode previa = leer(datosPrevios).get(CAMPO_PASSWORD);
                if (previa != null) usuario.set(CAMPO_PASSWORD, previa);
            }
        } else if (!password.asText().startsWith("$2")) {
            usuario.put(CAMPO_PASSWORD, passwordEncoder.encode(password.asText()));
        }
    }

    private String sinPassword(String datos) {
        ObjectNode usuario = (ObjectNode) leer(datos);
        usuario.remove(CAMPO_PASSWORD);
        return escribir(usuario);
    }

    private static String idDe(JsonNode item) {
        JsonNode id = item.get("id");
        if (!item.isObject() || id == null || id.isNull()) {
            throw new IllegalArgumentException("Todos los elementos deben tener 'id'.");
        }
        return id.asText();
    }

    private static JsonNode leer(String json) {
        try {
            return JSON.readTree(json);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("JSON invalido: " + e.getOriginalMessage());
        }
    }

    private static String escribir(JsonNode node) {
        try {
            return JSON.writeValueAsString(node);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String texto(String s) {
        return escribir(JSON.getNodeFactory().textNode(s));
    }
}
