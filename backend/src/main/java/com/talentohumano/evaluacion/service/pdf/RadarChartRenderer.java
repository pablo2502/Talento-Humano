package com.talentohumano.evaluacion.service.pdf;

import javax.imageio.ImageIO;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.Point;
import java.awt.RenderingHints;
import java.awt.geom.Path2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

/**
 * Dibuja el grafico radar de competencias que acompana la tabla de puntajes
 * en la plantilla "Perfil de competencias", replicando los colores de marca
 * (navy #172962 sobre grilla gris claro).
 */
final class RadarChartRenderer {

    private static final Color NAVY = new Color(0x17, 0x29, 0x62);
    private static final Color NAVY_FILL = new Color(0x17, 0x29, 0x62, 55);
    private static final Color GRID = new Color(0xD5, 0xD8, 0xDC);
    private static final Color LABEL = new Color(0x40, 0x40, 0x40);
    private static final int SIZE = 640;

    private RadarChartRenderer() {
    }

    static byte[] render(List<InformePdfData.PuntajeCompetencia> datos, double escalaMax) {
        BufferedImage image = new BufferedImage(SIZE, SIZE, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = image.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

        int n = datos.size();
        int cx = SIZE / 2;
        int cy = SIZE / 2;
        int radius = (int) (SIZE * 0.26);
        double angleStep = 2 * Math.PI / n;
        double startAngle = -Math.PI / 2;

        dibujarGrilla(g, cx, cy, radius, n, angleStep, startAngle, escalaMax);
        dibujarPoligonoDatos(g, datos, cx, cy, radius, n, angleStep, startAngle, escalaMax);
        dibujarEtiquetas(g, datos, cx, cy, radius, n, angleStep, startAngle);

        g.dispose();
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(image, "png", out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static void dibujarGrilla(Graphics2D g, int cx, int cy, int radius, int n,
                                       double angleStep, double startAngle, double escalaMax) {
        g.setColor(GRID);
        g.setStroke(new BasicStroke(1f));
        int anillos = (int) Math.round(escalaMax);
        for (int r = 1; r <= anillos; r++) {
            double rr = radius * r / (double) anillos;
            Path2D anillo = new Path2D.Double();
            for (int i = 0; i <= n; i++) {
                double a = startAngle + angleStep * i;
                double x = cx + rr * Math.cos(a);
                double y = cy + rr * Math.sin(a);
                if (i == 0) {
                    anillo.moveTo(x, y);
                } else {
                    anillo.lineTo(x, y);
                }
            }
            g.draw(anillo);
        }
        for (int i = 0; i < n; i++) {
            double a = startAngle + angleStep * i;
            int x = (int) (cx + radius * Math.cos(a));
            int y = (int) (cy + radius * Math.sin(a));
            g.drawLine(cx, cy, x, y);
        }
    }

    private static void dibujarPoligonoDatos(Graphics2D g, List<InformePdfData.PuntajeCompetencia> datos,
                                              int cx, int cy, int radius, int n,
                                              double angleStep, double startAngle, double escalaMax) {
        Path2D poligono = new Path2D.Double();
        Point[] puntos = new Point[n];
        for (int i = 0; i < n; i++) {
            double a = startAngle + angleStep * i;
            double valor = Math.max(0, Math.min(datos.get(i).puntaje(), escalaMax));
            double rr = radius * (valor / escalaMax);
            int x = (int) (cx + rr * Math.cos(a));
            int y = (int) (cy + rr * Math.sin(a));
            puntos[i] = new Point(x, y);
            if (i == 0) {
                poligono.moveTo(x, y);
            } else {
                poligono.lineTo(x, y);
            }
        }
        poligono.closePath();

        g.setColor(NAVY_FILL);
        g.fill(poligono);
        g.setColor(NAVY);
        g.setStroke(new BasicStroke(3f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        g.draw(poligono);
        for (Point p : puntos) {
            g.fillOval(p.x - 5, p.y - 5, 10, 10);
        }
    }

    private static void dibujarEtiquetas(Graphics2D g, List<InformePdfData.PuntajeCompetencia> datos,
                                          int cx, int cy, int radius, int n,
                                          double angleStep, double startAngle) {
        g.setFont(new Font("SansSerif", Font.PLAIN, 17));
        g.setColor(LABEL);
        FontMetrics fm = g.getFontMetrics();
        int margen = 40;
        for (int i = 0; i < n; i++) {
            double a = startAngle + angleStep * i;
            double cos = Math.cos(a);
            int lx = (int) (cx + (radius + margen) * cos);
            int ly = (int) (cy + (radius + margen) * Math.sin(a));
            String etiqueta = datos.get(i).nombre();
            int w = fm.stringWidth(etiqueta);
            int drawX = lx - (int) (w * ((cos + 1) / 2.0));
            drawX = Math.max(2, Math.min(drawX, SIZE - w - 2));
            g.drawString(etiqueta, drawX, ly);
        }
    }
}
