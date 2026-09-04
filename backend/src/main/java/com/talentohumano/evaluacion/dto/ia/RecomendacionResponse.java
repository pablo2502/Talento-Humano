package com.talentohumano.evaluacion.dto.ia;

import java.util.List;

/**
 * Estructura placeholder de la respuesta de recomendaciones de IA (RF-25).
 * <p>
 * IMPORTANTE (RNF-14/RNF-16): estas recomendaciones son unicamente
 * consultivas/orientativas. La IA nunca es fuente de verdad para
 * calificaciones ni decisiones automatizadas; toda decision final la toma
 * una persona.
 */
public record RecomendacionResponse(
        Long colaboradorId,
        String caracterAsesor,
        List<String> recomendaciones,
        String disclaimer
) {
    public static RecomendacionResponse placeholder(Long colaboradorId) {
        return new RecomendacionResponse(
                colaboradorId,
                "CONSULTIVO",
                List.of(
                        "TODO: integrar motor de IA real (ver IaService).",
                        "Ejemplo de salida esperada: 'Reforzar comunicacion asertiva segun brechas detectadas en el ultimo periodo.'"
                ),
                "Estas recomendaciones son orientativas y no constituyen una calificacion oficial (RNF-14/RNF-16)."
        );
    }
}
