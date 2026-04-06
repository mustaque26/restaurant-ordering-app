package com.axinq.restaurant.controller;

import com.axinq.restaurant.dto.UpdateQrRequest;
import com.axinq.restaurant.model.RestaurantSettings;
import com.axinq.restaurant.service.RestaurantSettingsService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
public class RestaurantSettingsController {

    private final RestaurantSettingsService service;

    public RestaurantSettingsController(RestaurantSettingsService service) {
        this.service = service;
    }

    @GetMapping
    public RestaurantSettings getSettings() {
        return service.getSettings();
    }

    @PutMapping("/payment-qr")
    public RestaurantSettings updateQr(@Valid @RequestBody UpdateQrRequest request) {
        return service.updatePaymentQr(request.paymentQrImageUrl());
    }
}
