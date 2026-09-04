package com.talentohumano.evaluacion.service;

import com.talentohumano.evaluacion.dto.indicador.IndicadorRequest;
import com.talentohumano.evaluacion.dto.indicador.IndicadorResponse;
import com.talentohumano.evaluacion.entity.Competencia;
import com.talentohumano.evaluacion.entity.Comportamiento;
import com.talentohumano.evaluacion.entity.Indicador;
import com.talentohumano.evaluacion.exception.BusinessException;
import com.talentohumano.evaluacion.exception.ResourceNotFoundException;
import com.talentohumano.evaluacion.repository.IndicadorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * CRUD de Indicadores. Un Indicador pertenece a exactamente una Competencia
 * O a exactamente un Comportamiento (XOR). Esa regla no se modela como
 * constraint de base de datos porque un CHECK "exactamente una de dos FK no
 * nula" es especifico de motor y fragil frente a un ORM generico; en su
 * lugar se valida aqui, en la capa de servicio.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class IndicadorService {

    private final IndicadorRepository indicadorRepository;
    private final CompetenciaService competenciaService;
    private final ComportamientoService comportamientoService;

    public List<IndicadorResponse> listar() {
        return indicadorRepository.findAll().stream().map(this::toResponse).toList();
    }

    public IndicadorResponse obtener(Long id) {
        return toResponse(buscarEntidad(id));
    }

    public Indicador buscarEntidad(Long id) {
        return indicadorRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Indicador", id));
    }

    public IndicadorResponse crear(IndicadorRequest request) {
        Competencia competencia = validarYResolverPadres(request);
        Comportamiento comportamiento = request.competenciaId() == null
                ? comportamientoService.buscarEntidad(request.comportamientoId())
                : null;

        Indicador indicador = Indicador.builder()
                .nombre(request.nombre())
                .descripcion(request.descripcion())
                .competencia(competencia)
                .comportamiento(comportamiento)
                .build();
        return toResponse(indicadorRepository.save(indicador));
    }

    public IndicadorResponse actualizar(Long id, IndicadorRequest request) {
        Indicador indicador = buscarEntidad(id);
        Competencia competencia = validarYResolverPadres(request);
        Comportamiento comportamiento = request.competenciaId() == null
                ? comportamientoService.buscarEntidad(request.comportamientoId())
                : null;

        indicador.setNombre(request.nombre());
        indicador.setDescripcion(request.descripcion());
        indicador.setCompetencia(competencia);
        indicador.setComportamiento(comportamiento);
        return toResponse(indicadorRepository.save(indicador));
    }

    public void eliminar(Long id) {
        indicadorRepository.delete(buscarEntidad(id));
    }

    private Competencia validarYResolverPadres(IndicadorRequest request) {
        boolean tieneCompetencia = request.competenciaId() != null;
        boolean tieneComportamiento = request.comportamientoId() != null;

        if (tieneCompetencia == tieneComportamiento) {
            throw new BusinessException(
                    "Un indicador debe pertenecer a exactamente una Competencia o a exactamente un Comportamiento, no a ambos ni a ninguno");
        }
        return tieneCompetencia ? competenciaService.buscarEntidad(request.competenciaId()) : null;
    }

    private IndicadorResponse toResponse(Indicador indicador) {
        return new IndicadorResponse(
                indicador.getId(),
                indicador.getNombre(),
                indicador.getDescripcion(),
                indicador.getCompetencia() != null ? indicador.getCompetencia().getId() : null,
                indicador.getCompetencia() != null ? indicador.getCompetencia().getNombre() : null,
                indicador.getComportamiento() != null ? indicador.getComportamiento().getId() : null,
                indicador.getComportamiento() != null ? indicador.getComportamiento().getNombre() : null
        );
    }
}
