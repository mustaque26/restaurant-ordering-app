package com.axinq.restaurant.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender dizminuSender;
    private final JavaMailSender salesSender;

    @Value("${spring.mail.dizminu.username:dizminu057@gmail.com}")
    private String dizminuFrom;

    @Value("${spring.mail.sales.username:consulting@axinq.com}")
    private String salesFrom;

    @Autowired
    public EmailService(@Qualifier("dizminuMailSender") JavaMailSender dizminuSender,
                        @Qualifier("salesMailSender") JavaMailSender salesSender) {
        this.dizminuSender = dizminuSender;
        this.salesSender = salesSender;
    }

    private void send(JavaMailSender sender, String from, String toEmail, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        if (from != null && !from.isBlank()) {
            message.setFrom(from);
        }
        message.setTo(toEmail);
        message.setSubject(subject);
        message.setText(body);

        try {
            log.info("Sending email from={} to={} subject={}", from, toEmail, subject);
            sender.send(message);
            log.info("Email successfully sent to={}", toEmail);
        } catch (Exception ex) {
            log.error("Failed to send email to {} (subject={})", toEmail, subject, ex);
            throw ex;
        }
    }

    // For order confirmations or OTP -> use dizminu sender
    public void sendFromDizminu(String toEmail, String subject, String body) {
        send(dizminuSender, dizminuFrom, toEmail, subject, body);
    }

    // For tenant onboarding or sales notifications -> use sales sender
    public void sendFromSales(String toEmail, String subject, String body) {
        send(salesSender, salesFrom, toEmail, subject, body);
    }

    // Send an email using a custom From header (e.g., tenant admin email).
    // The actual SMTP sender used is the sales sender (application SMTP) but the From header will be set to the tenant email.
    public void sendFromCustom(String from, String toEmail, String subject, String body) {
        send(salesSender, from, toEmail, subject, body);
    }
}
