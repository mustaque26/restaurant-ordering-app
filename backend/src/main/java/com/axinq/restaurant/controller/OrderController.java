package com.axinq.restaurant.controller;

import com.axinq.restaurant.dto.CreateOrderRequest;
import com.axinq.restaurant.model.Order;
import com.axinq.restaurant.service.OrderService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public Order create(@Valid @RequestBody CreateOrderRequest request) {
        return orderService.createOrder(request);
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
