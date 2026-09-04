package com.talentohumano.evaluacion.service;

import com.talentohumano.evaluacion.entity.Usuario;
import com.talentohumano.evaluacion.entity.enums.EstadoUsuario;
import com.talentohumano.evaluacion.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Asignacion automatica de evaluadores a partir de la estructura organizacional.
 * <p>
 * TODO (RF-09 real): la asignacion real debe derivarse del organigrama (jefe
 * directo del colaborador, gerente del area, y clientes internos/externos
 * configurados por perfil/proyecto), posiblemente desde un modulo de
 * estructura organizacional que todavia no existe en este esqueleto. Aqui se
 * implementa un mock simple de tipo "round robin por rol" solo para que el
 * flujo de creacion de evaluaciones sea demostrable de punta a punta:
 * selecciona, entre los usuarios ACTIVOS cuyo Rol coincide con el
 * {@code tipoEvaluador} solicitado, el primero distinto del propio
 * colaborador. En un sistema real esto NO deberia ser aleatorio/rotativo,
 * sino derivado de relaciones jerarquicas explicitas.
 */
@Service
@RequiredArgsConstructor
public class AsignacionEvaluadorService {

    private final UsuarioRepository usuarioRepository;

    /**
     * Sugiere un evaluador activo para el {@code colaborador} dado, segun
     * {@code tipoEvaluador} (JEFE/GERENTE/CLIENTE), buscando por nombre de Rol.
     */
    public Optional<Usuario> sugerirEvaluador(Usuario colaborador, String tipoEvaluador) {
        String rolBuscado = mapearTipoEvaluadorARol(tipoEvaluador);

        List<Usuario> candidatos = usuarioRepository.findAll().stream()
                .filter(u -> u.getEstado() == EstadoUsuario.ACTIVO)
                .filter(u -> u.getRol() != null && rolBuscado.equalsIgnoreCase(u.getRol().getNombre()))
                .filter(u -> !u.getId().equals(colaborador.getId()))
                .toList();

        // Mock round-robin: simplemente el primer candidato disponible.
        // TODO: reemplazar por logica de organigrama real + balanceo de carga.
        return candidatos.stream().findFirst();
    }

    private String mapearTipoEvaluadorARol(String tipoEvaluador) {
        return switch (tipoEvaluador == null ? "" : tipoEvaluador.toUpperCase()) {
            case "JEFE" -> "JEFE_EVALUADOR";
            case "GERENTE" -> "GERENTE";
            case "CLIENTE" -> "CLIENTE_EVALUADOR";
            default -> tipoEvaluador == null ? "" : tipoEvaluador.toUpperCase();
        };
    }
}
