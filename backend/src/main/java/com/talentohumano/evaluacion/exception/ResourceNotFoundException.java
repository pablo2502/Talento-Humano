package com.talentohumano.evaluacion.exception;

/**
 * Lanzada cuando se solicita una entidad por id y no existe.
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }

    public static ResourceNotFoundException of(String entidad, Long id) {
        return new ResourceNotFoundException(entidad + " no encontrado con id " + id);
    }
}
