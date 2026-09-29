package com.talentohumano.evaluacion.service.pdf;

import java.util.List;

/**
 * Contenido ya resuelto de un informe, listo para ser dibujado sobre la
 * plantilla PDF por {@link InformePdfRenderer}. Un mismo renderizador
 * produce documentos distintos segun el {@code tipo} de informe (RF-19 a
 * RF-21): lo que cambia entre INDIVIDUAL/AREA/GENERAL es exclusivamente el
 * contenido de esta clase, nunca el layout de la plantilla.
 */
public record InformePdfData(
        String titulo,
        String subtitulo,
        List<CampoInfo> camposInfo,
        List<PuntajeCompetencia> competencias,
        List<AccionPlan> planDesarrollo
) {

    public record CampoInfo(String etiqueta, String valor) {
    }

    public record PuntajeCompetencia(String nombre, double puntaje) {
    }

    public record AccionPlan(String accion, String responsable, String fecha) {
    }
}
