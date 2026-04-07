package com.axinq.restaurant.controller;

import com.axinq.restaurant.dto.CreateOrderRequest;
import com.axinq.restaurant.dto.OrderResponse;
import com.axinq.restaurant.model.Order;
import com.axinq.restaurant.service.EmailService;
import com.axinq.restaurant.service.OrderService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;
    private final EmailService emailService;

    @Autowired
    public OrderController(OrderService orderService, EmailService emailService) {
        this.orderService = orderService;
        this.emailService = emailService;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(@Valid @RequestBody CreateOrderRequest request,
                                                UriComponentsBuilder uriBuilder) {
        Order saved = orderService.createOrder(request);
        if (saved == null || saved.getId() == null) {
            return ResponseEntity.internalServerError().build();
        }
        // Send confirmation email
        String subject = "Order Confirmation - Franzzo Restaurant";
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
        emailService.sendOrderConfirmation(saved.getEmail(), subject, body);
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
