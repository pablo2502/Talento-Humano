package com.talentohumano.evaluacion.service;

import com.talentohumano.evaluacion.dto.informe.InformeRequest;
import com.talentohumano.evaluacion.dto.informe.InformeResponse;
import com.talentohumano.evaluacion.entity.Informe;
import com.talentohumano.evaluacion.entity.Usuario;
import com.talentohumano.evaluacion.entity.enums.TipoInforme;
import com.talentohumano.evaluacion.exception.BusinessException;
import com.talentohumano.evaluacion.exception.ResourceNotFoundException;
import com.talentohumano.evaluacion.repository.InformeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Generacion de informes (individual/area/general). RF-19 a RF-21.
 * <p>
 * STUB: este servicio deja el registro (metadata) del informe en base de
 * datos y responde una URL de descarga ficticia. NO genera un PDF/documento
 * real todavia.
 * <p>
 * TODO: integrar una libreria de generacion de PDF (p.ej. OpenPDF o iText)
 * para renderizar el contenido real del informe a partir de Resultado /
 * Consolidacion, y persistir el archivo (filesystem o storage externo),
 * devolviendo una URL de descarga valida en {@link InformeResponse#urlDescarga()}.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class InformeService {

    private final InformeRepository informeRepository;
    private final UsuarioService usuarioService;

    public List<InformeResponse> listar() {
        return informeRepository.findAll().stream().map(this::toResponse).toList();
    }

    public InformeResponse obtener(Long id) {
        Informe informe = informeRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Informe", id));
        return toResponse(informe);
    }

    public InformeResponse generar(InformeRequest request) {
        validarReferencia(request);

        Usuario colaborador = request.colaboradorId() != null ? usuarioService.buscarEntidad(request.colaboradorId()) : null;

        Informe informe = Informe.builder()
                .tipo(request.tipo())
                .formato(request.formato())
                .fechaGeneracion(LocalDateTime.now())
                .colaborador(colaborador)
                .area(request.area())
                .build();
        Informe guardado = informeRepository.save(informe);

        // TODO: disparar la generacion real del documento (async o sincrono) aqui.
        return toResponse(guardado);
    }

    private void validarReferencia(InformeRequest request) {
        if (request.tipo() == TipoInforme.INDIVIDUAL && request.colaboradorId() == null) {
            throw new BusinessException("Un informe INDIVIDUAL requiere colaboradorId");
        }
        if (request.tipo() == TipoInforme.AREA && (request.area() == null || request.area().isBlank())) {
            throw new BusinessException("Un informe AREA requiere el campo area");
        }
    }

    private InformeResponse toResponse(Informe informe) {
        // STUB: URL ficticia hasta que exista generacion/almacenamiento real de archivos.
        String urlDescarga = "/api/v1/informes/" + informe.getId() + "/descargar";
        return new InformeResponse(
                informe.getId(),
                informe.getTipo(),
                informe.getFormato(),
                informe.getFechaGeneracion(),
                informe.getColaborador() != null ? informe.getColaborador().getId() : null,
                informe.getArea(),
                urlDescarga
        );
    }
}
