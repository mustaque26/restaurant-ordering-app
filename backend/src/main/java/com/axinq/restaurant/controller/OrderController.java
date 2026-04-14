package com.axinq.restaurant.controller;

import com.axinq.restaurant.dto.CreateOrderRequest;
import com.axinq.restaurant.dto.OrderResponse;
import com.axinq.restaurant.model.Order;
import com.axinq.restaurant.model.OrderItem;
import com.axinq.restaurant.service.SystemEmailService;
import com.axinq.restaurant.service.TenantEmailService;
import com.axinq.restaurant.service.OrderService;
import com.axinq.restaurant.service.WhatsappQueueService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;
import com.axinq.restaurant.repository.TenantRepository;
import com.axinq.restaurant.model.Tenant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private static final Logger log = LoggerFactory.getLogger(OrderController.class);

    private final OrderService orderService;
    private final SystemEmailService systemEmailService;
    private final TenantEmailService tenantEmailService;
    private final WhatsappQueueService whatsappQueue;
    private final TenantRepository tenantRepository;

    @Autowired
    public OrderController(OrderService orderService, SystemEmailService systemEmailService, TenantEmailService tenantEmailService, WhatsappQueueService whatsappQueue, TenantRepository tenantRepository) {
        this.orderService = orderService;
        this.systemEmailService = systemEmailService;
        this.tenantEmailService = tenantEmailService;
        this.whatsappQueue = whatsappQueue;
        this.tenantRepository = tenantRepository;
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CreateOrderRequest request,
                                                UriComponentsBuilder uriBuilder) {
        // Validate channel selection
        if (!request.sendEmail() && !request.sendWhatsapp()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Select at least one delivery channel: email or whatsapp");
        }
        if (request.sendEmail() && (request.email() == null || request.email().isBlank())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Email is required when 'sendEmail' is selected");
        }
        if (request.sendWhatsapp() && (request.phoneNumber() == null || request.phoneNumber().isBlank())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Phone number is required when 'sendWhatsapp' is selected");
        }

        Order saved = orderService.createOrder(request);
        if (saved == null || saved.getId() == null) {
            return ResponseEntity.internalServerError().build();
        }

        StringBuilder itemsList = new StringBuilder();
        if (saved.getItems() != null && !saved.getItems().isEmpty()) {
            for (var item : saved.getItems()) {
                itemsList.append("- ")
                        .append(item.getItemName())
                        .append(" x")
                        .append(item.getQuantity())
                        .append(" @ ₹")
                        .append(item.getPrice())
                        .append(" = ₹")
                        .append(item.getLineTotal())
                        .append("\n");
            }
        }
        String total = saved.getTotalAmount() != null ? saved.getTotalAmount().toString() : "0.00";

        // Build professional HTML email
        String tenantName = "Dizminu Restaurant";
        String tenantFrom = null;
        String tenantPassword = null;
        Long effectiveTenantId = request.tenantId() != null ? request.tenantId() : saved.getTenantId();
        if (effectiveTenantId != null) {
            Tenant t = tenantRepository.findById(effectiveTenantId).orElse(null);
            if (t != null) {
                if (t.getName() != null && !t.getName().isBlank()) tenantName = t.getName();
                if (t.getAdminEmail() != null && !t.getAdminEmail().isBlank()) tenantFrom = t.getAdminEmail();
                tenantPassword = t.getGmailAppPassword();
            }
        }

        String subject = String.format("Order Confirmation - %s", tenantName);

        // Build an HTML table for order items
        StringBuilder itemsTable = new StringBuilder();
        itemsTable.append("<table style=\"width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;\">")
                .append("<thead><tr style=\"background:#f6f8fa;text-align:left;\"><th style=\"padding:8px;border-bottom:1px solid #eaeaea;\">Item</th><th style=\"padding:8px;border-bottom:1px solid #eaeaea;\">Qty</th><th style=\"padding:8px;border-bottom:1px solid #eaeaea;\">Price</th><th style=\"padding:8px;border-bottom:1px solid #eaeaea;\">Total</th></tr></thead><tbody>");
        if (saved.getItems() != null) {
            for (var it : saved.getItems()) {
                itemsTable.append("<tr>")
                        .append("<td style=\"padding:8px;border-bottom:1px solid #f1f1f1;\">" + escapeHtml(it.getItemName()) + "</td>")
                        .append("<td style=\"padding:8px;border-bottom:1px solid #f1f1f1;\">" + it.getQuantity() + "</td>")
                        .append("<td style=\"padding:8px;border-bottom:1px solid #f1f1f1;\">₹" + it.getPrice() + "</td>")
                        .append("<td style=\"padding:8px;border-bottom:1px solid #f1f1f1;\">₹" + it.getLineTotal() + "</td>")
                        .append("</tr>");
            }
        }
        itemsTable.append("</tbody></table>");

        String htmlBody = "<div style=\"font-family:Arial,Helvetica,sans-serif;color:#222;max-width:680px;margin:0 auto;\">" +
                "<div style=\"display:flex;align-items:center;gap:12px;\">" +
                "<img src=\"cid:dizminuLogo\" alt=\"Dizminu\" style=\"width:96px;height:auto;display:block;\">" +
                "<div style=\"font-size:18px;font-weight:700;color:#0b486b;\">" + escapeHtml(tenantName) + "</div>" +
                "</div>" +
                "<hr style=\"border:none;border-top:1px solid #eee;margin:12px 0;\">" +
                "<p style=\"margin:0 0 12px 0;\">Thank you for your order, <strong>" + escapeHtml(saved.getCustomerName()) + "</strong>!</p>" +
                "<p style=\"margin:0 0 12px 0;color:#666;\">Order ID: <strong>" + saved.getId() + "</strong></p>" +
                itemsTable.toString() +
                "<div style=\"margin-top:12px;text-align:right;font-size:16px;font-weight:700;\">Total: ₹" + total + "</div>" +
                "<hr style=\"border:none;border-top:1px solid #eee;margin:18px 0;\">" +
                "<div style=\"display:flex;align-items:center;gap:12px;\">" +
                "  <div style=\"line-height:1;\">" +
                "    <div style=\"font-weight:700;color:#222;\">Best regards,</div>" +
                "    <div style=\"font-weight:700;color:#0b486b;\">" + escapeHtml(tenantName) + "</div>" +
                "  </div>" +
                "  <div style=\"margin-left:12px;\">" +
                "    <img src=\"cid:dizminuLogo\" alt=\"logo\" style=\"width:88px;height:auto;display:block;\">" +
                "  </div>" +
                "</div>" +
                "<div style=\"margin-top:8px;color:#0b486b;font-weight:700;\">Axinq Technology</div>" +
                "<div style=\"color:#0b486b;font-weight:600;margin-top:2px;\">for Smarter Dining</div>" +
                "</div>";

        // Send HTML email: try tenant SMTP (HTML) if tenant info present, otherwise use system sender HTML
        if (request.sendEmail()) {
            try {
                if (tenantFrom != null) {
                    // Attempt to send via tenant SMTP (will fallback internally to sales sender if needed)
                    tenantEmailService.sendFromTenantAddressHtml(tenantFrom, tenantPassword, request.email(), subject, htmlBody);
                } else {
                    systemEmailService.sendFromDizminuHtml(request.email(), subject, htmlBody);
                }
            } catch (Exception ex) {
                log.warn("OrderController: failed to send HTML order confirmation, attempting plain-text fallback", ex);
                // Fallback to plain text as a last resort
                try {
                    String textBody = "Thank you for your order, " + saved.getCustomerName() + "!\nYour order ID is: " + saved.getId() + "\n\nTotal: ₹" + total + "\n";
                    if (tenantFrom != null) {
                        tenantEmailService.sendFromTenantAddress(tenantFrom, tenantPassword, request.email(), subject, textBody);
                    } else {
                        systemEmailService.sendFromDizminu(request.email(), subject, textBody);
                    }
                } catch (Exception ex2) {
                    log.error("OrderController: final fallback send failed", ex2);
                }
            }
        }

        if (request.sendWhatsapp()) {
            try {
                // Enqueue; also request admin copy when both channels are selected
                boolean adminCopy = request.sendEmail();
                whatsappQueue.enqueue(request.phoneNumber(), "New order: " + saved.getId(), adminCopy);
            } catch (Exception ex) {
                // log and continue
            }
        }

        var location = uriBuilder.path("/api/orders/{id}").buildAndExpand(saved.getId()).toUri();
        // Return the full saved order so clients can render details immediately (includes items)
        return ResponseEntity.created(location).body(saved);
    }

    @GetMapping
    public List<Order> getAll() {
        return orderService.getOrders();
    }

    @GetMapping("/{id}")
    public Order getById(@PathVariable Long id) {
        return orderService.getOrder(id);
    }

    @GetMapping(value = "/{id}/receipt", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> getReceipt(@PathVariable Long id) {
        try {
            Order order = orderService.getOrder(id);
            if (order == null) return ResponseEntity.notFound().build();

            String tenantName = "Dizminu Restaurant";
            Long tenantId = order.getTenantId();
            if (tenantId != null) {
                Tenant t = tenantRepository.findById(tenantId).orElse(null);
                if (t != null && t.getName() != null && !t.getName().isBlank()) tenantName = t.getName();
            }

            StringBuilder itemsTable = new StringBuilder();
            itemsTable.append("<table style='width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;'>");
            itemsTable.append("<thead><tr style='background:#f6f8fa;text-align:left;'><th style='padding:8px;border-bottom:1px solid #eaeaea;'>Item</th><th style='padding:8px;border-bottom:1px solid #eaeaea;'>Qty</th><th style='padding:8px;border-bottom:1px solid #eaeaea;'>Price</th><th style='padding:8px;border-bottom:1px solid #eaeaea;'>Total</th></tr></thead><tbody>");
            if (order.getItems() != null) {
                for (OrderItem it : order.getItems()) {
                    itemsTable.append("<tr>")
                            .append("<td style='padding:8px;border-bottom:1px solid #f1f1f1;'>" + escapeHtml(it.getItemName()) + "</td>")
                            .append("<td style='padding:8px;border-bottom:1px solid #f1f1f1;'>" + it.getQuantity() + "</td>")
                            .append("<td style='padding:8px;border-bottom:1px solid #f1f1f1;'>₹" + it.getPrice() + "</td>")
                            .append("<td style='padding:8px;border-bottom:1px solid #f1f1f1;'>₹" + it.getLineTotal() + "</td>")
                            .append("</tr>");
                }
            }
            itemsTable.append("</tbody></table>");

            String html = "<html><head><meta charset='utf-8'><title>Receipt - " + escapeHtml(tenantName) + "</title></head><body style='font-family:Arial,Helvetica,sans-serif;color:#222;'>" +
                    "<div style='max-width:720px;margin:0 auto;padding:18px;'>" +
                    "<div style='display:flex;align-items:center;gap:12px;'><div style='font-size:20px;font-weight:700;color:#0b486b;'>" + escapeHtml(tenantName) + "</div></div>" +
                    "<hr style='border:none;border-top:1px solid #eee;margin:12px 0;' />" +
                    "<p>Order ID: <strong>" + order.getId() + "</strong></p>" +
                    itemsTable.toString() +
                    "<div style='text-align:right;margin-top:12px;font-size:16px;font-weight:700;'>Total: ₹" + (order.getTotalAmount() != null ? order.getTotalAmount().toString() : "0.00") + "</div>" +
                    "<div style='margin-top:18px;'>" +
                    "<div><strong>Customer:</strong> " + escapeHtml(order.getCustomerName()) + "</div>" +
                    "<div><strong>Address:</strong> " + escapeHtml(order.getDeliveryAddress()) + "</div>" +
                    "<div><strong>Phone:</strong> " + escapeHtml(order.getPhoneNumber()) + "</div>" +
                    (order.getPaymentReference() != null ? "<div><strong>Payment Ref:</strong> " + escapeHtml(order.getPaymentReference()) + "</div>" : "") +
                    "</div>" +
                    "</div></body></html>";

            return ResponseEntity.ok(html);
        } catch (Exception ex) {
            log.error("Failed to build receipt for order {}", id, ex);
            return ResponseEntity.status(500).body("<html><body><h3>Unable to generate receipt</h3></body></html>");
        }
    }

    // minimal HTML-escaping helper
    private static String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;");
    }
}
