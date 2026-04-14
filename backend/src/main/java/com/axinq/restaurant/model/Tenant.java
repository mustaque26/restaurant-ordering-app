package com.axinq.restaurant.model;

import jakarta.persistence.*;
import java.time.Instant;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonProperty.Access;
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

    // Store per-tenant Gmail App Password (encrypted at rest). Make it write-only for JSON so callers can set it
    @Convert(converter = AttributeEncryptor.class)
    @Column(name = "gmail_app_password", length = 2048)
    @JsonProperty(access = Access.WRITE_ONLY)
    private String gmailAppPassword;

    private Instant createdAt = Instant.now();

    // New slug field to support friendly URLs (e.g., /my-cafe)
    @Column(name = "slug", unique = true, length = 255)
    private String slug;

    // New: store payment QR image URL or path for tenant
    @Column(name = "payment_qr_image_url", length = 1024)
    private String paymentQrImageUrl;

    // Optional physical address for the restaurant
    @Column(name = "address", length = 1024)
    private String address;

    @PrePersist
    @PreUpdate
    private void updateDerivedFields() {
        if (this.adminEmail != null) this.adminEmailLower = this.adminEmail.toLowerCase();
        // generate slug from name if not present
        if ((this.slug == null || this.slug.isBlank()) && this.name != null && !this.name.isBlank()) {
            this.slug = slugify(this.name);
        }
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

    // simple slugify helper: lower-case, replace non-alphanumeric with hyphens, trim hyphens
    private static String slugify(String s) {
        if (s == null) return null;
        String t = s.trim().toLowerCase();
        // replace any sequence of non-alphanumeric characters with hyphen
        t = t.replaceAll("[^a-z0-9]+", "-");
        // trim leading/trailing hyphens
        t = t.replaceAll("^-+|-+$", "");
        if (t.isEmpty()) return null;
        return t;
    }

    // getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; updateDerivedFields(); }
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

    // Gmail app password accessors: write-only via JSON
    public String getGmailAppPassword() { return gmailAppPassword; }

    public void setGmailAppPassword(String gmailAppPassword) { this.gmailAppPassword = gmailAppPassword; }

    // expose slug
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    // Payment QR image URL (can be relative path or absolute URL)
    public String getPaymentQrImageUrl() { return paymentQrImageUrl; }
    public void setPaymentQrImageUrl(String paymentQrImageUrl) { this.paymentQrImageUrl = paymentQrImageUrl; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

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
