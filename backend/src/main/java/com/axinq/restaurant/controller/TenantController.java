package com.axinq.restaurant.controller;

import com.axinq.restaurant.model.Tenant;
import com.axinq.restaurant.model.TenantToken;
import com.axinq.restaurant.repository.TenantRepository;
import com.axinq.restaurant.repository.TenantTokenRepository;
import com.axinq.restaurant.service.SystemEmailService;
import org.springframework.dao.DataIntegrityViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(TenantController.class);

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

        // Prevent duplicate tenant registration for same admin email (case-insensitive)
        List<Tenant> existing = tenantRepository.findByAdminEmailIgnoreCase(tenant.getAdminEmail());
        if (existing != null && !existing.isEmpty()) {
            // Return existing subscription details to the caller so UI can show a helpful message
            Map<String,Object> resp = new HashMap<>();
            // Provide a sanitized list of existing tenant summaries
            List<Map<String,Object>> summaries = existing.stream().map(t -> {
                Map<String,Object> m = new HashMap<>();
                m.put("id", t.getId());
                m.put("name", t.getName());
                m.put("adminEmail", t.getAdminEmail());
                m.put("plan", t.getPlan());
                m.put("subscriptionAmount", t.getSubscriptionAmount());
                m.put("onboarded", t.isOnboarded());
                return m;
            }).toList();
            resp.put("existingTenants", summaries);

            // Decide action: if existing is BASIC and incoming asks for PRIME -> suggest upgrade
            Tenant first = existing.get(0);
            String existingPlan = first.getPlan() == null ? "" : first.getPlan();
            String incomingPlan = tenant.getPlan() == null ? "" : tenant.getPlan();
            boolean existingIsPrime = "PRIME".equalsIgnoreCase(existingPlan);
            boolean incomingIsPrime = "PRIME".equalsIgnoreCase(incomingPlan);

            if (!existingIsPrime && incomingIsPrime) {
                resp.put("error", "An account already exists for this email. You may upgrade the existing subscription to PRIME.");
                resp.put("action", "upgrade");

                // Send upgrade suggestion email with existing subscription details and an upgrade link
                try {
                    String subject = "Dizminu: upgrade available for your restaurant";
                    StringBuilder html = new StringBuilder();
                    html.append("<div style=\"font-family: Arial, Helvetica, sans-serif; color:#222;\">\n");
                    html.append("<h3>Upgrade to PRIME available</h3>\n");
                    html.append("<p>We found an existing subscription for this email. You can upgrade it to PRIME to enable payments and priority support.</p>\n");
                    html.append("<ul>\n");
                    for (Map<String,Object> s : summaries) {
                        html.append("<li><strong>").append(s.getOrDefault("name", "-")).append("</strong> — plan: ")
                            .append(s.getOrDefault("plan", "N/A")).append(" — id: ").append(s.getOrDefault("id", "-"))
                            .append("</li>\n");
                    }
                    html.append("</ul>\n");
                    // Provide a link to billing/setup (frontend path)
                    String upgradeLink = String.format("%s/admin/tenants/%s/billing", "http://localhost:5173", first.getId());
                    html.append(String.format("<p><a href=\"%s\" style=\"background:#0b486b;color:#fff;padding:8px 12px;border-radius:6px;text-decoration:none;\">Upgrade to PRIME</a></p>", upgradeLink));
                    html.append("<p>If you need help, contact support@dizminu.com.</p>\n");
                    html.append("<div style=\"margin-top:12px;color:#0b486b;font-weight:700;font-size:13px;\">Dizminu</div>\n");
                    html.append("</div>");
                    try {
                        systemEmailService.sendFromSalesHtml(tenant.getAdminEmail(), subject, html.toString());
                    } catch (Exception e) {
                        StringBuilder body = new StringBuilder();
                        body.append("Upgrade available for your Dizminu subscription\n\n");
                        for (Map<String,Object> s : summaries) {
                            body.append("- ").append(s.getOrDefault("name", "-")).append(" — plan: ")
                                .append(s.getOrDefault("plan", "N/A")).append(" — id: ").append(s.getOrDefault("id", "-"))
                                .append("\n");
                        }
                        body.append("\nUpgrade link: ").append(upgradeLink).append("\n");
                        body.append("\nIf you need help, contact support@dizminu.com\n");
                        systemEmailService.sendFromSales(tenant.getAdminEmail(), subject, body.toString());
                    }
                } catch (Exception emailEx) {
                    log.warn("Failed to send upgrade email to {}: {}", tenant.getAdminEmail(), emailEx.getMessage());
                }

                return ResponseEntity.status(409).body(resp);
            }

            // Default: inform that tenant exists and attach existing subscription details
            resp.put("error", "A tenant is already registered with this admin email.");
            resp.put("action", "exists");

            // Send an informational email to the requester with existing subscription details
            try {
                String subject = "Dizminu: existing subscription(s) found for your email";
                StringBuilder html = new StringBuilder();
                html.append("<div style=\"font-family: Arial, Helvetica, sans-serif; color:#222;\">\n");
                html.append("<h3>Existing Dizminu subscription(s) for ").append(tenant.getAdminEmail()).append("</h3>\n");
                html.append("<p>We found the following subscription(s) associated with this email:</p>\n");
                html.append("<ul>\n");
                for (Map<String,Object> s : summaries) {
                    html.append("<li><strong>").append(s.getOrDefault("name", "-")).append("</strong> — plan: ")
                        .append(s.getOrDefault("plan", "N/A")).append(" — id: ").append(s.getOrDefault("id", "-")).append("</li>\n");
                }
                html.append("</ul>\n");
                html.append("<p>If you think this is an error, please contact support@dizminu.com.</p>\n");
                html.append("<div style=\"margin-top:12px;color:#0b486b;font-weight:700;font-size:13px;\">Dizminu</div>\n");
                html.append("</div>");
                try {
                    systemEmailService.sendFromSalesHtml(tenant.getAdminEmail(), subject, html.toString());
                } catch (Exception e) {
                    // fallback to plain text
                    StringBuilder body = new StringBuilder();
                    body.append("Existing Dizminu subscription(s) for ").append(tenant.getAdminEmail()).append("\n\n");
                    for (Map<String,Object> s : summaries) {
                        body.append("- ").append(s.getOrDefault("name", "-")).append(" — plan: ")
                            .append(s.getOrDefault("plan", "N/A")).append(" — id: ").append(s.getOrDefault("id", "-"))
                            .append("\n");
                    }
                    body.append("\nIf you think this is an error, please contact support@dizminu.com\n");
                    systemEmailService.sendFromSales(tenant.getAdminEmail(), subject, body.toString());
                }
            } catch (Exception emailEx) {
                log.warn("Failed to send existing-subscriptions email to {}: {}", tenant.getAdminEmail(), emailEx.getMessage());
            }

            return ResponseEntity.status(409).body(resp);
        }

        // Persist subscription amount if provided (client may send subscriptionAmount)
        // Also persist gmailAppPassword if provided (will be ignored in JSON responses)
        Tenant saved;
        try {
            saved = tenantRepository.save(tenant);
        } catch (DataIntegrityViolationException dive) {
            // Could be unique constraint violation (race condition). Load existing tenants and return 409.
            log.warn("DataIntegrityViolation saving tenant for email {}: {}", tenant.getAdminEmail(), dive.getMessage());
            List<Tenant> found = tenantRepository.findByAdminEmailIgnoreCase(tenant.getAdminEmail());
            Map<String,Object> resp = new HashMap<>();
            // Provide a sanitized list of existing tenant summaries
            List<Map<String,Object>> summaries = found.stream().map(t -> {
                Map<String,Object> m = new HashMap<>();
                m.put("id", t.getId());
                m.put("name", t.getName());
                m.put("adminEmail", t.getAdminEmail());
                m.put("plan", t.getPlan());
                m.put("subscriptionAmount", t.getSubscriptionAmount());
                m.put("onboarded", t.isOnboarded());
                return m;
            }).toList();
            resp.put("existingTenants", summaries);

            // Decide action similar to the main duplicate-check: upgrade suggestion when incoming is PRIME and existing is BASIC
            Tenant firstFound = found.get(0);
            String existingPlan = firstFound.getPlan() == null ? "" : firstFound.getPlan();
            String incomingPlan = tenant.getPlan() == null ? "" : tenant.getPlan();
            boolean existingIsPrime = "PRIME".equalsIgnoreCase(existingPlan);
            boolean incomingIsPrime = "PRIME".equalsIgnoreCase(incomingPlan);

            if (!existingIsPrime && incomingIsPrime) {
                resp.put("error", "An account already exists for this email. You may upgrade the existing subscription to PRIME.");
                resp.put("action", "upgrade");

                // send upgrade email
                try {
                    String subject = "Dizminu: upgrade available for your restaurant";
                    StringBuilder html = new StringBuilder();
                    html.append("<div style=\"font-family: Arial, Helvetica, sans-serif; color:#222;\">\n");
                    html.append("<h3>Upgrade to PRIME available</h3>\n");
                    html.append("<p>We found an existing subscription for this email. You can upgrade it to PRIME to enable payments and priority support.</p>\n");
                    html.append("<ul>\n");
                    for (Map<String,Object> s : summaries) {
                        html.append("<li><strong>").append(s.getOrDefault("name", "-")).append("</strong> — plan: ")
                            .append(s.getOrDefault("plan", "N/A")).append(" — id: ").append(s.getOrDefault("id", "-"))
                            .append("</li>\n");
                    }
                    html.append("</ul>\n");
                    String upgradeLink = String.format("%s/admin/tenants/%s/billing", "http://localhost:5173", firstFound.getId());
                    html.append(String.format("<p><a href=\"%s\" style=\"background:#0b486b;color:#fff;padding:8px 12px;border-radius:6px;text-decoration:none;\">Upgrade to PRIME</a></p>", upgradeLink));
                    html.append("<p>If you need help, contact support@dizminu.com.</p>\n");
                    html.append("<div style=\"margin-top:12px;color:#0b486b;font-weight:700;font-size:13px;\">Dizminu</div>\n");
                    html.append("</div>");
                    try {
                        systemEmailService.sendFromSalesHtml(tenant.getAdminEmail(), subject, html.toString());
                    } catch (Exception e) {
                        StringBuilder body = new StringBuilder();
                        body.append("Upgrade available for your Dizminu subscription\n\n");
                        for (Map<String,Object> s : summaries) {
                            body.append("- ").append(s.getOrDefault("name", "-")).append(" — plan: ")
                                .append(s.getOrDefault("plan", "N/A")).append(" — id: ").append(s.getOrDefault("id", "-"))
                                .append("\n");
                        }
                        body.append("\nUpgrade link: ").append(upgradeLink).append("\n");
                        body.append("\nIf you need help, contact support@dizminu.com\n");
                        systemEmailService.sendFromSales(tenant.getAdminEmail(), subject, body.toString());
                    }
                } catch (Exception emailEx) {
                    log.warn("Failed to send upgrade email to {}: {}", tenant.getAdminEmail(), emailEx.getMessage());
                }

                return ResponseEntity.status(409).body(resp);
            }

            // Default: inform that tenant exists and attach existing subscription details (action=exists)
            resp.put("error", "A tenant is already registered with this admin email.");
            resp.put("action", "exists");

            // Send existing-subscriptions email
            try {
                String subject = "Dizminu: existing subscription(s) found for your email";
                StringBuilder html = new StringBuilder();
                html.append("<div style=\"font-family: Arial, Helvetica, sans-serif; color:#222;\">\n");
                html.append("<h3>Existing Dizminu subscription(s) for ").append(tenant.getAdminEmail()).append("</h3>\n");
                html.append("<p>We found the following subscription(s) associated with this email (possible race on signup):</p>\n");
                html.append("<ul>\n");
                for (Map<String,Object> s : summaries) {
                    html.append("<li><strong>").append(s.getOrDefault("name", "-")).append("</strong> — plan: ")
                        .append(s.getOrDefault("plan", "N/A")).append(" — id: ").append(s.getOrDefault("id", "-"))
                        .append("</li>\n");
                }
                html.append("</ul>\n");
                html.append("<p>If you think this is an error, please contact support@dizminu.com.</p>\n");
                html.append("<div style=\"margin-top:12px;color:#0b486b;font-weight:700;font-size:13px;\">Dizminu</div>\n");
                html.append("</div>");
                try {
                    systemEmailService.sendFromSalesHtml(tenant.getAdminEmail(), subject, html.toString());
                } catch (Exception e) {
                    StringBuilder body = new StringBuilder();
                    body.append("Existing Dizminu subscription(s) for ").append(tenant.getAdminEmail()).append("\n\n");
                    for (Map<String,Object> s : summaries) {
                        body.append("- ").append(s.getOrDefault("name", "-")).append(" — plan: ")
                            .append(s.getOrDefault("plan", "N/A")).append(" — id: ").append(s.getOrDefault("id", "-"))
                            .append("\n");
                    }
                    body.append("\nIf you think this is an error, please contact support@dizminu.com\n");
                    systemEmailService.sendFromSales(tenant.getAdminEmail(), subject, body.toString());
                }
            } catch (Exception emailEx) {
                log.warn("Failed to send existing-subscriptions email to {}: {}", tenant.getAdminEmail(), emailEx.getMessage());
            }
            return ResponseEntity.status(409).body(resp);
        }

        // create setup token
        String token = UUID.randomUUID().toString();
        TenantToken tt = new TenantToken();
        tt.setTenantId(saved.getId());
        tt.setToken(token);
        tt.setExpiryAt(Instant.now().plus(24, ChronoUnit.HOURS));
        tokenRepository.save(tt);

        // send onboarding email with setup link
        try {
            String subject = "Welcome to Dizminu - your tenant has been created";
            String link = String.format("%s/tenant/%d/settings?token=%s", "http://localhost:5173", saved.getId(), token);
            StringBuilder html = new StringBuilder();
            html.append("<div style=\"font-family: Arial, Helvetica, sans-serif; color: #222;\">\n");
            html.append("<h2 style=\"color:#0b486b;\">Welcome to Dizminu</h2>\n");
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

            // signature: text first, then logo, then two-line tagline (left-aligned)
            html.append("<div style=\"text-align:left;margin-top:12px;font-family: Arial, Helvetica, sans-serif;\">\n");
            html.append("  <p style=\"margin:0 0 8px 0;color:#222;font-size:14px;\">Best regards,<br/><strong>Dizminu</strong></p>\n");
            html.append("  <div style=\"margin-top:6px;\">\n");
            html.append("    <img src=\"cid:dizminuLogo\" alt=\"Dizminu\" style=\"width:88px;height:auto;display:block;\"/>\n");
            html.append("  </div>\n");
            html.append("  <div style=\"margin-top:8px;color:#0b486b;font-weight:700;font-size:13px;line-height:1;\">Axinq Technology</div>\n");
            html.append("  <div style=\"color:#0b486b;font-weight:600;font-size:13px;margin-top:2px;\">for Smarter Dining</div>\n");
            html.append("</div>\n");
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
            log.error("Error sending onboarding email for tenant {}: {}", saved.getId(), ex.getMessage());
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
            if (incoming.getAdminEmail() != null) t.setAdminEmail(incoming.getAdminEmail());
            if (incoming.getPlan() != null) t.setPlan(incoming.getPlan());
            if (incoming.getSubscriptionAmount() != null) t.setSubscriptionAmount(incoming.getSubscriptionAmount());
            if (incoming.getAddress() != null) t.setAddress(incoming.getAddress());
            // allow updating gmail app password (incoming password is ignored in JSON output due to @JsonIgnore)
            if (incoming.getGmailAppPassword() != null) t.setGmailAppPassword(incoming.getGmailAppPassword());
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

    @GetMapping("/slug/{slug}")
    public ResponseEntity<Tenant> getBySlug(@PathVariable String slug) {
        Tenant t = tenantRepository.findBySlug(slug);
        if (t == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(t);
    }

}
