package com.talentohumano.evaluacion.exception;

/**
 * Lanzada cuando una operacion viola una regla de negocio
 * (p.ej. una transicion de estado invalida en Evaluacion).
 */
public class BusinessException extends RuntimeException {
    public BusinessException(String message) {
        super(message);
    }
}
