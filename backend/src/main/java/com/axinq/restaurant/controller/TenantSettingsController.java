package com.axinq.restaurant.controller;

import com.axinq.restaurant.model.Tenant;
import com.axinq.restaurant.service.TenantSettingsService;
import com.axinq.restaurant.service.TenantAuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/tenants")
public class TenantSettingsController {

    private final TenantSettingsService settingsService;
    private final TenantAuthService tenantAuthService;

    public TenantSettingsController(TenantSettingsService settingsService, TenantAuthService tenantAuthService) {
        this.settingsService = settingsService;
        this.tenantAuthService = tenantAuthService;
    }

    /**
     * Update tenant settings (must be authenticated as the tenant owner). Accepts multipart/form-data with
     * optional googleAppPassword and optional qrCodeImage (file).
     */
    @PutMapping(path = "/{id}/settings", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateTenantSettings(
            @PathVariable("id") Long tenantId,
            @RequestPart(value = "googleAppPassword", required = false) String googleAppPassword,
            @RequestPart(value = "qrCodeImage", required = false) MultipartFile qrCodeImage,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        // Authorization: only allow the authenticated tenant to update its own settings
        Long authTenantId = tenantAuthService.validateTokenHeader(authHeader);
        if (authTenantId == null || !authTenantId.equals(tenantId)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        try {
            Tenant updated = settingsService.updateSettings(tenantId, googleAppPassword, qrCodeImage);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to save file");
        }
    }
}
