package com.axinq.restaurant.controller;

import com.axinq.restaurant.dto.CreateOrderRequest;
import com.axinq.restaurant.dto.OrderResponse;
import com.axinq.restaurant.model.Order;
import com.axinq.restaurant.service.EmailService;
import com.axinq.restaurant.service.OrderService;
import com.axinq.restaurant.service.WhatsappQueueService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;
    private final EmailService emailService;
    private final WhatsappQueueService whatsappQueue;

    @Autowired
    public OrderController(OrderService orderService, EmailService emailService, WhatsappQueueService whatsappQueue) {
        this.orderService = orderService;
        this.emailService = emailService;
        this.whatsappQueue = whatsappQueue;
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
        String body = "Thank you for your order, " + saved.getCustomerName() + "!\n" +
                "Your order ID is: " + saved.getId() + "\n" +
                (itemsList.length() > 0 ? ("\nItems Ordered:\n" + itemsList) : "") +
                "Total: ₹" + total + "\n";

        // Send via selected channels (best-effort)
        if (request.sendEmail()) {
            try {
                emailService.sendOrderConfirmation(request.email(), "Order Confirmation - Franzzo Restaurant", body);
            } catch (Exception ex) {
                // log and continue
            }
        }

        if (request.sendWhatsapp()) {
            try {
                // Enqueue; also request admin copy when both channels are selected
                boolean adminCopy = request.sendEmail();
                whatsappQueue.enqueue(request.phoneNumber(), body, adminCopy);
            } catch (Exception ex) {
                // log and continue
            }
        }

        var location = uriBuilder.path("/api/orders/{id}").buildAndExpand(saved.getId()).toUri();
        return ResponseEntity.created(location).body(new OrderResponse(saved.getId()));
    }

    @GetMapping
    public List<Order> getAll() {
        return orderService.getOrders();
    }

    @GetMapping("/{id}")
    public Order getById(@PathVariable Long id) {
        return orderService.getOrder(id);
    }
}
