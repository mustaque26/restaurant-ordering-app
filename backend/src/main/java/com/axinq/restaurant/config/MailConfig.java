package com.axinq.restaurant.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Properties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Configuration
public class MailConfig {

    private static final Logger log = LoggerFactory.getLogger(MailConfig.class);

    @Value("${spring.mail.dizminu.host:smtp.gmail.com}")
    private String dizminuHost;
    @Value("${spring.mail.dizminu.port:587}")
    private int dizminuPort;
    @Value("${spring.mail.dizminu.username:dizminu057@gmail.com}")
    private String dizminuUsername;
    // Prefer environment variable SPRING_MAIL_DIZMINU_PASSWORD, fall back to property spring.mail.dizminu.password
    @Value("${SPRING_MAIL_DIZMINU_PASSWORD:${spring.mail.dizminu.password:}}")
    private String dizminuPassword;

    @Value("${spring.mail.sales.host:smtp.gmail.com}")
    private String salesHost;
    @Value("${spring.mail.sales.port:587}")
    private int salesPort;
    @Value("${spring.mail.sales.username:consulting@axinq.com}")
    private String salesUsername;
    // Prefer environment variable SPRING_MAIL_SALES_PASSWORD, fall back to property spring.mail.sales.password
    @Value("${SPRING_MAIL_SALES_PASSWORD:${spring.mail.sales.password:}}")
    private String salesPassword;

    // Optional timeouts read from properties (fallbacks in application.properties)
    @Value("${spring.mail.properties.mail.smtp.connectiontimeout:5000}")
    private int smtpConnectionTimeout;
    @Value("${spring.mail.properties.mail.smtp.timeout:5000}")
    private int smtpTimeout;
    @Value("${spring.mail.properties.mail.smtp.writetimeout:5000}")
    private int smtpWriteTimeout;

    @Bean(name = "dizminuMailSender")
    public JavaMailSender dizminuMailSender() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(dizminuHost);
        mailSender.setPort(dizminuPort);
        mailSender.setUsername(dizminuUsername);
        if (dizminuPassword != null && !dizminuPassword.isBlank()) mailSender.setPassword(dizminuPassword);

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        // apply timeouts to avoid long JVM hangs on network issues
        props.put("mail.smtp.connectiontimeout", String.valueOf(smtpConnectionTimeout));
        props.put("mail.smtp.timeout", String.valueOf(smtpTimeout));
        props.put("mail.smtp.writetimeout", String.valueOf(smtpWriteTimeout));
        // trust the host to avoid SSL handshake failures in some environments
        props.put("mail.smtp.ssl.trust", dizminuHost);
        props.put("mail.debug", "false");

        log.info("Configured dizminuMailSender host={} port={} user={}, timeouts(ms) conn/rt/wr={}/{}/{}",
                dizminuHost, dizminuPort, dizminuUsername, smtpConnectionTimeout, smtpTimeout, smtpWriteTimeout);

        return mailSender;
    }

    @Bean(name = "salesMailSender")
    public JavaMailSender salesMailSender() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(salesHost);
        mailSender.setPort(salesPort);
        mailSender.setUsername(salesUsername);
        if (salesPassword != null && !salesPassword.isBlank()) mailSender.setPassword(salesPassword);

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.connectiontimeout", String.valueOf(smtpConnectionTimeout));
        props.put("mail.smtp.timeout", String.valueOf(smtpTimeout));
        props.put("mail.smtp.writetimeout", String.valueOf(smtpWriteTimeout));
        props.put("mail.smtp.ssl.trust", salesHost);
        props.put("mail.debug", "false");

        log.info("Configured salesMailSender host={} port={} user={}, timeouts(ms) conn/rt/wr={}/{}/{}",
                salesHost, salesPort, salesUsername, smtpConnectionTimeout, smtpTimeout, smtpWriteTimeout);

        return mailSender;
    }
}
