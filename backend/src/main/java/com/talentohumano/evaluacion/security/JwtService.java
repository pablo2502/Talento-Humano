package com.talentohumano.evaluacion.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * Emision y validacion de JSON Web Tokens (RF-01).
 */
@Service
public class JwtService {

    public static final String CLAIM_ALCANCE = "alcance";
    public static final String CLAIM_ADMIN = "admin";
    public static final String ALCANCE_DATOS = "datos";

    private final Key signingKey;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs
    ) {
        // El secreto debe tener al menos 256 bits (32 caracteres) para HS256.
        this.signingKey = Keys.hmacShaKeyFor(normalizarSecreto(secret));
        this.expirationMs = expirationMs;
    }

    private byte[] normalizarSecreto(String secret) {
        try {
            return Decoders.BASE64.decode(secret);
        } catch (Exception ex) {
            return secret.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        }
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    public String generarToken(UserDetails userDetails, Map<String, Object> extraClaims) {
        Map<String, Object> claims = new HashMap<>(extraClaims);
        Date ahora = new Date();
        Date expiracion = new Date(ahora.getTime() + expirationMs);
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(userDetails.getUsername())
                .setIssuedAt(ahora)
                .setExpiration(expiracion)
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Token para la API /api/v2 (frontend 360°): el sujeto es el id del
     * usuario en el modelo del frontend (p.ej. "u-16"), no un correo del
     * modelo generico /api/v1.
     */
    public String generarTokenDatos(String usuarioId, boolean admin) {
        Date ahora = new Date();
        return Jwts.builder()
                .claim(CLAIM_ALCANCE, ALCANCE_DATOS)
                .claim(CLAIM_ADMIN, admin)
                .setSubject(usuarioId)
                .setIssuedAt(ahora)
                .setExpiration(new Date(ahora.getTime() + expirationMs))
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    /** Valida firma y expiracion; lanza excepcion si el token no es valido. */
    public Claims extraerClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public String extraerUsername(String token) {
        return extraerClaim(token, Claims::getSubject);
    }

    public boolean esTokenValido(String token, UserDetails userDetails) {
        String username = extraerUsername(token);
        return username.equals(userDetails.getUsername()) && !estaExpirado(token);
    }

    private boolean estaExpirado(String token) {
        return extraerClaim(token, Claims::getExpiration).before(new Date());
    }

    private <T> T extraerClaim(String token, Function<Claims, T> resolver) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
        return resolver.apply(claims);
    }
}
