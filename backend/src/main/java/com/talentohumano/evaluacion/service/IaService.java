package com.talentohumano.evaluacion.service;

import com.talentohumano.evaluacion.dto.ia.RecomendacionResponse;
import org.springframework.stereotype.Service;

/**
 * Integracion con motor de recomendaciones de IA. RF-25.
 * <p>
 * STUB: retorna una estructura placeholder. RNF-14/RNF-16 exigen que la IA
 * sea unicamente consultiva/orientativa y jamas la fuente de verdad de una
 * calificacion; ese contrato de "solo lectura, no autoritativo" debe
 * preservarse cuando se implemente la integracion real.
 * <p>
 * TODO: integrar un proveedor real (p.ej. una API de LLM) que reciba el
 * historial de Resultado/Consolidacion del colaborador y devuelva
 * recomendaciones de desarrollo. Anadir manejo de errores/timeout propio de
 * una llamada externa, y cachear resultados por colaborador+periodo para no
 * disparar la integracion en cada solicitud.
 */
@Service
public class IaService {

    public RecomendacionResponse obtenerRecomendaciones(Long colaboradorId) {
        // TODO: reemplazar por llamada real al motor de IA.
        return RecomendacionResponse.placeholder(colaboradorId);
    }
}
