package com.talentohumano.evaluacion;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Prueba minima de humo: verifica que el contexto de Spring levanta
 * correctamente con el perfil "dev" (H2 en memoria).
 */
@SpringBootTest
@ActiveProfiles("dev")
class EvaluacionDesempenoApplicationTests {

    @Test
    void contextLoads() {
        // Si el contexto de Spring no levanta, este test falla automaticamente.
    }
}
