package com.talentohumano.evaluacion.service;

import com.talentohumano.evaluacion.dto.periodo.PeriodoRequest;
import com.talentohumano.evaluacion.dto.periodo.PeriodoResponse;
import com.talentohumano.evaluacion.entity.Periodo;
import com.talentohumano.evaluacion.entity.enums.EstadoPeriodo;
import com.talentohumano.evaluacion.exception.BusinessException;
import com.talentohumano.evaluacion.exception.ResourceNotFoundException;
import com.talentohumano.evaluacion.repository.PeriodoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * CRUD de Periodos de evaluacion + activar/cerrar. RF-08.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PeriodoService {

    private final PeriodoRepository periodoRepository;

    public List<PeriodoResponse> listar() {
        return periodoRepository.findAll().stream().map(this::toResponse).toList();
    }

    public PeriodoResponse obtener(Long id) {
        return toResponse(buscarEntidad(id));
    }

    public Periodo buscarEntidad(Long id) {
        return periodoRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Periodo", id));
    }

    public PeriodoResponse crear(PeriodoRequest request) {
        validarFechas(request);
        Periodo periodo = Periodo.builder()
                .nombre(request.nombre())
                .fechaInicio(request.fechaInicio())
                .fechaFin(request.fechaFin())
                .estado(EstadoPeriodo.ACTIVO)
                .build();
        return toResponse(periodoRepository.save(periodo));
    }

    public PeriodoResponse actualizar(Long id, PeriodoRequest request) {
        validarFechas(request);
        Periodo periodo = buscarEntidad(id);
        periodo.setNombre(request.nombre());
        periodo.setFechaInicio(request.fechaInicio());
        periodo.setFechaFin(request.fechaFin());
        return toResponse(periodoRepository.save(periodo));
    }

    public void eliminar(Long id) {
        periodoRepository.delete(buscarEntidad(id));
    }

    public PeriodoResponse activar(Long id) {
        Periodo periodo = buscarEntidad(id);
        periodo.setEstado(EstadoPeriodo.ACTIVO);
        return toResponse(periodoRepository.save(periodo));
    }

    public PeriodoResponse cerrar(Long id) {
        Periodo periodo = buscarEntidad(id);
        if (periodo.getEstado() == EstadoPeriodo.CERRADO) {
            throw new BusinessException("El periodo " + id + " ya se encuentra cerrado");
        }
        // TODO: antes de cerrar definitivamente, validar que todas las evaluaciones
        // del periodo esten en estado CERRADA (o forzar su cierre en cascada segun
        // la politica de negocio que se defina para RF-08/RF-13).
        periodo.setEstado(EstadoPeriodo.CERRADO);
        return toResponse(periodoRepository.save(periodo));
    }

    private void validarFechas(PeriodoRequest request) {
        if (request.fechaFin().isBefore(request.fechaInicio())) {
            throw new BusinessException("La fecha fin no puede ser anterior a la fecha inicio");
        }
    }

    private PeriodoResponse toResponse(Periodo periodo) {
        return new PeriodoResponse(periodo.getId(), periodo.getNombre(), periodo.getFechaInicio(),
                periodo.getFechaFin(), periodo.getEstado());
    }
}
