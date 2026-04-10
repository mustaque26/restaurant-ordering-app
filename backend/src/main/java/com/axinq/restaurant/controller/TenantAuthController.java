package com.axinq.restaurant.controller;

import com.axinq.restaurant.service.TenantAuthService;
import com.axinq.restaurant.repository.TenantRepository;
import com.axinq.restaurant.model.Tenant;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/tenant-auth")
public class TenantAuthController {

    private final TenantAuthService authService;
    private final TenantRepository tenantRepository;

    @Autowired
    public TenantAuthController(TenantAuthService authService, TenantRepository tenantRepository) {
        this.authService = authService;
        this.tenantRepository = tenantRepository;
    }

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String,String> body) {
        String email = body.get("email");
        String restaurantName = body.get("restaurantName");
        authService.sendOtp(email, restaurantName);
        return ResponseEntity.ok(Map.of("message","OTP sent"));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String,String> body) {
        String email = body.get("email");
        String otp = body.get("otp");
        String token = authService.verifyOtp(email, otp);
        return ResponseEntity.ok(Map.of("token", token));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String auth) {
        Long tenantId = authService.validateTokenHeader(auth);
        if (tenantId == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        return tenantRepository.findById(tenantId).map(t -> ResponseEntity.ok(t)).orElse(ResponseEntity.notFound().build());
    }
}
