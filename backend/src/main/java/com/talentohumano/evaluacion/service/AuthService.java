package com.talentohumano.evaluacion.service;

import com.talentohumano.evaluacion.dto.auth.LoginRequest;
import com.talentohumano.evaluacion.dto.auth.LoginResponse;
import com.talentohumano.evaluacion.entity.Usuario;
import com.talentohumano.evaluacion.repository.UsuarioRepository;
import com.talentohumano.evaluacion.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Autenticacion (login) y emision de JWT. RF-01.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final UsuarioRepository usuarioRepository;
    private final JwtService jwtService;

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.correo(), request.password()));

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.correo());
        Usuario usuario = usuarioRepository.findByCorreo(request.correo())
                .orElseThrow(() -> new IllegalStateException("Usuario autenticado no encontrado: " + request.correo()));

        String token = jwtService.generarToken(userDetails, Map.of(
                "usuarioId", usuario.getId(),
                "rol", usuario.getRol().getNombre()
        ));

        return new LoginResponse(
                token,
                "Bearer",
                usuario.getId(),
                usuario.getNombre(),
                usuario.getCorreo(),
                usuario.getRol().getNombre(),
                jwtService.getExpirationMs()
        );
    }
}
