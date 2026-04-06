package com.axinq.restaurant.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateQrRequest(@NotBlank String paymentQrImageUrl) {}
