package com.axinq.restaurant.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.FileWriter;
import java.io.PrintWriter;
import java.time.Instant;

import jakarta.mail.internet.MimeMessage;

@Service
public class SystemEmailService {
    private static final Logger log = LoggerFactory.getLogger(SystemEmailService.class);

    private final JavaMailSender dizminuSender;
    private final JavaMailSender salesSender;

    @Value("${spring.mail.dizminu.username:dizminu057@gmail.com}")
    private String dizminuFrom;

    @Value("${spring.mail.sales.username:consulting@axinq.com}")
    private String salesFrom;

    public SystemEmailService(@Qualifier("dizminuMailSender") JavaMailSender dizminuSender,
                              @Qualifier("salesMailSender") JavaMailSender salesSender) {
        this.dizminuSender = dizminuSender;
        this.salesSender = salesSender;
    }

    private void writeDebug(String s, Exception ex) {
        try (FileWriter fw = new FileWriter("/tmp/email_debug.log", true);
             PrintWriter pw = new PrintWriter(fw)) {
            pw.println("[" + Instant.now().toString() + "] " + s);
            if (ex != null) {
                ex.printStackTrace(pw);
            }
        } catch (Exception e) {
            log.warn("Unable to write email debug file", e);
        }
    }

    private void sendText(JavaMailSender sender, String from, String toEmail, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        if (from != null && !from.isBlank()) message.setFrom(from);
        message.setTo(toEmail);
        message.setSubject(subject);
        message.setText(body);
        try {
            String info = String.format("SystemEmail: sending from=%s to=%s subject=%s", from, toEmail, subject);
            log.info(info);
            writeDebug(info, null);
            sender.send(message);
            String ok = String.format("SystemEmail: sent to=%s", toEmail);
            log.info(ok);
            writeDebug(ok, null);
        } catch (Exception ex) {
            String err = String.format("SystemEmail: failed to send to %s (subject=%s) -> %s", toEmail, subject, ex.toString());
            log.error(err, ex);
            writeDebug(err, ex);
            throw ex;
        }
    }

    private void sendHtml(JavaMailSender sender, String from, String toEmail, String subject, String htmlBody) {
        try {
            MimeMessage mime = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
            if (from != null && !from.isBlank()) helper.setFrom(from);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            // set HTML body
            helper.setText(htmlBody, true);

            // try to attach inline logo from classpath (prefer dizminuLogo/dizminu-logo, fallback to axinq-logo)
            try {
                ClassPathResource logo = new ClassPathResource("static/images/dizminuLogo.png");
                if (!logo.exists()) {
                    logo = new ClassPathResource("static/images/dizminu-logo.png");
                }
                if (!logo.exists()) {
                    logo = new ClassPathResource("static/images/axinq-logo.png");
                }
                if (logo.exists()) {
                    // attach with cid 'dizminuLogo' for new branding, keep old cid available if templates still use it
                    helper.addInline("dizminuLogo", logo);
                    // also add legacy cid for backward compatibility
                    try {
                        helper.addInline("axinqLogo", logo);
                    } catch (Exception ignore) {}
                }
            } catch (Exception e) {
                log.debug("Logo not found or failed to attach inline", e);
            }

            String info = String.format("SystemEmail(HTML): sending from=%s to=%s subject=%s", from, toEmail, subject);
            log.info(info);
            writeDebug(info, null);
            sender.send(mime);
            String ok = String.format("SystemEmail(HTML): sent to=%s", toEmail);
            log.info(ok);
            writeDebug(ok, null);
        } catch (Exception ex) {
            String err = String.format("SystemEmail(HTML): failed to send to %s (subject=%s) -> %s", toEmail, subject, ex.toString());
            log.error(err, ex);
            writeDebug(err, ex);
            throw new RuntimeException(ex);
        }
    }

    public void sendFromDizminu(String toEmail, String subject, String body) {
        sendText(dizminuSender, dizminuFrom, toEmail, subject, body);
    }

    public void sendFromSales(String toEmail, String subject, String body) {
        sendText(salesSender, salesFrom, toEmail, subject, body);
    }

    /**
     * Send an HTML onboarding/sales email (with logo inline if available).
     */
    public void sendFromSalesHtml(String toEmail, String subject, String htmlBody) {
        sendHtml(salesSender, salesFrom, toEmail, subject, htmlBody);
    }
}
