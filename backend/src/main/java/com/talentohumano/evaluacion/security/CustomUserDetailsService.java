package com.talentohumano.evaluacion.security;

import com.talentohumano.evaluacion.entity.Usuario;
import com.talentohumano.evaluacion.entity.enums.EstadoUsuario;
import com.talentohumano.evaluacion.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Carga un {@link Usuario} por correo y lo adapta a {@link UserDetails} de
 * Spring Security. La autoridad principal es {@code ROLE_<nombreDelRol>}
 * (p.ej. ROLE_ADMINISTRADOR); los permisos individuales del Rol tambien se
 * exponen como autoridades adicionales para permitir un control mas fino
 * con @PreAuthorize("hasAuthority('...')") si se necesita en el futuro.
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    /**
     * readOnly=true y una transaccion propia son necesarios aqui porque
     * {@code Usuario.rol} es LAZY: sin una sesion de Hibernate abierta al
     * momento de leer rol.getNombre()/getPermisos(), Hibernate lanza
     * LazyInitializationException (open-in-view esta deshabilitado a
     * proposito en application.yml).
     */
    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String correo) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new UsernameNotFoundException("No existe un usuario con correo " + correo));

        List<GrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_" + usuario.getRol().getNombre()));
        usuario.getRol().getPermisos().forEach(p -> authorities.add(new SimpleGrantedAuthority(p)));

        return User.builder()
                .username(usuario.getCorreo())
                .password(usuario.getPasswordHash())
                .disabled(usuario.getEstado() == EstadoUsuario.INACTIVO)
                .authorities(authorities)
                .build();
    }
}
