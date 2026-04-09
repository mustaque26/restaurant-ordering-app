package com.axinq.restaurant.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.http.HttpStatus;

@Service
public class AdminAuthService {

    private final SystemEmailService systemEmailService;

    // OTP storage and token storage kept in-memory for simplicity
    private final Map<String, OtpEntry> otpStore = new ConcurrentHashMap<>();
    private final Map<String, TokenEntry> tokenStore = new ConcurrentHashMap<>();

    // Use the configured mail username as the allowed admin email
    @Value("${spring.mail.username:}")
    private String adminEmail;

    @Autowired
    public AdminAuthService(SystemEmailService systemEmailService) {
        this.systemEmailService = systemEmailService;
    }

    public void sendOtp(String email) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        // If a mail username is configured, require the provided email to match it
        if (adminEmail != null && !adminEmail.isBlank() && !email.equalsIgnoreCase(adminEmail.trim())) {
            // return a clear error for the UI
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid admin email id");
        }
        // generate 6-digit zero-padded OTP
        int r = (int) (Math.random() * 1_000_000);
        String otp = String.format("%06d", r);
        Instant expiry = Instant.now().plusSeconds(5 * 60); // 5 minutes
        otpStore.put(email.toLowerCase(), new OtpEntry(otp, expiry));

        String subject = "Your admin login OTP";
        String body = "Your OTP for admin login is: " + otp + "\nThis code will expire in 5 minutes.";
        systemEmailService.sendFromFranzzo(email, subject, body);
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
        // OTP valid - consume it
        otpStore.remove(email.toLowerCase());
        String token = UUID.randomUUID().toString();
        Instant tokenExpiry = Instant.now().plusSeconds(60 * 60); // 1 hour token
        tokenStore.put(token, new TokenEntry(email.toLowerCase(), tokenExpiry));
        return token;
    }

    public boolean validateTokenHeader(String authHeader) {
        if (authHeader == null || authHeader.isBlank()) return false;
        String token = extractToken(authHeader);
        return validateToken(token);
    }

    public boolean validateToken(String token) {
        if (token == null || token.isBlank()) return false;
        TokenEntry entry = tokenStore.get(token);
        if (entry == null) return false;
        if (Instant.now().isAfter(entry.expiry)) {
            tokenStore.remove(token);
            return false;
        }
        return true;
    }

    private String extractToken(String authHeader) {
        if (authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7).trim();
        }
        return authHeader.trim();
    }

    // simple internal classes
    private static class OtpEntry {
        final String otp;
        final Instant expiry;

        OtpEntry(String otp, Instant expiry) {
            this.otp = otp;
            this.expiry = expiry;
        }
    }

    private static class TokenEntry {
        final String email;
        final Instant expiry;

        TokenEntry(String email, Instant expiry) {
            this.email = email;
            this.expiry = expiry;
        }
    }
}
