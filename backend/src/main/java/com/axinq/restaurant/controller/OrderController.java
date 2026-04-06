package com.axinq.restaurant.controller;

import com.axinq.restaurant.dto.CreateOrderRequest;
import com.axinq.restaurant.dto.OrderResponse;
import com.axinq.restaurant.model.Order;
import com.axinq.restaurant.service.OrderService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(@Valid @RequestBody CreateOrderRequest request,
                                                UriComponentsBuilder uriBuilder) {
        Order saved = orderService.createOrder(request);
        if (saved == null || saved.getId() == null) {
            return ResponseEntity.internalServerError().build();
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
