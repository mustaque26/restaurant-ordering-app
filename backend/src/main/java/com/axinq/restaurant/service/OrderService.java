package com.axinq.restaurant.service;

import com.axinq.restaurant.dto.CreateOrderRequest;
import com.axinq.restaurant.dto.OrderItemRequest;
import com.axinq.restaurant.model.MenuItem;
import com.axinq.restaurant.model.Order;
import com.axinq.restaurant.model.OrderItem;
import com.axinq.restaurant.model.OrderStatus;
import com.axinq.restaurant.repository.MenuItemRepository;
import com.axinq.restaurant.repository.OrderRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final MenuItemRepository menuItemRepository;

    public OrderService(OrderRepository orderRepository, MenuItemRepository menuItemRepository) {
        this.orderRepository = orderRepository;
        this.menuItemRepository = menuItemRepository;
    }

    public Order createOrder(CreateOrderRequest request) {
        Order order = new Order();
        order.setCustomerName(request.customerName());
        order.setPhoneNumber(request.phoneNumber());
        order.setDeliveryAddress(request.deliveryAddress());
        order.setPaymentReference(request.paymentReference());
        order.setEmail(request.email());
        order.setStatus(request.paymentReference() == null || request.paymentReference().isBlank()
                ? OrderStatus.PAYMENT_PENDING
                : OrderStatus.PAYMENT_SUBMITTED);
        order.setCreatedAt(LocalDateTime.now());

        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        for (OrderItemRequest itemRequest : request.items()) {
            MenuItem menuItem = menuItemRepository.findById(itemRequest.menuItemId())
                    .orElseThrow(() -> new RuntimeException("Menu item not found: " + itemRequest.menuItemId()));

            if (!menuItem.isAvailable()) {
                throw new RuntimeException("Item is currently unavailable: " + menuItem.getName());
            }

            BigDecimal lineTotal = menuItem.getPrice().multiply(BigDecimal.valueOf(itemRequest.quantity()));

            OrderItem orderItem = OrderItem.builder()
                    .menuItemId(menuItem.getId())
                    .itemName(menuItem.getName())
                    .quantity(itemRequest.quantity())
                    .price(menuItem.getPrice())
                    .lineTotal(lineTotal)
                    .order(order)
                    .build();

            orderItems.add(orderItem);
            total = total.add(lineTotal);
        }

        order.setItems(orderItems);
        order.setTotalAmount(total);

        return orderRepository.save(order);
    }

    public List<Order> getOrders() {
        return orderRepository.findAll();
    }

    public Order getOrder(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));
    }
}
