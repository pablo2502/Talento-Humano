package com.talentohumano.evaluacion.entity.enums;

/**
 * Estado del ciclo de vida de una {@link com.talentohumano.evaluacion.entity.Evaluacion}.
 * <p>
 * El orden declarado aqui (ordinal) es el orden valido de transicion: una evaluacion
 * solo puede avanzar hacia adelante en esta lista, nunca retroceder ni saltar reglas
 * de negocio adicionales. La validacion de la transicion vive en
 * {@code EvaluacionService#cambiarEstado(Long, EstadoEvaluacion)}.
 */
public enum EstadoEvaluacion {
    PENDIENTE,
    EN_PROCESO,
    FINALIZADA,
    CONSOLIDADA,
    CERRADA
}
