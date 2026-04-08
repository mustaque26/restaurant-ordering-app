package com.axinq.restaurant.controller;

import com.axinq.restaurant.dto.UpdateQrRequest;
import com.axinq.restaurant.model.RestaurantSettings;
import com.axinq.restaurant.service.RestaurantSettingsService;
import com.axinq.restaurant.service.AdminAuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/settings")
public class RestaurantSettingsController {

    private final RestaurantSettingsService service;
    private final AdminAuthService adminAuthService;

    public RestaurantSettingsController(RestaurantSettingsService service, AdminAuthService adminAuthService) {
        this.service = service;
        this.adminAuthService = adminAuthService;
    }

    @GetMapping
    public RestaurantSettings getSettings() {
        return service.getSettings();
    }

    @PutMapping("/payment-qr")
    public RestaurantSettings updateQr(@RequestHeader(value = "Authorization", required = false) String auth,
                                       @Valid @RequestBody UpdateQrRequest request) {
        if (!adminAuthService.validateTokenHeader(auth)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return service.updatePaymentQr(request.paymentQrImageUrl());
    }
}
