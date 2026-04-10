package com.axinq.restaurant.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Properties;

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
     * If tenant app password is provided, attempt to use tenant SMTP credentials (Gmail) so the
     * SMTP envelope comes from tenant's account. If that fails or password is missing, fall back
     * to using the application's sales sender and set the From header to tenantFrom.
     *
     * Note: tenantPassword is sensitive and is never logged. In production, store the password
     * encrypted or in a secrets manager.
     */
    public void sendFromTenantAddress(String tenantFrom, String tenantPassword, String toEmail, String subject, String body) {
        // Try tenant SMTP if possible
        if (tenantPassword != null && !tenantPassword.isBlank() && tenantFrom != null && !tenantFrom.isBlank()) {
            JavaMailSenderImpl tenantSender = new JavaMailSenderImpl();
            tenantSender.setHost("smtp.gmail.com");
            tenantSender.setPort(587);
            tenantSender.setUsername(tenantFrom);
            tenantSender.setPassword(tenantPassword);

            Properties props = tenantSender.getJavaMailProperties();
            props.put("mail.transport.protocol", "smtp");
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
            props.put("mail.debug", "false");

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(tenantFrom);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);

            try {
                log.info("TenantEmail: attempting to send with tenant SMTP from={} to={} subject={}", tenantFrom, toEmail, subject);
                tenantSender.send(message);
                log.info("TenantEmail: sent via tenant SMTP to={}", toEmail);
                return;
            } catch (Exception ex) {
                log.warn("TenantEmail: failed to send with tenant SMTP for from={}; falling back to sales sender", tenantFrom);
                // fall through to fallback
            }
        }

        // Fallback: use application sales sender but set From header to tenantFrom when available
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            if (tenantFrom != null && !tenantFrom.isBlank()) message.setFrom(tenantFrom);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            log.info("TenantEmail: sending via sales sender from={} to={} subject={}", tenantFrom != null ? tenantFrom : salesFrom, toEmail, subject);
            salesSender.send(message);
            log.info("TenantEmail: sent via sales sender to={}", toEmail);
        } catch (Exception ex) {
            log.error("TenantEmail: failed to send to {} (subject={}) via sales sender", toEmail, subject, ex);
            throw ex;
        }
    }
}
