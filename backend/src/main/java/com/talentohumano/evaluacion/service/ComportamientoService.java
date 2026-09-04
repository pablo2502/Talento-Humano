package com.talentohumano.evaluacion.service;

import com.talentohumano.evaluacion.dto.comportamiento.ComportamientoRequest;
import com.talentohumano.evaluacion.dto.comportamiento.ComportamientoResponse;
import com.talentohumano.evaluacion.entity.Comportamiento;
import com.talentohumano.evaluacion.exception.BusinessException;
import com.talentohumano.evaluacion.exception.ResourceNotFoundException;
import com.talentohumano.evaluacion.repository.ComportamientoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * CRUD de Comportamientos (catalogo maestro). RF-06.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ComportamientoService {

    private final ComportamientoRepository comportamientoRepository;

    public List<ComportamientoResponse> listar() {
        return comportamientoRepository.findAll().stream().map(this::toResponse).toList();
    }

    public ComportamientoResponse obtener(Long id) {
        return toResponse(buscarEntidad(id));
    }

    public Comportamiento buscarEntidad(Long id) {
        return comportamientoRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Comportamiento", id));
    }

    public ComportamientoResponse crear(ComportamientoRequest request) {
        if (comportamientoRepository.existsByCodigo(request.codigo())) {
            throw new BusinessException("Ya existe un comportamiento con el codigo " + request.codigo());
        }
        Comportamiento comportamiento = Comportamiento.builder()
                .codigo(request.codigo())
                .nombre(request.nombre())
                .descripcion(request.descripcion())
                .estado(request.estado())
                .build();
        return toResponse(comportamientoRepository.save(comportamiento));
    }

    public ComportamientoResponse actualizar(Long id, ComportamientoRequest request) {
        Comportamiento comportamiento = buscarEntidad(id);
        if (!comportamiento.getCodigo().equalsIgnoreCase(request.codigo())
                && comportamientoRepository.existsByCodigo(request.codigo())) {
            throw new BusinessException("Ya existe un comportamiento con el codigo " + request.codigo());
        }
        comportamiento.setCodigo(request.codigo());
        comportamiento.setNombre(request.nombre());
        comportamiento.setDescripcion(request.descripcion());
        comportamiento.setEstado(request.estado());
        return toResponse(comportamientoRepository.save(comportamiento));
    }

    public void eliminar(Long id) {
        comportamientoRepository.delete(buscarEntidad(id));
    }

    private ComportamientoResponse toResponse(Comportamiento c) {
        return new ComportamientoResponse(c.getId(), c.getCodigo(), c.getNombre(), c.getDescripcion(), c.getEstado());
    }
}
