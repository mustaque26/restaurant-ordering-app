package com.axinq.restaurant.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Properties;

@Configuration
public class MailConfig {

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
        props.put("mail.debug", "false");
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
        props.put("mail.debug", "false");
        return mailSender;
    }
}
