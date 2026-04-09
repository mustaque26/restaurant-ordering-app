package com.axinq.restaurant.service;

import com.axinq.restaurant.model.Order;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class WhatsappService {

    private static final Logger log = LoggerFactory.getLogger(WhatsappService.class);

    @Value("${app.whatsapp.from:+919270461728}")
    private String defaultFrom;

    private final String accountSid = System.getenv("TWILIO_ACCOUNT_SID");
    private final String authToken = System.getenv("TWILIO_AUTH_TOKEN");

    public boolean sendOrderMessage(Order order, String toPhone) {
        String body = buildOrderText(order);
        return sendTextMessage(body, toPhone);
    }

    public boolean sendTextMessage(String body, String toPhone) {
        if (accountSid == null || authToken == null) {
            log.warn("Twilio credentials not set; skipping WhatsApp send");
            return false;
        }
        if (toPhone == null || toPhone.isBlank()) {
            log.warn("No recipient phone provided for WhatsApp message");
            return false;
        }

        try {
            String from = defaultFrom;
            String to = toPhone.replaceAll("\\D", "");
            if (!to.startsWith("+")) {
                if (!to.startsWith("91")) {
                    to = "91" + to;
                }
                to = "+" + to;
            }
            if (!from.startsWith("+")) {
                if (from.startsWith("91")) {
                    from = "+" + from;
                } else if (!from.startsWith("+")) {
                    from = "+" + from;
                }
            }

            // Twilio expects 'whatsapp:+<number>' in the 'From' and 'To' fields
            String twilioFrom = "whatsapp:" + from;
            String twilioTo = "whatsapp:" + to;

            String url = String.format("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", accountSid);

            RestTemplate rt = new RestTemplate();

            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("From", twilioFrom);
            form.add("To", twilioTo);
            form.add("Body", body);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.setBasicAuth(accountSid, authToken);

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(form, headers);

            ResponseEntity<String> response = rt.postForEntity(url, request, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("WhatsApp message sent to {} status={}", twilioTo, response.getStatusCode());
                return true;
            } else {
                log.warn("WhatsApp send responded with {}: {}", response.getStatusCode(), response.getBody());
                return false;
            }
        } catch (Exception ex) {
            log.error("Failed to send WhatsApp message", ex);
            return false;
        }
    }

    private String buildOrderText(Order order) {
        StringBuilder sb = new StringBuilder();
        sb.append("Thank you for your order, ").append(order.getCustomerName()).append("!\n");
        sb.append("Order ID: ").append(order.getId()).append("\n\n");
        sb.append("Items:\n");
        if (order.getItems() != null) {
            order.getItems().forEach(it -> {
                sb.append("- ").append(it.getItemName()).append(" x").append(it.getQuantity())
                        .append(" @ ₹").append(it.getPrice()).append(" = ₹").append(it.getLineTotal()).append("\n");
            });
        }
        sb.append("\nTotal: ₹").append(order.getTotalAmount()).append("\n\n");
        if (order.getPhoneNumber() != null) {
            sb.append("Customer Phone: ").append(order.getPhoneNumber()).append("\n");
        }
        if (order.getEmail() != null) {
            sb.append("Customer Email: ").append(order.getEmail()).append("\n");
        }
        if (order.getDeliveryAddress() != null) {
            sb.append("Delivery Address: ").append(order.getDeliveryAddress()).append("\n");
        }
        return sb.toString();
    }
}
