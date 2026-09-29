package com.talentohumano.evaluacion.service.pdf;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

/**
 * Renderiza un {@link InformePdfData} sobre la plantilla PDF unica del
 * sistema ("Perfil de competencias" - Documentos/Plantilla Formato pdf.docx):
 * cabecera institucional, titulo, franja de datos, tabla de competencias con
 * grafico radar, y plan de desarrollo. Este layout es el mismo sin importar
 * el {@link com.talentohumano.evaluacion.entity.enums.TipoInforme}; lo unico
 * que varia por tipo es el contenido en {@code data}, resuelto en
 * {@link com.talentohumano.evaluacion.service.InformeService}.
 */
@Component
public class InformePdfRenderer {

    private static final Color NAVY = new Color(0x17, 0x29, 0x62);
    private static final Color GRAY_TEXT = new Color(0x6A, 0x6F, 0x75);
    private static final Color GRAY_BORDER = new Color(0xD5, 0xD8, 0xDC);
    private static final Color DARK_TEXT = new Color(0x22, 0x22, 0x22);

    private final byte[] logoBytes;

    public InformePdfRenderer() {
        this.logoBytes = cargarLogo();
    }

    private static byte[] cargarLogo() {
        try (var in = new ClassPathResource("pdf/logo-uniempresarial.png").getInputStream()) {
            return in.readAllBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public byte[] render(InformePdfData data) {
        Document document = new Document(PageSize.A4, 40, 40, 70, 55);
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new InformeHeaderFooterEvent(logoBytes));
            document.open();

            escribirTitulo(document, data);
            escribirCamposInfo(document, data);
            escribirCompetencias(document, data);
            escribirPlanDesarrollo(document, data);

            document.close();
            return out.toByteArray();
        } catch (DocumentException e) {
            throw new IllegalStateException("No fue posible generar el PDF del informe", e);
        }
    }

    private void escribirTitulo(Document document, InformePdfData data) throws DocumentException {
        Font tituloFont = new Font(Font.HELVETICA, 22, Font.BOLD, NAVY);
        Paragraph titulo = new Paragraph(data.titulo(), tituloFont);
        titulo.setSpacingBefore(4f);
        titulo.setSpacingAfter(2f);
        document.add(titulo);

        Font subtituloFont = new Font(Font.HELVETICA, 11, Font.NORMAL, GRAY_TEXT);
        Paragraph subtitulo = new Paragraph(data.subtitulo(), subtituloFont);
        subtitulo.setSpacingAfter(16f);
        document.add(subtitulo);
    }

    private void escribirCamposInfo(Document document, InformePdfData data) throws DocumentException {
        List<InformePdfData.CampoInfo> campos = data.camposInfo();
        if (campos.isEmpty()) {
            return;
        }
        PdfPTable tabla = new PdfPTable(campos.size());
        tabla.setWidthPercentage(100);
        tabla.setSpacingAfter(20f);
        Font etiquetaFont = new Font(Font.HELVETICA, 8, Font.NORMAL, GRAY_TEXT);
        Font valorFont = new Font(Font.HELVETICA, 11.5f, Font.BOLD, DARK_TEXT);
        for (InformePdfData.CampoInfo campo : campos) {
            PdfPCell celda = new PdfPCell();
            celda.setBorder(Rectangle.BOTTOM);
            celda.setBorderColor(GRAY_BORDER);
            celda.setBorderWidthBottom(1f);
            celda.setPaddingTop(6f);
            celda.setPaddingBottom(8f);
            celda.setPaddingRight(10f);

            Paragraph contenido = new Paragraph();
            contenido.add(new Chunk(campo.etiqueta().toUpperCase() + "\n", etiquetaFont));
            contenido.add(new Chunk(campo.valor(), valorFont));
            celda.addElement(contenido);
            tabla.addCell(celda);
        }
        document.add(tabla);
    }

    private void escribirCompetencias(Document document, InformePdfData data) throws DocumentException {
        List<InformePdfData.PuntajeCompetencia> competencias = data.competencias();
        if (competencias.isEmpty()) {
            Font italica = new Font(Font.HELVETICA, 10, Font.ITALIC, GRAY_TEXT);
            document.add(new Paragraph("No se registran calificaciones de competencias para este periodo.", italica));
            return;
        }

        PdfPTable tablaCompetencias = new PdfPTable(2);
        tablaCompetencias.setWidthPercentage(100);
        tablaCompetencias.setWidths(new float[]{3f, 1f});

        Font headerFont = new Font(Font.HELVETICA, 9.5f, Font.BOLD, NAVY);
        tablaCompetencias.addCell(celdaHeader("Competencia", headerFont, Element.ALIGN_LEFT));
        tablaCompetencias.addCell(celdaHeader("Puntaje", headerFont, Element.ALIGN_CENTER));

        Font filaFont = new Font(Font.HELVETICA, 9.5f, Font.NORMAL, DARK_TEXT);
        Font filaBoldFont = new Font(Font.HELVETICA, 9.5f, Font.BOLD, DARK_TEXT);
        for (InformePdfData.PuntajeCompetencia c : competencias) {
            tablaCompetencias.addCell(celdaFila(c.nombre(), filaFont, Element.ALIGN_LEFT));
            tablaCompetencias.addCell(celdaFila(String.format("%.1f", c.puntaje()), filaBoldFont, Element.ALIGN_CENTER));
        }

        Image radar = null;
        boolean conRadar = competencias.size() >= 3;
        if (conRadar) {
            try {
                byte[] png = RadarChartRenderer.render(competencias, 5.0);
                radar = Image.getInstance(png);
                radar.scaleToFit(230, 230);
            } catch (Exception e) {
                radar = null;
            }
        }

        PdfPTable layout = new PdfPTable(radar != null ? 2 : 1);
        layout.setWidthPercentage(100);
        if (radar != null) {
            layout.setWidths(new float[]{1.05f, 1f});
        }
        layout.setSpacingBefore(4f);
        layout.setSpacingAfter(18f);

        PdfPCell tablaCell = new PdfPCell(tablaCompetencias);
        tablaCell.setBorder(Rectangle.NO_BORDER);
        tablaCell.setPaddingRight(radar != null ? 16f : 0f);
        layout.addCell(tablaCell);

        if (radar != null) {
            PdfPCell radarCell = new PdfPCell(radar, false);
            radarCell.setBorder(Rectangle.NO_BORDER);
            radarCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            radarCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            layout.addCell(radarCell);
        }

        document.add(layout);
    }

    private void escribirPlanDesarrollo(Document document, InformePdfData data) throws DocumentException {
        if (data.planDesarrollo().isEmpty()) {
            return;
        }
        Font seccionFont = new Font(Font.HELVETICA, 14, Font.BOLD, NAVY);
        Paragraph seccion = new Paragraph("Plan de desarrollo", seccionFont);
        seccion.setSpacingBefore(6f);
        seccion.setSpacingAfter(10f);
        document.add(seccion);

        PdfPTable tabla = new PdfPTable(3);
        tabla.setWidthPercentage(100);
        tabla.setWidths(new float[]{2.4f, 1.1f, 0.9f});

        Font headerFont = new Font(Font.HELVETICA, 9.5f, Font.BOLD, NAVY);
        tabla.addCell(celdaHeader("Accion", headerFont, Element.ALIGN_LEFT));
        tabla.addCell(celdaHeader("Responsable", headerFont, Element.ALIGN_LEFT));
        tabla.addCell(celdaHeader("Fecha", headerFont, Element.ALIGN_LEFT));

        Font filaFont = new Font(Font.HELVETICA, 9.5f, Font.NORMAL, GRAY_TEXT);
        for (InformePdfData.AccionPlan accion : data.planDesarrollo()) {
            tabla.addCell(celdaFila(accion.accion(), filaFont, Element.ALIGN_LEFT));
            tabla.addCell(celdaFila(accion.responsable(), filaFont, Element.ALIGN_LEFT));
            tabla.addCell(celdaFila(accion.fecha(), filaFont, Element.ALIGN_LEFT));
        }
        document.add(tabla);
    }

    private PdfPCell celdaHeader(String texto, Font font, int alineacion) {
        PdfPCell celda = new PdfPCell(new Phrase(texto, font));
        celda.setBorder(Rectangle.BOTTOM);
        celda.setBorderColor(NAVY);
        celda.setBorderWidthBottom(2f);
        celda.setPadding(6f);
        celda.setHorizontalAlignment(alineacion);
        return celda;
    }

    private PdfPCell celdaFila(String texto, Font font, int alineacion) {
        PdfPCell celda = new PdfPCell(new Phrase(texto, font));
        celda.setBorder(Rectangle.BOTTOM);
        celda.setBorderColor(GRAY_BORDER);
        celda.setBorderWidthBottom(1f);
        celda.setPadding(6f);
        celda.setHorizontalAlignment(alineacion);
        return celda;
    }
}
