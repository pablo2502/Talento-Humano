package com.talentohumano.evaluacion.service;

import com.talentohumano.evaluacion.dto.competencia.CompetenciaRequest;
import com.talentohumano.evaluacion.dto.competencia.CompetenciaResponse;
import com.talentohumano.evaluacion.entity.Competencia;
import com.talentohumano.evaluacion.exception.BusinessException;
import com.talentohumano.evaluacion.exception.ResourceNotFoundException;
import com.talentohumano.evaluacion.repository.CompetenciaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * CRUD de Competencias (catalogo maestro). RF-05.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CompetenciaService {

    private final CompetenciaRepository competenciaRepository;

    public List<CompetenciaResponse> listar() {
        return competenciaRepository.findAll().stream().map(this::toResponse).toList();
    }

    public CompetenciaResponse obtener(Long id) {
        return toResponse(buscarEntidad(id));
    }

    public Competencia buscarEntidad(Long id) {
        return competenciaRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Competencia", id));
    }

    public CompetenciaResponse crear(CompetenciaRequest request) {
        if (competenciaRepository.existsByCodigo(request.codigo())) {
            throw new BusinessException("Ya existe una competencia con el codigo " + request.codigo());
        }
        Competencia competencia = Competencia.builder()
                .codigo(request.codigo())
                .nombre(request.nombre())
                .descripcion(request.descripcion())
                .categoria(request.categoria())
                .nivelEsperado(request.nivelEsperado())
                .estado(request.estado())
                .build();
        return toResponse(competenciaRepository.save(competencia));
    }

    public CompetenciaResponse actualizar(Long id, CompetenciaRequest request) {
        Competencia competencia = buscarEntidad(id);
        if (!competencia.getCodigo().equalsIgnoreCase(request.codigo())
                && competenciaRepository.existsByCodigo(request.codigo())) {
            throw new BusinessException("Ya existe una competencia con el codigo " + request.codigo());
        }
        competencia.setCodigo(request.codigo());
        competencia.setNombre(request.nombre());
        competencia.setDescripcion(request.descripcion());
        competencia.setCategoria(request.categoria());
        competencia.setNivelEsperado(request.nivelEsperado());
        competencia.setEstado(request.estado());
        return toResponse(competenciaRepository.save(competencia));
    }

    public void eliminar(Long id) {
        competenciaRepository.delete(buscarEntidad(id));
    }

    private CompetenciaResponse toResponse(Competencia c) {
        return new CompetenciaResponse(c.getId(), c.getCodigo(), c.getNombre(), c.getDescripcion(),
                c.getCategoria(), c.getNivelEsperado(), c.getEstado());
    }
}
