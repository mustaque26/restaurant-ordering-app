package com.axinq.restaurant.model;

public enum OrderStatus {
    CREATED,
    PAYMENT_PENDING,
    PAYMENT_SUBMITTED,
    CONFIRMED,
    OUT_FOR_DELIVERY,
    DELIVERED,
    CANCELLED
}
