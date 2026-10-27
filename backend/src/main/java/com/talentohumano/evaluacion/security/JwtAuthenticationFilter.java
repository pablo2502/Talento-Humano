package com.talentohumano.evaluacion.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Filtro que extrae y valida el JWT de la cabecera Authorization en cada
 * request, y si es valido, puebla el SecurityContext.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String HEADER = "Authorization";
    private static final String PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        String header = request.getHeader(HEADER);

        if (header == null || !header.startsWith(PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(PREFIX.length());
        Claims claims = null;
        try {
            claims = jwtService.extraerClaims(token);
        } catch (Exception ex) {
            // Token invalido/expirado/corrupto: se deja la request sin autenticar;
            // Spring Security respondera 401/403 mas adelante en la cadena segun la regla de la ruta.
        }

        if (claims != null && JwtService.ALCANCE_DATOS.equals(claims.get(JwtService.CLAIM_ALCANCE))) {
            // Token del frontend 360° (/api/v2): solo vale para esa API.
            if (request.getRequestURI().startsWith(request.getContextPath() + "/api/v2/")
                    && SecurityContextHolder.getContext().getAuthentication() == null) {
                List<SimpleGrantedAuthority> autoridades = new ArrayList<>();
                autoridades.add(new SimpleGrantedAuthority("ROLE_DATOS"));
                if (Boolean.TRUE.equals(claims.get(JwtService.CLAIM_ADMIN, Boolean.class))) {
                    autoridades.add(new SimpleGrantedAuthority("ROLE_DATOS_ADMIN"));
                }
                SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken(claims.getSubject(), null, autoridades));
            }
            filterChain.doFilter(request, response);
            return;
        }

        String username = claims != null ? claims.getSubject() : null;
        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            if (jwtService.esTokenValido(token, userDetails)) {
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        filterChain.doFilter(request, response);
    }
}
