package com.axinq.restaurant.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.mail.internet.MimeMessage;
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
     * Plain-text send: try tenant SMTP then fall back to sales sender with From header set.
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
            props.put("mail.smtp.connectiontimeout", "5000");
            props.put("mail.smtp.timeout", "5000");
            props.put("mail.smtp.writetimeout", "5000");
            props.put("mail.smtp.ssl.trust", "smtp.gmail.com");
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
                log.warn("TenantEmail: failed to send with tenant SMTP for from={}; falling back to sales sender; error={}", tenantFrom, ex.toString());
                // If the exception is UnknownHostException or connectivity related, add a clearer message
                if (ex.getCause() != null) {
                    log.debug("TenantEmail: tenant SMTP failure cause:", ex.getCause());
                }
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
            log.error("TenantEmail: failed to send to {} (subject={}) via sales sender. error={}", toEmail, subject, ex.toString(), ex);
            throw ex;
        }
    }

    /**
     * HTML send using tenant SMTP (preferred). Fallback to sales sender with From header set.
     */
    public void sendFromTenantAddressHtml(String tenantFrom, String tenantPassword, String toEmail, String subject, String htmlBody) {
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
            props.put("mail.smtp.connectiontimeout", "5000");
            props.put("mail.smtp.timeout", "5000");
            props.put("mail.smtp.writetimeout", "5000");
            props.put("mail.smtp.ssl.trust", "smtp.gmail.com");
            props.put("mail.debug", "false");

            try {
                MimeMessage mime = tenantSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
                helper.setFrom(tenantFrom);
                helper.setTo(toEmail);
                helper.setSubject(subject);
                helper.setText(htmlBody, true);

                // attach inline logo if available
                try {
                    ClassPathResource logo = new ClassPathResource("static/images/dizminuLogo.png");
                    if (!logo.exists()) logo = new ClassPathResource("static/images/dizminu-logo.png");
                    if (!logo.exists()) logo = new ClassPathResource("static/images/axinq-logo.png");
                    if (logo.exists()) helper.addInline("dizminuLogo", logo);
                } catch (Exception ignore) {}

                log.info("TenantEmail(HTML): sending with tenant SMTP from={} to={} subject={}", tenantFrom, toEmail, subject);
                tenantSender.send(mime);
                log.info("TenantEmail(HTML): sent via tenant SMTP to={}", toEmail);
                return;
            } catch (Exception ex) {
                log.warn("TenantEmail(HTML): failed via tenant SMTP for from={}; falling back to sales sender; error={}", tenantFrom, ex.toString());
            }
        }

        // Fallback to sales sender with From header set
        try {
            MimeMessage mime = salesSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
            if (tenantFrom != null && !tenantFrom.isBlank()) helper.setFrom(tenantFrom);
            else helper.setFrom(salesFrom);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            try {
                ClassPathResource logo = new ClassPathResource("static/images/dizminuLogo.png");
                if (!logo.exists()) logo = new ClassPathResource("static/images/dizminu-logo.png");
                if (!logo.exists()) logo = new ClassPathResource("static/images/axinq-logo.png");
                if (logo.exists()) helper.addInline("dizminuLogo", logo);
            } catch (Exception ignore) {}

            log.info("TenantEmail(HTML): sending via sales sender from={} to={} subject={}", tenantFrom != null ? tenantFrom : salesFrom, toEmail, subject);
            salesSender.send(mime);
            log.info("TenantEmail(HTML): sent via sales sender to={}", toEmail);
        } catch (Exception ex) {
            log.error("TenantEmail(HTML): failed to send to {} (subject={}) via sales sender. error={}", toEmail, subject, ex.toString(), ex);
            throw new RuntimeException(ex);
        }
    }
}
