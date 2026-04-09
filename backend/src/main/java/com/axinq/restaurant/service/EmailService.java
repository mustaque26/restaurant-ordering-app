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

    private final JavaMailSender franzzoSender;
    private final JavaMailSender salesSender;

    @Value("${spring.mail.franzzo.username:franzzo057@gmail.com}")
    private String franzzoFrom;

    @Value("${spring.mail.sales.username:consulting@axinq.com}")
    private String salesFrom;

    @Autowired
    public EmailService(@Qualifier("franzzoMailSender") JavaMailSender franzzoSender,
                        @Qualifier("salesMailSender") JavaMailSender salesSender) {
        this.franzzoSender = franzzoSender;
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

    // For order confirmations or OTP -> use franzzo sender
    public void sendFromFranzzo(String toEmail, String subject, String body) {
        send(franzzoSender, franzzoFrom, toEmail, subject, body);
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
