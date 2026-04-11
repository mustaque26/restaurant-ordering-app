package com.axinq.restaurant.service;

import com.axinq.restaurant.model.Tenant;
import com.axinq.restaurant.repository.TenantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TenantAuthService {

    private final TenantRepository tenantRepository;
    private final SystemEmailService systemEmailService;

    private final Map<String, OtpEntry> otpStore = new ConcurrentHashMap<>();
    private final Map<String, TokenEntry> tokenStore = new ConcurrentHashMap<>();

    @Autowired
    public TenantAuthService(TenantRepository tenantRepository, SystemEmailService systemEmailService) {
        this.tenantRepository = tenantRepository;
        this.systemEmailService = systemEmailService;
    }

    public void sendOtp(String email, String restaurantName) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        List<Tenant> tenants = tenantRepository.findByAdminEmailIgnoreCase(email.trim());
        if (tenants.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found for this email");
        }

        Tenant t;
        if (tenants.size() == 1) {
            t = tenants.get(0);
            // If restaurantName supplied, verify it matches
            if (restaurantName != null && !restaurantName.isBlank()) {
                String tn = t.getName() != null ? t.getName().trim() : "";
                if (!tn.equalsIgnoreCase(restaurantName.trim())) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Restaurant name does not match the email");
                }
            }
        } else {
            // Multiple tenants share the same admin email — disambiguate
            if (restaurantName != null && !restaurantName.isBlank()) {
                // Try exact (case-insensitive) name match
                final String rn = restaurantName.trim();
                List<Tenant> matched = tenants.stream()
                    .filter(c -> rn.equalsIgnoreCase(c.getName() != null ? c.getName().trim() : ""))
                    .toList();
                if (matched.size() == 1) {
                    t = matched.get(0);
                } else if (matched.isEmpty()) {
                    throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No tenant found with that email and restaurant name");
                } else {
                    // Multiple tenants even after name match — prefer the onboarded one
                    Tenant onboarded = matched.stream().filter(Tenant::isOnboarded).findFirst().orElse(null);
                    if (onboarded != null) {
                        t = onboarded;
                    } else {
                        throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Multiple tenants match that email and name; please contact support");
                    }
                }
            } else {
                // No restaurantName supplied — try to fall back to onboarded tenant
                List<Tenant> onboardedList = tenants.stream().filter(Tenant::isOnboarded).toList();
                if (onboardedList.size() == 1) {
                    t = onboardedList.get(0);
                } else {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Multiple tenants share this email. Please provide your restaurant name to log in.");
                }
            }
        }

        int r = (int) (Math.random() * 1_000_000);
        String otp = String.format("%06d", r);
        Instant expiry = Instant.now().plusSeconds(5 * 60);
        otpStore.put(email.toLowerCase(), new OtpEntry(otp, expiry, t.getId()));

        String subject = "Your tenant login OTP";
        String body = "Your OTP for tenant login is: " + otp + "\nThis code will expire in 5 minutes.";
        systemEmailService.sendFromSales(email, subject, body);
    }

    public String verifyOtp(String email, String otp) {
        if (email == null || email.isBlank() || otp == null || otp.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email and OTP are required");
        }
        OtpEntry entry = otpStore.get(email.toLowerCase());
        if (entry == null || Instant.now().isAfter(entry.expiry)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "OTP expired or not found");
        }
        if (!entry.otp.equals(otp)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid OTP");
        }
        otpStore.remove(email.toLowerCase());
        String token = UUID.randomUUID().toString();
        Instant tokenExpiry = Instant.now().plusSeconds(60 * 60); // 1 hour
        tokenStore.put(token, new TokenEntry(entry.tenantId, tokenExpiry));
        return token;
    }

    /**
     * Validate Authorization header (Bearer token) and return tenant id if valid; otherwise return null.
     */
    public Long validateTokenHeader(String authHeader) {
        if (authHeader == null || authHeader.isBlank()) return null;
        String token = extractToken(authHeader);
        return validateToken(token);
    }

    public Long validateToken(String token) {
        if (token == null || token.isBlank()) return null;
        TokenEntry entry = tokenStore.get(token);
        if (entry == null) return null;
        if (Instant.now().isAfter(entry.expiry)) {
            tokenStore.remove(token);
            return null;
        }
        return entry.tenantId;
    }

    private String extractToken(String authHeader) {
        if (authHeader.startsWith("Bearer ")) return authHeader.substring(7).trim();
        return authHeader.trim();
    }

    private static class OtpEntry {
        final String otp;
        final Instant expiry;
        final Long tenantId;
        OtpEntry(String otp, Instant expiry, Long tenantId) {
            this.otp = otp; this.expiry = expiry; this.tenantId = tenantId;
        }
    }

    private static class TokenEntry {
        final Long tenantId;
        final Instant expiry;
        TokenEntry(Long tenantId, Instant expiry) { this.tenantId = tenantId; this.expiry = expiry; }
    }
}

