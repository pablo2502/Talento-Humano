package com.talentohumano.evaluacion.service;

import com.talentohumano.evaluacion.dto.usuario.UsuarioRequest;
import com.talentohumano.evaluacion.dto.usuario.UsuarioResponse;
import com.talentohumano.evaluacion.entity.Perfil;
import com.talentohumano.evaluacion.entity.Rol;
import com.talentohumano.evaluacion.entity.Usuario;
import com.talentohumano.evaluacion.exception.BusinessException;
import com.talentohumano.evaluacion.exception.ResourceNotFoundException;
import com.talentohumano.evaluacion.repository.PerfilRepository;
import com.talentohumano.evaluacion.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * CRUD de Usuarios. RF-02.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final RolService rolService;
    private final PerfilRepository perfilRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UsuarioResponse> listar() {
        return usuarioRepository.findAll().stream().map(this::toResponse).toList();
    }

    public UsuarioResponse obtener(Long id) {
        return toResponse(buscarEntidad(id));
    }

    public Usuario buscarEntidad(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Usuario", id));
    }

    public UsuarioResponse crear(UsuarioRequest request) {
        if (usuarioRepository.existsByCorreo(request.correo())) {
            throw new BusinessException("Ya existe un usuario con el correo " + request.correo());
        }
        if (!StringUtils.hasText(request.password())) {
            throw new BusinessException("La contrasena es obligatoria al crear un usuario");
        }
        Rol rol = rolService.buscarEntidad(request.rolId());
        Perfil perfil = resolverPerfil(request.perfilId());

        Usuario usuario = Usuario.builder()
                .nombre(request.nombre())
                .correo(request.correo())
                .passwordHash(passwordEncoder.encode(request.password()))
                .estado(request.estado())
                .fechaIngreso(request.fechaIngreso())
                .rol(rol)
                .perfil(perfil)
                .build();
        return toResponse(usuarioRepository.save(usuario));
    }

    public UsuarioResponse actualizar(Long id, UsuarioRequest request) {
        Usuario usuario = buscarEntidad(id);

        if (!usuario.getCorreo().equalsIgnoreCase(request.correo())
                && usuarioRepository.existsByCorreo(request.correo())) {
            throw new BusinessException("Ya existe un usuario con el correo " + request.correo());
        }

        usuario.setNombre(request.nombre());
        usuario.setCorreo(request.correo());
        usuario.setEstado(request.estado());
        usuario.setFechaIngreso(request.fechaIngreso());
        usuario.setRol(rolService.buscarEntidad(request.rolId()));
        usuario.setPerfil(resolverPerfil(request.perfilId()));

        if (StringUtils.hasText(request.password())) {
            usuario.setPasswordHash(passwordEncoder.encode(request.password()));
        }

        return toResponse(usuarioRepository.save(usuario));
    }

    public void eliminar(Long id) {
        Usuario usuario = buscarEntidad(id);
        usuarioRepository.delete(usuario);
    }

    /**
     * Filtro basico usado por BusquedaController (RF-22): nombre parcial y/o
     * estado exacto. TODO: extender a filtros por rol, perfil, area, rango de
     * fecha de ingreso, etc. cuando se defina el detalle completo de RF-22.
     */
    public List<UsuarioResponse> buscar(String nombre, String estado) {
        Specification<Usuario> spec = Specification.where(null);
        if (StringUtils.hasText(nombre)) {
            spec = spec.and((root, query, cb) ->
                    cb.like(cb.lower(root.get("nombre")), "%" + nombre.toLowerCase() + "%"));
        }
        if (StringUtils.hasText(estado)) {
            spec = spec.and((root, query, cb) ->
                    cb.equal(root.get("estado"), com.talentohumano.evaluacion.entity.enums.EstadoUsuario.valueOf(estado.toUpperCase())));
        }
        return usuarioRepository.findAll(spec).stream().map(this::toResponse).toList();
    }

    private Perfil resolverPerfil(Long perfilId) {
        if (perfilId == null) {
            return null;
        }
        return perfilRepository.findById(perfilId)
                .orElseThrow(() -> ResourceNotFoundException.of("Perfil", perfilId));
    }

    private UsuarioResponse toResponse(Usuario usuario) {
        return new UsuarioResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getCorreo(),
                usuario.getEstado(),
                usuario.getFechaIngreso(),
                usuario.getRol() != null ? usuario.getRol().getId() : null,
                usuario.getRol() != null ? usuario.getRol().getNombre() : null,
                usuario.getPerfil() != null ? usuario.getPerfil().getId() : null,
                usuario.getPerfil() != null ? usuario.getPerfil().getNombre() : null
        );
    }
}
