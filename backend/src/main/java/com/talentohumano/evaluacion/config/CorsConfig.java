package com.talentohumano.evaluacion.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * CORS permisivo para desarrollo local: permite cualquier puerto de
 * localhost (el frontend puede correr en cualquier puerto de Vite/CRA/etc.)
 * y el origen "null" que envian los navegadores al abrir un archivo HTML
 * directamente desde disco (file://), util para pruebas rapidas del
 * frontend sin levantar un servidor de desarrollo.
 * <p>
 * TODO: en produccion, restringir allowedOriginPatterns al dominio real del
 * frontend desplegado en vez de "localhost:*"/"null".
 */
@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of(
                "http://localhost:*",
                "http://127.0.0.1:*",
                "null"
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
