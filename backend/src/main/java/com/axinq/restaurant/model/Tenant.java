package com.axinq.restaurant.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "tenants")
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String logoUrl;

    private String adminEmail;

    private String plan; // BASIC or PRIME

    private String featuresJson; // simple JSON string storing selected extras
    private boolean onboarded = false;
    private java.math.BigDecimal subscriptionAmount;

    private Instant createdAt = Instant.now();

    public Tenant() {}

    public Tenant(String name, String logoUrl, String adminEmail, String plan, String featuresJson) {
        this.name = name;
        this.logoUrl = logoUrl;
        this.adminEmail = adminEmail;
        this.plan = plan;
        this.featuresJson = featuresJson;
        this.createdAt = Instant.now();
    }

    // getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
    public String getAdminEmail() { return adminEmail; }
    public void setAdminEmail(String adminEmail) { this.adminEmail = adminEmail; }
    public String getPlan() { return plan; }
    public void setPlan(String plan) { this.plan = plan; }
    public String getFeaturesJson() { return featuresJson; }
    public void setFeaturesJson(String featuresJson) { this.featuresJson = featuresJson; }
    public boolean isOnboarded() { return onboarded; }
    public void setOnboarded(boolean onboarded) { this.onboarded = onboarded; }
    public java.math.BigDecimal getSubscriptionAmount() { return subscriptionAmount; }
    public void setSubscriptionAmount(java.math.BigDecimal subscriptionAmount) { this.subscriptionAmount = subscriptionAmount; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
