package com.axinq.restaurant.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "whatsapp_messages")
public class WhatsappMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String toPhone;

    @Lob
    private String body;

    private int attempts = 0;

    private int maxAttempts = 5;

    private String status = "PENDING"; // PENDING, SENT, FAILED

    private Instant nextAttemptAt;

    private Instant createdAt = Instant.now();

    private Instant lastAttemptAt;

    @Lob
    private String lastError;

    public WhatsappMessage() {
    }

    public WhatsappMessage(String toPhone, String body, int maxAttempts, Instant nextAttemptAt) {
        this.toPhone = toPhone;
        this.body = body;
        this.maxAttempts = maxAttempts;
        this.nextAttemptAt = nextAttemptAt;
        this.createdAt = Instant.now();
        this.status = "PENDING";
    }

    // getters and setters
    public Long getId() { return id; }
    public String getToPhone() { return toPhone; }
    public void setToPhone(String toPhone) { this.toPhone = toPhone; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public int getAttempts() { return attempts; }
    public void setAttempts(int attempts) { this.attempts = attempts; }
    public int getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getNextAttemptAt() { return nextAttemptAt; }
    public void setNextAttemptAt(Instant nextAttemptAt) { this.nextAttemptAt = nextAttemptAt; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getLastAttemptAt() { return lastAttemptAt; }
    public void setLastAttemptAt(Instant lastAttemptAt) { this.lastAttemptAt = lastAttemptAt; }
    public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; }
}

