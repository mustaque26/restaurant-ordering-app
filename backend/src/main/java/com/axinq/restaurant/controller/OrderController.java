package com.axinq.restaurant.controller;

import com.axinq.restaurant.dto.CreateOrderRequest;
import com.axinq.restaurant.model.Order;
import com.axinq.restaurant.model.OrderItem;
import com.axinq.restaurant.service.SystemEmailService;
import com.axinq.restaurant.service.TenantEmailService;
import com.axinq.restaurant.service.OrderService;
import com.axinq.restaurant.service.WhatsappQueueService;
import com.axinq.restaurant.service.OrderEventService;
import com.axinq.restaurant.service.TenantAuthService;
import com.axinq.restaurant.service.AdminAuthService;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
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
import org.springframework.http.HttpHeaders;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import java.io.ByteArrayOutputStream;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.springframework.data.domain.Page;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private static final Logger log = LoggerFactory.getLogger(OrderController.class);

    private final OrderService orderService;
    private final SystemEmailService systemEmailService;
    private final TenantEmailService tenantEmailService;
    private final WhatsappQueueService whatsappQueue;
    private final TenantRepository tenantRepository;
    private final OrderEventService orderEventService;
    private final TenantAuthService tenantAuthService;
    private final AdminAuthService adminAuthService;

    @Autowired
    public OrderController(OrderService orderService, SystemEmailService systemEmailService, TenantEmailService tenantEmailService, WhatsappQueueService whatsappQueue, TenantRepository tenantRepository, OrderEventService orderEventService, TenantAuthService tenantAuthService, AdminAuthService adminAuthService) {
        this.orderService = orderService;
        this.systemEmailService = systemEmailService;
        this.tenantEmailService = tenantEmailService;
        this.whatsappQueue = whatsappQueue;
        this.tenantRepository = tenantRepository;
        this.orderEventService = orderEventService;
        this.tenantAuthService = tenantAuthService;
        this.adminAuthService = adminAuthService;
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

    // New endpoint: return a PDF version of the receipt
    @GetMapping(value = "/{id}/receipt.pdf", produces = "application/pdf")
    public ResponseEntity<byte[]> getReceiptPdf(@PathVariable Long id) {
        Order order = orderService.getOrder(id);
        if (order == null) return ResponseEntity.notFound().build();
        try {
            ResponseEntity<String> htmlResp = getReceipt(id);
            if (!htmlResp.getStatusCode().is2xxSuccessful() || htmlResp.getBody() == null) {
                return ResponseEntity.status(htmlResp.getStatusCode()).build();
            }
            String html = htmlResp.getBody();

            // Remove CID or unsupported image references which OpenHTMLToPDF can't resolve
            html = html.replaceAll("(?i)<img[^>]*src\\s*=\\s*\"cid:[^\"]*\"[^>]*>", "");

            // Ensure we have a full HTML document for the renderer
            if (!html.toLowerCase().contains("<html")) {
                html = "<html><head><meta charset='utf-8'><style>body{font-family:Arial,Helvetica,sans-serif;color:#222}</style></head><body>" + html + "</body></html>";
            }

            // First attempt: Convert HTML to PDF using OpenHTMLToPDF
            try (ByteArrayOutputStream os = new ByteArrayOutputStream()) {
                PdfRendererBuilder builder = new PdfRendererBuilder();
                builder.useFastMode();
                builder.withHtmlContent(html, null);
                builder.toStream(os);
                builder.run();
                byte[] pdf = os.toByteArray();

                if (pdf != null && pdf.length > 0) {
                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(org.springframework.http.MediaType.APPLICATION_PDF);
                    // ensure Content-Length is provided for clients
                    headers.setContentLength(pdf.length);
                    headers.add("Content-Disposition", "attachment; filename=\"receipt-" + id + ".pdf\"");
                    log.info("OpenHTMLToPDF generated {} bytes for order {}", pdf.length, id);
                    return ResponseEntity.ok().headers(headers).body(pdf);
                }
                // else fall through to PDFBox fallback
                log.warn("OpenHTMLToPDF produced empty PDF for order {}. Falling back to text-based PDF.", id);
            } catch (Exception ex) {
                log.warn("OpenHTMLToPDF conversion failed for order {}, falling back to PDFBox: {}", id, ex.toString());
            }

            // Fallback: create a simple text PDF using PDFBox
            try (PDDocument doc = new PDDocument()) {
                PDPage page = new PDPage(PDRectangle.LETTER);
                doc.addPage(page);
                try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                    cs.beginText();
                    cs.setFont(PDType1Font.HELVETICA_BOLD, 14);
                    cs.newLineAtOffset(50, 720);
                    String tenantName = "Dizminu Restaurant";
                    Long tenantId = order.getTenantId();
                    if (tenantId != null) {
                        Tenant t = tenantRepository.findById(tenantId).orElse(null);
                        if (t != null && t.getName() != null && !t.getName().isBlank()) tenantName = t.getName();
                    }
                    cs.showText("Receipt - " + tenantName);
                    cs.newLineAtOffset(0, -20);
                    cs.setFont(PDType1Font.HELVETICA, 12);
                    cs.showText("Order ID: " + order.getId());
                    cs.newLineAtOffset(0, -16);
                    cs.showText("Customer: " + (order.getCustomerName() == null ? "" : order.getCustomerName()));
                    cs.newLineAtOffset(0, -16);
                    cs.showText("Address: " + (order.getDeliveryAddress() == null ? "" : order.getDeliveryAddress()));
                    cs.newLineAtOffset(0, -20);

                    // Items
                    cs.setFont(PDType1Font.HELVETICA_BOLD, 12);
                    cs.showText("Items:");
                    cs.newLineAtOffset(0, -16);
                    cs.setFont(PDType1Font.HELVETICA, 11);
                    if (order.getItems() != null) {
                        for (OrderItem it : order.getItems()) {
                            String line = String.format("%s x%d  ₹%s", it.getItemName(), it.getQuantity(), it.getLineTotal());
                            cs.showText(line);
                            cs.newLineAtOffset(0, -14);
                        }
                    }
                    cs.newLineAtOffset(0, -8);
                    cs.setFont(PDType1Font.HELVETICA_BOLD, 12);
                    cs.showText("Total: ₹" + (order.getTotalAmount() == null ? "0.00" : order.getTotalAmount().toString()));
                    cs.endText();
                }
                try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                    doc.save(baos);
                    byte[] pdfBytes = baos.toByteArray();
                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(org.springframework.http.MediaType.APPLICATION_PDF);
                    headers.setContentLength(pdfBytes.length);
                    headers.add("Content-Disposition", "attachment; filename=\"receipt-" + id + ".pdf\"");
                    log.info("PDFBox fallback generated {} bytes for order {}", pdfBytes.length, id);
                    return ResponseEntity.ok().headers(headers).body(pdfBytes);
                }
            }

        } catch (Exception ex) {
            log.error("Failed to generate PDF receipt for order {}", id, ex);
            return ResponseEntity.status(500).body(null);
        }
    }

    @GetMapping(value = "/testpdf", produces = "application/pdf")
    public ResponseEntity<byte[]> getTestPdf() {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.LETTER);
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(PDType1Font.HELVETICA_BOLD, 20);
                cs.newLineAtOffset(50, 700);
                cs.showText("Dizminu - Test PDF");
                cs.newLineAtOffset(0, -30);
                cs.setFont(PDType1Font.HELVETICA, 12);
                cs.showText("This is a diagnostic PDF generated by the server.");
                cs.endText();
            }
            try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                doc.save(baos);
                byte[] pdfBytes = baos.toByteArray();
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(org.springframework.http.MediaType.APPLICATION_PDF);
                headers.setContentLength(pdfBytes.length);
                headers.add("Content-Disposition", "attachment; filename=\"test.pdf\"");
                log.info("Generated diagnostic test PDF of {} bytes", pdfBytes.length);
                return ResponseEntity.ok().headers(headers).body(pdfBytes);
            }
        } catch (Exception e) {
            log.error("Failed to generate diagnostic PDF", e);
            return ResponseEntity.status(500).body(null);
        }
    }

    // minimal HTML-escaping helper
    private static String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;");
    }

    // Helper: parse a path-variable id (which may come as a string). Return null if not a valid numeric id.
    private Long parseId(String idStr) {
        if (idStr == null) return null;
        try {
            return Long.valueOf(idStr);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<Map<String,Object>> getOrderStatus(@PathVariable String id) {
        Long numericId = parseId(id);
        if (numericId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid order id"));
        }
        try {
            Order order = orderService.getOrder(numericId);
            if (order == null) return ResponseEntity.notFound().build();
            Map<String,Object> resp = new HashMap<>();
            resp.put("id", order.getId());
            resp.put("status", order.getStatus() != null ? order.getStatus().name() : null);
            resp.put("createdAt", order.getCreatedAt() != null ? order.getCreatedAt().toString() : null);
            resp.put("totalAmount", order.getTotalAmount());
            return ResponseEntity.ok(resp);
        } catch (Exception ex) {
            log.error("Failed to fetch order status for {}", id, ex);
            return ResponseEntity.status(500).body(Map.of("error", "Unable to fetch order status"));
        }
    }

    // SSE endpoint for clients to subscribe to status updates for an order
    @GetMapping(value = "/{id}/events", produces = "text/event-stream")
    public SseEmitter subscribeToOrderEvents(@PathVariable String id) {
        Long numericId = parseId(id);
        if (numericId == null) {
            // return an emitter but close immediately with error to avoid client hanging
            SseEmitter closed = new SseEmitter(0L);
            try { closed.send(SseEmitter.event().name("error").data(Map.of("error", "Invalid order id"))); } catch (Exception e) {}
            try { closed.complete(); } catch (Exception e) {}
            return closed;
        }
        SseEmitter emitter = orderEventService.createEmitter(numericId);
        // Send initial status snapshot
        try {
            var order = orderService.getOrder(numericId);
            if (order != null) {
                Map<String,Object> payload = new HashMap<>();
                payload.put("id", order.getId());
                payload.put("status", order.getStatus() != null ? order.getStatus().name() : null);
                payload.put("createdAt", order.getCreatedAt() != null ? order.getCreatedAt().toString() : null);
                payload.put("totalAmount", order.getTotalAmount());
                emitter.send(SseEmitter.event().name("status").data(payload));
            }
        } catch (Exception e) {
            // ignore initial send failure; emitter remains subscribed
        }
        return emitter;
    }

    // Admin/restaurant can update order status via this endpoint. It emits SSE updates to subscribers.
    @PostMapping("/{id}/status")
    public ResponseEntity<?> updateOrderStatus(@PathVariable String id, @RequestBody Map<String,String> body, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String status = body.get("status");
        if (status == null || status.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "status is required"));
        Long numericId = parseId(id);
        if (numericId == null) return ResponseEntity.badRequest().body(Map.of("error", "Invalid order id"));
        try {
            // Authorization: allow if tenant token matches order.tenantId or admin token is valid
            Long authTenantId = tenantAuthService.validateTokenHeader(authHeader);
            boolean isAdmin = adminAuthService.validateTokenHeader(authHeader);
            if (authTenantId == null && !isAdmin) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
            }
            // If tenant token present, ensure it matches order's tenantId
            Order existing = orderService.getOrder(numericId);
            if (existing == null) return ResponseEntity.notFound().build();
            if (authTenantId != null) {
                // tenant token present: order must belong to that tenant (and not be null)
                if (existing.getTenantId() == null || !authTenantId.equals(existing.getTenantId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden: tenant mismatch"));
                }
            }

            Order updated = orderService.updateStatus(numericId, status);
            Map<String,Object> payload = new HashMap<>();
            payload.put("id", updated.getId());
            payload.put("status", updated.getStatus() != null ? updated.getStatus().name() : null);
            payload.put("createdAt", updated.getCreatedAt() != null ? updated.getCreatedAt().toString() : null);
            payload.put("totalAmount", updated.getTotalAmount());
            // emit using numericId (Long) to match OrderEventService signature
            orderEventService.emitStatus(numericId, payload);
            return ResponseEntity.ok(payload);
        } catch (IllegalArgumentException iae) {
            return ResponseEntity.badRequest().body(Map.of("error", iae.getMessage()));
        } catch (Exception ex) {
            log.error("Failed to update status for order {}", id, ex);
            return ResponseEntity.status(500).body(Map.of("error", "Unable to update status"));
        }
    }

    @GetMapping("/latest")
    public ResponseEntity<List<Map<String,Object>>> getLatestOrders(@RequestParam(value = "tenantId", required = false) Long tenantId,
                                                                     @RequestParam(value = "limit", required = false, defaultValue = "3") int limit) {
        try {
            List<Order> latest = orderService.getLatestOrders(tenantId, limit);
            List<Map<String,Object>> out = new java.util.ArrayList<>();
            for (Order o : latest) {
                Map<String,Object> m = new HashMap<>();
                m.put("id", o.getId());
                m.put("customerName", o.getCustomerName());
                m.put("status", o.getStatus() != null ? o.getStatus().name() : null);
                m.put("totalAmount", o.getTotalAmount());
                m.put("deliveryAddress", o.getDeliveryAddress());
                m.put("createdAt", o.getCreatedAt() != null ? o.getCreatedAt().toString() : null);
                m.put("tenantId", o.getTenantId());
                out.add(m);
            }
            return ResponseEntity.ok(out);
        } catch (Exception ex) {
            log.error("Failed to fetch latest orders", ex);
            return ResponseEntity.status(500).body(List.of());
        }
    }

    @GetMapping("/recent")
    public ResponseEntity<List<Map<String,Object>>> getRecentOrders(@RequestParam(value = "tenantId", required = false) Long tenantId,
                                                                     @RequestHeader(value = "Authorization", required = false) String authHeader,
                                                                     @RequestParam(value = "limit", required = false, defaultValue = "50") int limit) {
        try {
            // Try to infer tenantId from auth header if not provided
            if (tenantId == null && authHeader != null && !authHeader.isBlank()) {
                try {
                    Long authTenantId = tenantAuthService.validateTokenHeader(authHeader);
                    if (authTenantId != null) tenantId = authTenantId;
                } catch (Exception e) {
                    // ignore
                }
            }
            List<Order> recent = orderService.getRecentOrders(tenantId, limit);
            List<Map<String,Object>> out = new java.util.ArrayList<>();
            for (Order o : recent) {
                Map<String,Object> m = new HashMap<>();
                m.put("id", o.getId());
                m.put("customerName", o.getCustomerName());
                m.put("status", o.getStatus() != null ? o.getStatus().name() : null);
                m.put("totalAmount", o.getTotalAmount());
                m.put("deliveryAddress", o.getDeliveryAddress());
                m.put("createdAt", o.getCreatedAt() != null ? o.getCreatedAt().toString() : null);
                m.put("tenantId", o.getTenantId());
                out.add(m);
            }
            return ResponseEntity.ok(out);
        } catch (Exception ex) {
            log.error("Failed to fetch recent orders", ex);
            return ResponseEntity.status(500).body(List.of());
        }
    }

    @GetMapping("/today")
    public ResponseEntity<List<Map<String,Object>>> getTodaysOrders(@RequestParam(value = "tenantId", required = false) Long tenantId,
                                                                     @RequestHeader(value = "Authorization", required = false) String authHeader,
                                                                     @RequestParam(value = "limit", required = false, defaultValue = "100") int limit) {
        try {
            // Try to infer tenantId from auth header if not provided
            if (tenantId == null && authHeader != null && !authHeader.isBlank()) {
                try {
                    Long authTenantId = tenantAuthService.validateTokenHeader(authHeader);
                    if (authTenantId != null) tenantId = authTenantId;
                } catch (Exception e) {
                    // ignore
                }
            }
            LocalDateTime start = LocalDate.now().atStartOfDay();
            LocalDateTime end = LocalDate.now().atTime(23,59,59,999000000);
            List<Order> today = orderService.getOrdersForDateRange(tenantId, start, end, limit);
            List<Map<String,Object>> out = new java.util.ArrayList<>();
            for (Order o : today) {
                Map<String,Object> m = new HashMap<>();
                m.put("id", o.getId());
                m.put("customerName", o.getCustomerName());
                m.put("status", o.getStatus() != null ? o.getStatus().name() : null);
                m.put("totalAmount", o.getTotalAmount());
                m.put("deliveryAddress", o.getDeliveryAddress());
                m.put("createdAt", o.getCreatedAt() != null ? o.getCreatedAt().toString() : null);
                m.put("tenantId", o.getTenantId());
                out.add(m);
            }
            return ResponseEntity.ok(out);
        } catch (Exception ex) {
            log.error("Failed to fetch today's orders", ex);
            return ResponseEntity.status(500).body(List.of());
        }
    }

    @GetMapping("/history")
    public ResponseEntity<Map<String,Object>> getOrdersHistory(
            @RequestParam(value = "tenantId", required = false) Long tenantId,
            @RequestParam(value = "from", required = false) String fromStr,
            @RequestParam(value = "to", required = false) String toStr,
            @RequestParam(value = "page", required = false, defaultValue = "0") int page,
            @RequestParam(value = "size", required = false, defaultValue = "20") int size,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        try {
            // If tenantId not provided, and auth header present, try to infer tenant id
            if (tenantId == null && authHeader != null && !authHeader.isBlank()) {
                try {
                    Long authTenantId = tenantAuthService.validateTokenHeader(authHeader);
                    if (authTenantId != null) tenantId = authTenantId;
                } catch (Exception e) {
                    // ignore - fallback to no tenant scoping
                }
            }

            LocalDateTime from = null;
            LocalDateTime to = null;
            if (fromStr != null && !fromStr.isBlank()) {
                try {
                    // accept date-only (yyyy-MM-dd) or ISO_LOCAL_DATE_TIME
                    if (fromStr.length() == 10) {
                        LocalDate d = LocalDate.parse(fromStr);
                        from = d.atStartOfDay();
                    } else {
                        from = LocalDateTime.parse(fromStr);
                    }
                } catch (DateTimeParseException ex) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Invalid 'from' date format. Use yyyy-MM-dd or ISO date-time."));
                }
            }
            if (toStr != null && !toStr.isBlank()) {
                try {
                    if (toStr.length() == 10) {
                        LocalDate d = LocalDate.parse(toStr);
                        to = d.atTime(23,59,59,999000000);
                    } else {
                        to = LocalDateTime.parse(toStr);
                    }
                } catch (DateTimeParseException ex) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Invalid 'to' date format. Use yyyy-MM-dd or ISO date-time."));
                }
            }

            Page<Order> pageRes = orderService.getOrdersByDateRangePaged(tenantId, from, to, page, size);
            List<Map<String,Object>> out = new java.util.ArrayList<>();
            for (Order o : pageRes.getContent()) {
                Map<String,Object> m = new HashMap<>();
                m.put("id", o.getId());
                m.put("customerName", o.getCustomerName());
                m.put("status", o.getStatus() != null ? o.getStatus().name() : null);
                m.put("totalAmount", o.getTotalAmount());
                m.put("deliveryAddress", o.getDeliveryAddress());
                m.put("createdAt", o.getCreatedAt() != null ? o.getCreatedAt().toString() : null);
                m.put("tenantId", o.getTenantId());
                out.add(m);
            }
            Map<String,Object> resp = new HashMap<>();
            resp.put("content", out);
            resp.put("page", pageRes.getNumber());
            resp.put("size", pageRes.getSize());
            resp.put("totalPages", pageRes.getTotalPages());
            resp.put("totalElements", pageRes.getTotalElements());
            return ResponseEntity.ok(resp);
        } catch (Exception ex) {
            log.error("Failed to fetch paged order history", ex);
            return ResponseEntity.status(500).body(Map.of("error", "Unable to fetch order history"));
        }
    }

    @GetMapping("/search")
    public ResponseEntity<List<Map<String,Object>>> searchOrdersByName(@RequestParam("name") String name) {
        try {
            List<Order> found = orderService.searchOrdersByCustomerName(name);
            List<Map<String,Object>> out = new java.util.ArrayList<>();
            for (Order o : found) {
                Map<String,Object> m = new HashMap<>();
                m.put("id", o.getId());
                m.put("customerName", o.getCustomerName());
                m.put("tenantId", o.getTenantId());
                m.put("createdAt", o.getCreatedAt() != null ? o.getCreatedAt().toString() : null);
                m.put("status", o.getStatus() != null ? o.getStatus().name() : null);
                out.add(m);
            }
            return ResponseEntity.ok(out);
        } catch (Exception ex) {
            log.error("Search orders failed", ex);
            return ResponseEntity.status(500).body(List.of());
        }
    }

    @PostMapping("/{id}/assign-tenant")
    public ResponseEntity<?> assignTenantToOrder(@PathVariable Long id, @RequestBody Map<String, Object> body, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            // Only admin tokens can assign tenant mapping
            boolean isAdmin = adminAuthService.validateTokenHeader(authHeader);
            if (!isAdmin) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
            Long tenantId = null;
            if (body.containsKey("tenantId") && body.get("tenantId") != null) {
                Object t = body.get("tenantId");
                if (t instanceof Number) tenantId = ((Number) t).longValue();
                else if (t instanceof String && !((String) t).isBlank()) tenantId = Long.valueOf((String) t);
            }
            Order updated = orderService.updateTenant(id, tenantId);
            return ResponseEntity.ok(Map.of("id", updated.getId(), "tenantId", updated.getTenantId()));
        } catch (NumberFormatException nfe) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid tenantId"));
        } catch (Exception ex) {
            log.error("Failed to assign tenant to order {}", id, ex);
            return ResponseEntity.status(500).body(Map.of("error", "Unable to assign tenant to order"));
        }
    }
}
