package com.talentohumano.evaluacion.service;

import com.talentohumano.evaluacion.dto.perfil.PerfilRequest;
import com.talentohumano.evaluacion.dto.perfil.PerfilResponse;
import com.talentohumano.evaluacion.entity.Competencia;
import com.talentohumano.evaluacion.entity.Comportamiento;
import com.talentohumano.evaluacion.entity.Perfil;
import com.talentohumano.evaluacion.exception.ResourceNotFoundException;
import com.talentohumano.evaluacion.repository.PerfilRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * CRUD de Perfiles de cargo. RF-04.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PerfilService {

    private final PerfilRepository perfilRepository;
    private final CompetenciaService competenciaService;
    private final ComportamientoService comportamientoService;

    public List<PerfilResponse> listar() {
        return perfilRepository.findAll().stream().map(this::toResponse).toList();
    }

    public PerfilResponse obtener(Long id) {
        return toResponse(buscarEntidad(id));
    }

    public Perfil buscarEntidad(Long id) {
        return perfilRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Perfil", id));
    }

    public PerfilResponse crear(PerfilRequest request) {
        Perfil perfil = Perfil.builder()
                .nombre(request.nombre())
                .cargo(request.cargo())
                .area(request.area())
                .descripcion(request.descripcion())
                .nivelEsperado(request.nivelEsperado())
                .estado(request.estado())
                .fechaCreacion(LocalDate.now())
                .competencias(resolverCompetencias(request.competenciaIds()))
                .comportamientos(resolverComportamientos(request.comportamientoIds()))
                .build();
        return toResponse(perfilRepository.save(perfil));
    }

    public PerfilResponse actualizar(Long id, PerfilRequest request) {
        Perfil perfil = buscarEntidad(id);
        perfil.setNombre(request.nombre());
        perfil.setCargo(request.cargo());
        perfil.setArea(request.area());
        perfil.setDescripcion(request.descripcion());
        perfil.setNivelEsperado(request.nivelEsperado());
        perfil.setEstado(request.estado());
        perfil.setCompetencias(resolverCompetencias(request.competenciaIds()));
        perfil.setComportamientos(resolverComportamientos(request.comportamientoIds()));
        return toResponse(perfilRepository.save(perfil));
    }

    public void eliminar(Long id) {
        perfilRepository.delete(buscarEntidad(id));
    }

    private Set<Competencia> resolverCompetencias(List<Long> ids) {
        Set<Competencia> resultado = new HashSet<>();
        if (ids != null) {
            ids.forEach(id -> resultado.add(competenciaService.buscarEntidad(id)));
        }
        return resultado;
    }

    private Set<Comportamiento> resolverComportamientos(List<Long> ids) {
        Set<Comportamiento> resultado = new HashSet<>();
        if (ids != null) {
            ids.forEach(id -> resultado.add(comportamientoService.buscarEntidad(id)));
        }
        return resultado;
    }

    private PerfilResponse toResponse(Perfil perfil) {
        return new PerfilResponse(
                perfil.getId(),
                perfil.getNombre(),
                perfil.getCargo(),
                perfil.getArea(),
                perfil.getDescripcion(),
                perfil.getNivelEsperado(),
                perfil.getEstado(),
                perfil.getFechaCreacion(),
                perfil.getCompetencias().stream().map(Competencia::getNombre).toList(),
                perfil.getComportamientos().stream().map(Comportamiento::getNombre).toList()
        );
    }
}
