package com.talentohumano.evaluacion.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

/**
 * Configuracion de Spring Security: JWT sin sesion, BCrypt para contrasenas,
 * y control de acceso basico por rol. ADMINISTRADOR tiene acceso total a los
 * endpoints de administracion (usuarios, roles, catalogos); el resto de
 * roles queda acotado a lo que necesitan para operar su flujo de evaluacion.
 * <p>
 * TODO: refinar las reglas por endpoint a medida que el detalle de cada RF
 * (p.ej. quien puede ver el resultado de quien) se precise; hoy la
 * autorizacion fina de "solo puedo ver mis propias evaluaciones" vive como
 * TODO en los controladores/servicios correspondientes.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CustomUserDetailsService userDetailsService;
    private final CorsConfigurationSource corsConfigurationSource;

    private static final String[] RUTAS_PUBLICAS = {
            "/api/v1/auth/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/v3/api-docs/**",
            "/h2-console/**"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(csrf -> csrf.disable())
                // El H2 console usa <frame>; se permite same-origin solo para desarrollo.
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(RUTAS_PUBLICAS).permitAll()
                        // Administracion de catalogos e identidad: solo ADMINISTRADOR.
                        .requestMatchers("/api/v1/roles/**").hasRole("ADMINISTRADOR")
                        .requestMatchers("/api/v1/usuarios/**").hasRole("ADMINISTRADOR")
                        .requestMatchers("/api/v1/perfiles/**").hasAnyRole("ADMINISTRADOR", "GERENTE")
                        .requestMatchers("/api/v1/competencias/**", "/api/v1/comportamientos/**", "/api/v1/indicadores/**")
                            .hasAnyRole("ADMINISTRADOR", "GERENTE")
                        .requestMatchers("/api/v1/periodos/**").hasAnyRole("ADMINISTRADOR", "GERENTE")
                        // El resto de endpoints autenticados (evaluaciones, resultados,
                        // consolidacion, notificaciones, informes, IA, busqueda) quedan
                        // abiertos a cualquier usuario autenticado; el filtrado por
                        // "solo lo mio" se deja como TODO en cada servicio.
                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
