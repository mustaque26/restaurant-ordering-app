package com.axinq.restaurant.controller;

import com.axinq.restaurant.model.Tenant;
import com.axinq.restaurant.model.TenantToken;
import com.axinq.restaurant.repository.TenantRepository;
import com.axinq.restaurant.repository.TenantTokenRepository;
import com.axinq.restaurant.service.SystemEmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/tenants")
public class TenantController {

    private final TenantRepository tenantRepository;
    private final TenantTokenRepository tokenRepository;
    private final SystemEmailService systemEmailService;

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    public TenantController(TenantRepository tenantRepository, TenantTokenRepository tokenRepository, SystemEmailService systemEmailService) {
        this.tenantRepository = tenantRepository;
        this.tokenRepository = tokenRepository;
        this.systemEmailService = systemEmailService;
    }

    @PostMapping
    public ResponseEntity<Map<String,Object>> createTenant(@RequestBody Tenant tenant) {
        if (tenant.getAdminEmail() == null || !EMAIL_PATTERN.matcher(tenant.getAdminEmail()).matches()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid admin email"));
        }
        // Persist subscription amount if provided (client may send subscriptionAmount)
        // If the incoming JSON contains subscriptionAmount, JPA will map it to tenant.subscriptionAmount
        Tenant saved = tenantRepository.save(tenant);

        // create setup token
        String token = UUID.randomUUID().toString();
        TenantToken tt = new TenantToken();
        tt.setTenantId(saved.getId());
        tt.setToken(token);
        tt.setExpiryAt(Instant.now().plus(24, ChronoUnit.HOURS));
        tokenRepository.save(tt);

        // send onboarding email with setup link
        try {
            String subject = "Welcome to Axinq - your tenant has been created";
            String link = String.format("%s/tenant/%d/settings?token=%s", "http://localhost:5173", saved.getId(), token);
            StringBuilder html = new StringBuilder();
            html.append("<div style=\"font-family: Arial, Helvetica, sans-serif; color: #222;\">\n");
            html.append("<h2 style=\"color:#0b486b;\">Welcome to Axinq</h2>\n");
            html.append("<p>Your tenant has been created. Click the button below to complete setup:</p>\n");
            html.append(String.format("<p><a href=\"%s\" style=\"background:#0b486b;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;\">Complete setup</a></p>", link));
            html.append("<h3>Tenant details</h3>\n");
            html.append("<ul>\n");
            html.append("<li><strong>ID:</strong> ").append(saved.getId()).append("</li>\n");
            html.append("<li><strong>Name:</strong> ").append(saved.getName()).append("</li>\n");
            html.append("<li><strong>Admin email:</strong> ").append(saved.getAdminEmail()).append("</li>\n");
            html.append("<li><strong>Plan:</strong> ").append(saved.getPlan() != null ? saved.getPlan() : "N/A").append("</li>\n");
            if (saved.getSubscriptionAmount() != null) {
                html.append("<li><strong>Subscription amount:</strong> ₹").append(saved.getSubscriptionAmount()).append("</li>\n");
            }
            html.append("<li><strong>Features:</strong> ").append(saved.getFeaturesJson() != null ? saved.getFeaturesJson() : "{}").append("</li>\n");
            html.append("</ul>\n");
            html.append("<p>Best regards,<br/>Axinq</p>\n");
            html.append("<img src=\"cid:axinqLogo\" alt=\"Axinq\" style=\"height:48px;margin-top:8px;\"/>\n");
            html.append("</div>");

            try {
                systemEmailService.sendFromSalesHtml(saved.getAdminEmail(), subject, html.toString());
            } catch (Exception htmlEx) {
                // fallback to plaintext if HTML send fails
                StringBuilder body = new StringBuilder();
                body.append("Your tenant has been created. Complete setup: ").append(link).append("\n\n");
                body.append("Tenant details:\n");
                body.append("ID: ").append(saved.getId()).append("\n");
                body.append("Name: ").append(saved.getName()).append("\n");
                body.append("Admin email: ").append(saved.getAdminEmail()).append("\n");
                body.append("Plan: ").append(saved.getPlan() != null ? saved.getPlan() : "N/A").append("\n");
                if (saved.getSubscriptionAmount() != null) {
                    body.append("Subscription amount: ₹").append(saved.getSubscriptionAmount()).append("\n");
                }
                body.append("Features: ").append(saved.getFeaturesJson() != null ? saved.getFeaturesJson() : "{}").append("\n");
                systemEmailService.sendFromSales(saved.getAdminEmail(), subject, body.toString());
            }
        } catch (Exception ex) {
            // log and continue
            ex.printStackTrace();
        }

        Map<String,Object> resp = new HashMap<>();
        resp.put("tenant", saved);
        resp.put("setupToken", token);
        return ResponseEntity.ok(resp);
    }

    @GetMapping
    public List<Tenant> getTenants() {
        return tenantRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Tenant> getTenant(@PathVariable Long id) {
        return tenantRepository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Tenant> updateTenant(@PathVariable Long id, @RequestBody Tenant incoming) {
        return tenantRepository.findById(id).map(t -> {
            if (incoming.getName() != null) t.setName(incoming.getName());
            if (incoming.getLogoUrl() != null) t.setLogoUrl(incoming.getLogoUrl());
            if (incoming.getFeaturesJson() != null) t.setFeaturesJson(incoming.getFeaturesJson());
            tenantRepository.save(t);
            return ResponseEntity.ok(t);
        }).orElse(ResponseEntity.notFound().build());
    }

    // Validate a setup token and return the tenant; consumes the token so it can't be reused.
    @GetMapping("/{id}/validate")
    public ResponseEntity<?> validateSetupToken(@PathVariable Long id, @RequestParam String token) {
        TenantToken tt = tokenRepository.findByToken(token);
        if (tt == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid token"));
        }
        if (!tt.getTenantId().equals(id)) {
            return ResponseEntity.status(401).body(Map.of("error", "Token does not match tenant"));
        }
        if (tt.getExpiryAt() == null || Instant.now().isAfter(tt.getExpiryAt())) {
            return ResponseEntity.status(401).body(Map.of("error", "Token expired"));
        }
        // consume token
        tokenRepository.delete(tt);
        return tenantRepository.findById(id).map(t -> {
            // mark tenant as onboarded
            t.setOnboarded(true);
            tenantRepository.save(t);
            return ResponseEntity.ok(t);
        }).orElse(ResponseEntity.notFound().build());
    }

}
