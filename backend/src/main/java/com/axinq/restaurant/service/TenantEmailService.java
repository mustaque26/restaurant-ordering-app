package com.axinq.restaurant.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class TenantEmailService {
    private static final Logger log = LoggerFactory.getLogger(TenantEmailService.class);

    private final JavaMailSender salesSender;

    @Value("${spring.mail.sales.username:consulting@axinq.com}")
    private String salesFrom;

    public TenantEmailService(@Qualifier("salesMailSender") JavaMailSender salesSender) {
        this.salesSender = salesSender;
    }

    /**
     * Send an email where the From header is explicitly set to the tenant's admin email.
     * The SMTP envelope uses the application's sales SMTP credentials, but the From header
     * will read as the tenant's address.
     */
    public void sendFromTenantAddress(String tenantFrom, String toEmail, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        if (tenantFrom != null && !tenantFrom.isBlank()) message.setFrom(tenantFrom);
        message.setTo(toEmail);
        message.setSubject(subject);
        message.setText(body);
        try {
            log.info("TenantEmail: sending from={} to={} subject={}", tenantFrom, toEmail, subject);
            salesSender.send(message);
            log.info("TenantEmail: sent to={}", toEmail);
        } catch (Exception ex) {
            log.error("TenantEmail: failed to send to {} (subject={})", toEmail, subject, ex);
            throw ex;
        }
    }
}

