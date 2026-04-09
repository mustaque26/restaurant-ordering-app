package com.axinq.restaurant.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record CreateOrderRequest(
        @NotBlank String customerName,
        String phoneNumber,
        @NotBlank String deliveryAddress,
        String paymentReference,
        @Valid @NotEmpty List<OrderItemRequest> items,
        String email,
        boolean sendEmail,
        boolean sendWhatsapp
) {}
