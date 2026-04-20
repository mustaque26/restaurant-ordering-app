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

import java.io.File;
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
        try {
            // prefer a local ./backend/logs directory (relative to working dir); create if missing
            File dir = new File("./backend/logs");
            if (!dir.exists()) dir.mkdirs();
            File file = new File(dir, "email_debug.log");
            try (FileWriter fw = new FileWriter(file, true);
                 PrintWriter pw = new PrintWriter(fw)) {
                pw.println("[" + Instant.now().toString() + "] " + s);
                if (ex != null) {
                    ex.printStackTrace(pw);
                }
            }
        } catch (Exception e) {
            log.warn("Unable to write email debug file to ./backend/logs/email_debug.log", e);
        }
    }

    private void sendText(JavaMailSender sender, String from, String toEmail, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        if (from != null && !from.isBlank()) message.setFrom(from);
        else if (dizminuFrom != null && !dizminuFrom.isBlank()) message.setFrom(dizminuFrom);
        message.setTo(toEmail);
        message.setSubject(subject);
        message.setText(body);
        try {
            String info = String.format("SystemEmail: sending from=%s to=%s subject=%s", from != null && !from.isBlank() ? from : dizminuFrom, toEmail, subject);
            log.info(info);
            writeDebug(info, null);
            sender.send(message);
            String ok = String.format("SystemEmail: sent to=%s", toEmail);
            log.info(ok);
            writeDebug(ok, null);
        } catch (Exception ex) {
            String err = String.format("SystemEmail: failed to send to %s (subject=%s) with sender=%s -> %s", toEmail, subject, sender==dizminuSender?"dizminuSender":"other", ex.toString());
            log.error(err, ex);
            writeDebug(err, ex);
            // If we failed using the dizminu sender, try salesSender fallback
            if (sender == dizminuSender) {
                try {
                    String fallback = String.format("SystemEmail: falling back to sales sender for to=%s subject=%s", toEmail, subject);
                    log.info(fallback);
                    writeDebug(fallback, null);
                    SimpleMailMessage fallbackMsg = new SimpleMailMessage();
                    if (from != null && !from.isBlank()) fallbackMsg.setFrom(from);
                    else fallbackMsg.setFrom(salesFrom);
                    fallbackMsg.setTo(toEmail);
                    fallbackMsg.setSubject(subject);
                    fallbackMsg.setText(body);
                    salesSender.send(fallbackMsg);
                    String ok2 = String.format("SystemEmail: sent via sales sender to=%s", toEmail);
                    log.info(ok2);
                    writeDebug(ok2, null);
                    return;
                } catch (Exception ex2) {
                    String err2 = String.format("SystemEmail: fallback sales sender also failed for to=%s -> %s", toEmail, ex2.toString());
                    log.error(err2, ex2);
                    writeDebug(err2, ex2);
                }
            }
            throw ex;
        }
    }

    private void sendHtml(JavaMailSender sender, String from, String toEmail, String subject, String htmlBody) {
        try {
            MimeMessage mime = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
            if (from != null && !from.isBlank()) helper.setFrom(from);
            else if (dizminuFrom != null && !dizminuFrom.isBlank()) helper.setFrom(dizminuFrom);
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

            String info = String.format("SystemEmail(HTML): sending from=%s to=%s subject=%s", from != null && !from.isBlank() ? from : dizminuFrom, toEmail, subject);
            log.info(info);
            writeDebug(info, null);
            sender.send(mime);
            String ok = String.format("SystemEmail(HTML): sent to=%s", toEmail);
            log.info(ok);
            writeDebug(ok, null);
        } catch (Exception ex) {
            String err = String.format("SystemEmail(HTML): failed to send to %s (subject=%s) with sender=%s -> %s", toEmail, subject, ex.toString(), ex.toString());
            log.error(err, ex);
            writeDebug(err, ex);
            // fallback to salesSender if the original sender was dizminuSender
            if (sender == dizminuSender) {
                try {
                    String fallback = String.format("SystemEmail(HTML): falling back to sales sender for to=%s subject=%s", toEmail, subject);
                    log.info(fallback);
                    writeDebug(fallback, null);
                    MimeMessage mime2 = salesSender.createMimeMessage();
                    MimeMessageHelper helper2 = new MimeMessageHelper(mime2, true, "UTF-8");
                    if (from != null && !from.isBlank()) helper2.setFrom(from);
                    else helper2.setFrom(salesFrom);
                    helper2.setTo(toEmail);
                    helper2.setSubject(subject);
                    helper2.setText(htmlBody, true);
                    // attach logo if available
                    try {
                        ClassPathResource logo = new ClassPathResource("static/images/dizminuLogo.png");
                        if (!logo.exists()) {
                            logo = new ClassPathResource("static/images/dizminu-logo.png");
                        }
                        if (!logo.exists()) {
                            logo = new ClassPathResource("static/images/axinq-logo.png");
                        }
                        if (logo.exists()) {
                            helper2.addInline("dizminuLogo", logo);
                        }
                    } catch (Exception ignore) {}

                    salesSender.send(mime2);
                    String ok2 = String.format("SystemEmail(HTML): sent via sales sender to=%s", toEmail);
                    log.info(ok2);
                    writeDebug(ok2, null);
                    return;
                } catch (Exception ex2) {
                    String err2 = String.format("SystemEmail(HTML): fallback sales sender also failed for to=%s -> %s", toEmail, ex2.toString());
                    log.error(err2, ex2);
                    writeDebug(err2, ex2);
                }
            }
            throw new RuntimeException(ex);
        }
    }

    public void sendFromDizminu(String toEmail, String subject, String body) {
        sendText(dizminuSender, null, toEmail, subject, body);
    }

    /**
     * Send from Dizminu sender but set the From header to the provided value when supplied.
     * Useful as a fallback when tenant SMTP cannot be used but we still want the email to appear
     * from the tenant's admin address.
     */
    public void sendFromDizminuTenant(String from, String toEmail, String subject, String body) {
        sendText(dizminuSender, from, toEmail, subject, body);
    }

    // HTML sending helpers (public)
    public void sendFromDizminuHtml(String toEmail, String subject, String htmlBody) {
        sendHtml(dizminuSender, null, toEmail, subject, htmlBody);
    }

    public void sendFromDizminuTenantHtml(String from, String toEmail, String subject, String htmlBody) {
        sendHtml(dizminuSender, from, toEmail, subject, htmlBody);
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
