package com.talentohumano.evaluacion.service;

import com.talentohumano.evaluacion.dto.rol.RolRequest;
import com.talentohumano.evaluacion.dto.rol.RolResponse;
import com.talentohumano.evaluacion.entity.Rol;
import com.talentohumano.evaluacion.exception.ResourceNotFoundException;
import com.talentohumano.evaluacion.repository.RolRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * CRUD de Roles. RF-03.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class RolService {

    private final RolRepository rolRepository;

    public List<RolResponse> listar() {
        return rolRepository.findAll().stream().map(this::toResponse).toList();
    }

    public RolResponse obtener(Long id) {
        return toResponse(buscarEntidad(id));
    }

    public Rol buscarEntidad(Long id) {
        return rolRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Rol", id));
    }

    public RolResponse crear(RolRequest request) {
        Rol rol = Rol.builder()
                .nombre(request.nombre())
                .permisos(request.permisos() != null ? request.permisos() : List.of())
                .build();
        return toResponse(rolRepository.save(rol));
    }

    public RolResponse actualizar(Long id, RolRequest request) {
        Rol rol = buscarEntidad(id);
        rol.setNombre(request.nombre());
        rol.setPermisos(request.permisos() != null ? request.permisos() : List.of());
        return toResponse(rolRepository.save(rol));
    }

    public void eliminar(Long id) {
        Rol rol = buscarEntidad(id);
        rolRepository.delete(rol);
    }

    private RolResponse toResponse(Rol rol) {
        return new RolResponse(rol.getId(), rol.getNombre(), rol.getPermisos());
    }
}
