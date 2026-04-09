package com.axinq.restaurant.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "tenant_tokens")
public class TenantToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long tenantId;

    private String token;

    private Instant expiryAt;

    public TenantToken() {}

    // getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public Instant getExpiryAt() { return expiryAt; }
    public void setExpiryAt(Instant expiryAt) { this.expiryAt = expiryAt; }
}

