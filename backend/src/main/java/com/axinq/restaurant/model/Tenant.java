package com.axinq.restaurant.model;

import jakarta.persistence.*;
import java.time.Instant;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.axinq.restaurant.config.AttributeEncryptor;

@Entity
@Table(name = "tenants", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"admin_email_lower"})
})
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String logoUrl;

    private String adminEmail;

    // Backing column used for case-insensitive unique constraint
    @JsonIgnore
    @Column(name = "admin_email_lower", nullable = true)
    private String adminEmailLower;

    private String plan; // BASIC or PRIME

    private String featuresJson; // simple JSON string storing selected extras
    private boolean onboarded = false;
    private java.math.BigDecimal subscriptionAmount;

    // New: store per-tenant Gmail App Password (store encrypted in production!)
    @JsonIgnore
    @Convert(converter = AttributeEncryptor.class)
    @Column(name = "gmail_app_password", length = 2048)
    private String gmailAppPassword;

    private Instant createdAt = Instant.now();

    @PrePersist
    @PreUpdate
    private void updateDerivedFields() {
        if (this.adminEmail != null) this.adminEmailLower = this.adminEmail.toLowerCase();
    }

    public Tenant() {}

    public Tenant(String name, String logoUrl, String adminEmail, String plan, String featuresJson) {
        this.name = name;
        this.logoUrl = logoUrl;
        this.adminEmail = adminEmail;
        this.plan = plan;
        this.featuresJson = featuresJson;
        this.createdAt = Instant.now();
        updateDerivedFields();
    }

    // getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
    public String getAdminEmail() { return adminEmail; }
    public void setAdminEmail(String adminEmail) { this.adminEmail = adminEmail; updateDerivedFields(); }
    // adminEmailLower intentionally has no JSON exposure
    public String getAdminEmailLower() { return adminEmailLower; }
    public void setAdminEmailLower(String adminEmailLower) { this.adminEmailLower = adminEmailLower; }
    public String getPlan() { return plan; }
    public void setPlan(String plan) { this.plan = plan; }
    public String getFeaturesJson() { return featuresJson; }
    public void setFeaturesJson(String featuresJson) { this.featuresJson = featuresJson; }
    public boolean isOnboarded() { return onboarded; }
    public void setOnboarded(boolean onboarded) { this.onboarded = onboarded; }
    public java.math.BigDecimal getSubscriptionAmount() { return subscriptionAmount; }
    public void setSubscriptionAmount(java.math.BigDecimal subscriptionAmount) { this.subscriptionAmount = subscriptionAmount; }

    // Raw password accessors (ignored in JSON). IMPORTANT: store encrypted in real deployments.
    @JsonIgnore
    public String getGmailAppPassword() { return gmailAppPassword; }

    public void setGmailAppPassword(String gmailAppPassword) { this.gmailAppPassword = gmailAppPassword; }

    // Expose a masked version in API responses for UI (e.g. ****abcd)
    @JsonProperty("gmailAppPasswordMasked")
    @Transient
    public String getGmailAppPasswordMasked() {
        if (gmailAppPassword == null || gmailAppPassword.isEmpty()) return null;
        int len = gmailAppPassword.length();
        if (len <= 4) return "****";
        String last = gmailAppPassword.substring(len - 4);
        return "****" + last;
    }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
