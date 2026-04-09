package com.axinq.restaurant.service;

import com.axinq.restaurant.model.WhatsappMessage;
import com.axinq.restaurant.repository.WhatsappMessageRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class WhatsappQueueService {

    private final WhatsappMessageRepository repo;
    private final WhatsappService whatsappService;

    @Value("${app.whatsapp.admin:}")
    private String adminNumber;

    @Value("${app.whatsapp.enabled:true}")
    private boolean enabled;

    public WhatsappQueueService(WhatsappMessageRepository repo, WhatsappService whatsappService) {
        this.repo = repo;
        this.whatsappService = whatsappService;
    }

    public void enqueue(String toPhone, String body, boolean adminCopy) {
        if (!enabled) return;
        // create message for customer
        WhatsappMessage msg = new WhatsappMessage(toPhone, body, 5, Instant.now());
        repo.save(msg);
        // create admin copy if requested and adminNumber configured
        if (adminCopy && adminNumber != null && !adminNumber.isBlank()) {
            WhatsappMessage adminMsg = new WhatsappMessage(adminNumber, body, 5, Instant.now());
            repo.save(adminMsg);
        }
    }

    // run every 30 seconds
    @Scheduled(fixedDelay = 30_000)
    public void processQueue() {
        if (!enabled) return;
        List<WhatsappMessage> list = repo.findByStatusAndNextAttemptAtBefore("PENDING", Instant.now());
        for (WhatsappMessage m : list) {
            try {
                boolean ok = whatsappService.sendTextMessage(m.getBody(), m.getToPhone());
                m.setLastAttemptAt(Instant.now());
                if (ok) {
                    m.setStatus("SENT");
                } else {
                    m.setAttempts(m.getAttempts() + 1);
                    if (m.getAttempts() >= m.getMaxAttempts()) {
                        m.setStatus("FAILED");
                    } else {
                        m.setNextAttemptAt(Instant.now().plus((long) Math.pow(2, m.getAttempts()), ChronoUnit.SECONDS));
                    }
                }
            } catch (Exception ex) {
                m.setAttempts(m.getAttempts() + 1);
                m.setLastError(ex.getMessage());
                if (m.getAttempts() >= m.getMaxAttempts()) {
                    m.setStatus("FAILED");
                } else {
                    m.setNextAttemptAt(Instant.now().plus((long) Math.pow(2, m.getAttempts()), ChronoUnit.SECONDS));
                }
            } finally {
                repo.save(m);
            }
        }
    }

}
