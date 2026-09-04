package com.talentohumano.evaluacion.config;

import com.talentohumano.evaluacion.entity.Competencia;
import com.talentohumano.evaluacion.entity.Comportamiento;
import com.talentohumano.evaluacion.entity.Indicador;
import com.talentohumano.evaluacion.entity.Periodo;
import com.talentohumano.evaluacion.entity.Rol;
import com.talentohumano.evaluacion.entity.Usuario;
import com.talentohumano.evaluacion.entity.enums.EstadoPeriodo;
import com.talentohumano.evaluacion.entity.enums.EstadoRegistro;
import com.talentohumano.evaluacion.entity.enums.EstadoUsuario;
import com.talentohumano.evaluacion.repository.CompetenciaRepository;
import com.talentohumano.evaluacion.repository.ComportamientoRepository;
import com.talentohumano.evaluacion.repository.IndicadorRepository;
import com.talentohumano.evaluacion.repository.PeriodoRepository;
import com.talentohumano.evaluacion.repository.RolRepository;
import com.talentohumano.evaluacion.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Carga datos de demostracion en el perfil "dev" (H2 en memoria) para poder
 * probar la API inmediatamente despues de {@code mvnw spring-boot:run}, sin
 * necesidad de crear manualmente roles/usuarios/catalogos.
 * <p>
 * Idempotente: si ya existen roles, no vuelve a sembrar (evita duplicar
 * datos en reinicios dentro de la misma sesion de H2, y no hace nada si en
 * algun momento se apunta "dev" a una base ya poblada).
 */
@Configuration
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DataSeeder {

    private static final String PASSWORD_DEMO = "Talento123!";

    @Bean
    public CommandLineRunner sembrarDatosDemo(
            RolRepository rolRepository,
            UsuarioRepository usuarioRepository,
            CompetenciaRepository competenciaRepository,
            ComportamientoRepository comportamientoRepository,
            IndicadorRepository indicadorRepository,
            PeriodoRepository periodoRepository,
            PasswordEncoder passwordEncoder
    ) {
        return args -> {
            if (rolRepository.count() > 0) {
                log.info("DataSeeder: ya existen datos, se omite la siembra de demo.");
                return;
            }

            log.info("DataSeeder: sembrando datos de demostracion (perfil dev)...");

            Map<String, Rol> roles = Map.of(
                    "ADMINISTRADOR", rolRepository.save(Rol.builder()
                            .nombre("ADMINISTRADOR")
                            .permisos(List.of("USUARIO_GESTIONAR", "ROL_GESTIONAR", "CATALOGO_GESTIONAR", "PERIODO_GESTIONAR"))
                            .build()),
                    "JEFE_EVALUADOR", rolRepository.save(Rol.builder()
                            .nombre("JEFE_EVALUADOR")
                            .permisos(List.of("EVALUACION_REALIZAR"))
                            .build()),
                    "GERENTE", rolRepository.save(Rol.builder()
                            .nombre("GERENTE")
                            .permisos(List.of("EVALUACION_REALIZAR", "INFORME_VER"))
                            .build()),
                    "CLIENTE_EVALUADOR", rolRepository.save(Rol.builder()
                            .nombre("CLIENTE_EVALUADOR")
                            .permisos(List.of("EVALUACION_REALIZAR"))
                            .build()),
                    "COLABORADOR", rolRepository.save(Rol.builder()
                            .nombre("COLABORADOR")
                            .permisos(List.of("EVALUACION_VER_PROPIA"))
                            .build())
            );

            Usuario admin = usuarioRepository.save(Usuario.builder()
                    .nombre("Ana Administradora")
                    .correo("admin@talento.com")
                    .passwordHash(passwordEncoder.encode(PASSWORD_DEMO))
                    .estado(EstadoUsuario.ACTIVO)
                    .fechaIngreso(LocalDate.of(2020, 1, 15))
                    .rol(roles.get("ADMINISTRADOR"))
                    .build());

            Usuario jefe = usuarioRepository.save(Usuario.builder()
                    .nombre("Jorge Jefe")
                    .correo("jefe@talento.com")
                    .passwordHash(passwordEncoder.encode(PASSWORD_DEMO))
                    .estado(EstadoUsuario.ACTIVO)
                    .fechaIngreso(LocalDate.of(2021, 3, 1))
                    .rol(roles.get("JEFE_EVALUADOR"))
                    .build());

            Usuario gerente = usuarioRepository.save(Usuario.builder()
                    .nombre("Gabriela Gerente")
                    .correo("gerente@talento.com")
                    .passwordHash(passwordEncoder.encode(PASSWORD_DEMO))
                    .estado(EstadoUsuario.ACTIVO)
                    .fechaIngreso(LocalDate.of(2019, 6, 10))
                    .rol(roles.get("GERENTE"))
                    .build());

            Usuario cliente = usuarioRepository.save(Usuario.builder()
                    .nombre("Carlos Cliente")
                    .correo("cliente@talento.com")
                    .passwordHash(passwordEncoder.encode(PASSWORD_DEMO))
                    .estado(EstadoUsuario.ACTIVO)
                    .fechaIngreso(LocalDate.of(2022, 2, 20))
                    .rol(roles.get("CLIENTE_EVALUADOR"))
                    .build());

            usuarioRepository.save(Usuario.builder()
                    .nombre("Camila Colaboradora")
                    .correo("colaborador@talento.com")
                    .passwordHash(passwordEncoder.encode(PASSWORD_DEMO))
                    .estado(EstadoUsuario.ACTIVO)
                    .fechaIngreso(LocalDate.of(2023, 5, 5))
                    .rol(roles.get("COLABORADOR"))
                    .build());

            periodoRepository.save(Periodo.builder()
                    .nombre("2026 - Semestre 1")
                    .fechaInicio(LocalDate.of(2026, 1, 1))
                    .fechaFin(LocalDate.of(2026, 6, 30))
                    .estado(EstadoPeriodo.ACTIVO)
                    .build());

            Competencia liderazgo = competenciaRepository.save(Competencia.builder()
                    .codigo("COMP-01")
                    .nombre("Liderazgo")
                    .descripcion("Capacidad de guiar e influir positivamente en un equipo.")
                    .categoria("Gerencial")
                    .nivelEsperado("Alto")
                    .estado(EstadoRegistro.ACTIVO)
                    .build());

            Competencia trabajoEquipo = competenciaRepository.save(Competencia.builder()
                    .codigo("COMP-02")
                    .nombre("Trabajo en equipo")
                    .descripcion("Colabora eficazmente con otros para lograr objetivos comunes.")
                    .categoria("Transversal")
                    .nivelEsperado("Medio")
                    .estado(EstadoRegistro.ACTIVO)
                    .build());

            Comportamiento puntualidad = comportamientoRepository.save(Comportamiento.builder()
                    .codigo("COND-01")
                    .nombre("Puntualidad")
                    .descripcion("Cumple oportunamente con horarios y plazos comprometidos.")
                    .estado(EstadoRegistro.ACTIVO)
                    .build());

            Comportamiento proactividad = comportamientoRepository.save(Comportamiento.builder()
                    .codigo("COND-02")
                    .nombre("Proactividad")
                    .descripcion("Se anticipa a problemas y propone soluciones sin necesidad de que se le pida.")
                    .estado(EstadoRegistro.ACTIVO)
                    .build());

            indicadorRepository.save(Indicador.builder()
                    .nombre("Delega tareas de forma efectiva")
                    .descripcion("Observa si distribuye el trabajo segun fortalezas del equipo.")
                    .competencia(liderazgo)
                    .build());
            indicadorRepository.save(Indicador.builder()
                    .nombre("Escucha activamente a sus companeros")
                    .descripcion("Observa disposicion a escuchar antes de responder o decidir.")
                    .competencia(trabajoEquipo)
                    .build());
            indicadorRepository.save(Indicador.builder()
                    .nombre("Llega a tiempo a reuniones")
                    .descripcion("Registra puntualidad en reuniones programadas.")
                    .comportamiento(puntualidad)
                    .build());
            indicadorRepository.save(Indicador.builder()
                    .nombre("Propone mejoras sin que se le solicite")
                    .descripcion("Registra iniciativas propuestas de forma espontanea.")
                    .comportamiento(proactividad)
                    .build());

            log.info("DataSeeder: listo. Usuarios demo (password '{}'): admin@talento.com, jefe@talento.com, "
                    + "gerente@talento.com, cliente@talento.com, colaborador@talento.com", PASSWORD_DEMO);
        };
    }
}
