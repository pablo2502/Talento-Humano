package com.talentohumano.evaluacion.service.pdf;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;

import java.awt.Color;

/**
 * Encabezado y pie de pagina de la plantilla "Perfil de competencias":
 * logo + nombre de la institucion arriba, texto de confidencialidad y
 * numero de pagina abajo. Se repite igual en todos los tipos de informe;
 * lo unico que cambia entre INDIVIDUAL/AREA/GENERAL es el contenido del
 * cuerpo (ver {@link InformePdfRenderer}).
 */
final class InformeHeaderFooterEvent extends PdfPageEventHelper {

    private static final Color NAVY = new Color(0x17, 0x29, 0x62);
    private static final Color GRAY_TEXT = new Color(0x6A, 0x6F, 0x75);
    private static final Color GRID = new Color(0xD5, 0xD8, 0xDC);

    private final Image logo;

    InformeHeaderFooterEvent(byte[] logoBytes) {
        Image img = null;
        if (logoBytes != null) {
            try {
                img = Image.getInstance(logoBytes);
                img.scaleToFit(90, 34);
            } catch (Exception ignored) {
                img = null;
            }
        }
        this.logo = img;
    }

    @Override
    public void onEndPage(PdfWriter writer, Document document) {
        PdfContentByte cb = writer.getDirectContent();
        float left = document.leftMargin();
        float right = document.getPageSize().getWidth() - document.rightMargin();
        float top = document.getPageSize().getHeight() - 34;

        if (logo != null) {
            try {
                Image copia = Image.getInstance(logo);
                copia.setAbsolutePosition(left, top - 4);
                cb.addImage(copia);
            } catch (Exception ignored) {
                // El logo es decorativo: si falla el render no debe interrumpir el informe.
            }
        }

        Font institucionFont = new Font(Font.HELVETICA, 9, Font.BOLD, NAVY);
        ColumnText.showTextAligned(cb, Element.ALIGN_LEFT,
                new Phrase("Fundacion Universitaria Empresarial", institucionFont),
                left + (logo != null ? 96 : 0), top + 8, 0);

        Font sistemaFont = new Font(Font.HELVETICA, 9, Font.NORMAL, GRAY_TEXT);
        ColumnText.showTextAligned(cb, Element.ALIGN_RIGHT,
                new Phrase("Talento humano", sistemaFont), right, top + 8, 0);

        cb.setColorStroke(GRID);
        cb.setLineWidth(0.75f);
        cb.moveTo(left, top - 10);
        cb.lineTo(right, top - 10);
        cb.stroke();

        float footerY = document.bottomMargin() - 18;
        cb.setColorStroke(GRID);
        cb.moveTo(left, footerY + 14);
        cb.lineTo(right, footerY + 14);
        cb.stroke();

        Font footerFont = new Font(Font.HELVETICA, 7.5f, Font.NORMAL, GRAY_TEXT);
        ColumnText.showTextAligned(cb, Element.ALIGN_LEFT,
                new Phrase("Uniempresarial - Gestion Humana - Documento confidencial", footerFont),
                left, footerY, 0);
        ColumnText.showTextAligned(cb, Element.ALIGN_RIGHT,
                new Phrase("Pagina " + writer.getPageNumber(), footerFont),
                right, footerY, 0);
    }
}
