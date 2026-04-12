package com.axinq.restaurant.controller;

import com.axinq.restaurant.model.TenantToken;
import com.axinq.restaurant.repository.TenantTokenRepository;
import com.axinq.restaurant.service.TenantAuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/debug")
public class DebugController {

    private final TenantTokenRepository tokenRepository;
    private final TenantAuthService tenantAuthService;

    public DebugController(TenantTokenRepository tokenRepository, TenantAuthService tenantAuthService) {
        this.tokenRepository = tokenRepository;
        this.tenantAuthService = tenantAuthService;
    }

    @GetMapping("/token")
    public ResponseEntity<?> getTokenInfo(@RequestParam String token) {
        TenantToken tt = tokenRepository.findByToken(token);
        if (tt == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Token not found"));
        }
        return ResponseEntity.ok(Map.of(
            "id", tt.getId(),
            "tenantId", tt.getTenantId(),
            "token", tt.getToken(),
            "expiryAt", tt.getExpiryAt()
        ));
    }

    @GetMapping("/otp")
    public ResponseEntity<?> getOtpForEmail(@RequestParam String email) {
        var res = tenantAuthService.debugGetOtp(email);
        if (res == null) return ResponseEntity.status(404).body(Map.of("error", "OTP not found or debug disabled"));
        return ResponseEntity.ok(res);
    }
}
