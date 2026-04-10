package com.axinq.restaurant.controller;

import com.axinq.restaurant.dto.UpdateQrRequest;
import com.axinq.restaurant.model.RestaurantSettings;
import com.axinq.restaurant.service.RestaurantSettingsService;
import com.axinq.restaurant.service.TenantAuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/settings")
public class RestaurantSettingsController {

    private final RestaurantSettingsService service;
    private final TenantAuthService tenantAuthService;

    public RestaurantSettingsController(RestaurantSettingsService service, TenantAuthService tenantAuthService) {
        this.service = service;
        this.tenantAuthService = tenantAuthService;
    }

    @GetMapping
    public RestaurantSettings getSettings(@RequestHeader(value = "Authorization", required = false) String auth) {
        Long tenantId = tenantAuthService.validateTokenHeader(auth);
        return service.getSettings(tenantId);
    }

    @PutMapping("/payment-qr")
    public RestaurantSettings updateQr(@RequestHeader(value = "Authorization", required = false) String auth,
                                       @Valid @RequestBody UpdateQrRequest request) {
        Long tenantId = tenantAuthService.validateTokenHeader(auth);
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        // Note: RestaurantSettings is currently global; if multi-tenant settings are implemented,
        // ensure we validate tenant ownership before allowing updates.
        return service.updatePaymentQr(request.paymentQrImageUrl());
    }
}
