package com.axinq.restaurant.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Properties;

@Configuration
public class MailConfig {

    @Value("${spring.mail.franzzo.host:smtp.gmail.com}")
    private String franzzoHost;
    @Value("${spring.mail.franzzo.port:587}")
    private int franzzoPort;
    @Value("${spring.mail.franzzo.username:franzzo057@gmail.com}")
    private String franzzoUsername;
    // Prefer environment variable SPRING_MAIL_FRANZZO_PASSWORD, fall back to property spring.mail.franzzo.password
    @Value("${SPRING_MAIL_FRANZZO_PASSWORD:${spring.mail.franzzo.password:}}")
    private String franzzoPassword;

    @Value("${spring.mail.sales.host:smtp.gmail.com}")
    private String salesHost;
    @Value("${spring.mail.sales.port:587}")
    private int salesPort;
    @Value("${spring.mail.sales.username:consulting@axinq.com}")
    private String salesUsername;
    // Prefer environment variable SPRING_MAIL_SALES_PASSWORD, fall back to property spring.mail.sales.password
    @Value("${SPRING_MAIL_SALES_PASSWORD:${spring.mail.sales.password:}}")
    private String salesPassword;

    @Bean(name = "franzzoMailSender")
    public JavaMailSender franzzoMailSender() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(franzzoHost);
        mailSender.setPort(franzzoPort);
        mailSender.setUsername(franzzoUsername);
        if (franzzoPassword != null && !franzzoPassword.isBlank()) mailSender.setPassword(franzzoPassword);

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
