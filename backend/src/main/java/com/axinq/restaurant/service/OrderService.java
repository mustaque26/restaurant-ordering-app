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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

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

        // determine tenantId: prefer explicit request.tenantId(), otherwise infer from menu items
        Long tenantId = request.tenantId();
        boolean tenantConflict = false;

        for (OrderItemRequest itemRequest : request.items()) {
            MenuItem menuItem = menuItemRepository.findById(itemRequest.menuItemId())
                    .orElseThrow(() -> new RuntimeException("Menu item not found: " + itemRequest.menuItemId()));

            if (!menuItem.isAvailable()) {
                throw new RuntimeException("Item is currently unavailable: " + menuItem.getName());
            }

            // infer tenantId from menu item if request didn't provide one
            Long itemTenant = menuItem.getTenantId();
            if (tenantId == null && itemTenant != null) {
                tenantId = itemTenant;
            } else if (itemTenant != null && tenantId != null && !itemTenant.equals(tenantId)) {
                // Items belong to different tenants - this is unexpected; mark conflict and null-out tenantId
                tenantConflict = true;
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

        if (tenantConflict) {
            // For safety, don't attach a tenant when items belong to multiple tenants
            log.warn("Order items reference multiple tenants; leaving order.tenantId null");
            order.setTenantId(null);
        } else {
            order.setTenantId(tenantId);
        }

        order.setItems(orderItems);
        order.setTotalAmount(total);

        return orderRepository.save(order);
    }

    public List<Order> getOrders() {
        return orderRepository.findAll();
    }

    public List<Order> getLatestOrders(Long tenantId, int limit) {
        Pageable p = PageRequest.of(0, Math.max(1, limit), Sort.by(Sort.Direction.DESC, "createdAt"));
        if (tenantId != null) {
            return orderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, p).getContent();
        } else {
            return orderRepository.findAllByOrderByCreatedAtDesc(p).getContent();
        }
    }

    // Return recent orders that are not 'closed' (DELIVERED or CANCELLED). Used for admin active tracking.
    public List<Order> getRecentOrders(Long tenantId, int limit) {
        Pageable p = PageRequest.of(0, Math.max(1, limit), Sort.by(Sort.Direction.DESC, "createdAt"));
        List<OrderStatus> closed = List.of(OrderStatus.DELIVERED, OrderStatus.CANCELLED);
        if (tenantId != null) {
            return orderRepository.findByTenantIdAndStatusNotInOrderByCreatedAtDesc(tenantId, closed, p).getContent();
        } else {
            return orderRepository.findByStatusNotInOrderByCreatedAtDesc(closed, p).getContent();
        }
    }

    public Order getOrder(Long id) {
        Order o = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));
        // Initialize lazy collection to ensure JSON serialization includes items
        if (o.getItems() != null) o.getItems().size();
        return o;
    }

    @Transactional
    public Order updateStatus(Long id, String newStatus) {
        Order order = orderRepository.findById(id).orElseThrow(() -> new RuntimeException("Order not found: " + id));
        if (newStatus == null || newStatus.isBlank()) throw new IllegalArgumentException("Status is required");
        try {
            OrderStatus os = OrderStatus.valueOf(newStatus);
            order.setStatus(os);
            Order saved = orderRepository.save(order);
            return saved;
        } catch (IllegalArgumentException iae) {
            throw new IllegalArgumentException("Invalid order status: " + newStatus);
        }
    }

    @Transactional
    public Order updateTenant(Long id, Long tenantId) {
        Order order = orderRepository.findById(id).orElseThrow(() -> new RuntimeException("Order not found: " + id));
        // allow null to clear tenant if needed
        order.setTenantId(tenantId);
        return orderRepository.save(order);
    }

    public Page<Order> getOrdersPaged(int page, int size) {
        Pageable p = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(Sort.Direction.DESC, "createdAt"));
        return orderRepository.findAll(p);
    }

    public Page<Order> getOrdersByDateRangePaged(Long tenantId, LocalDateTime from, LocalDateTime to, int page, int size) {
        Pageable p = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(Sort.Direction.DESC, "createdAt"));
        if (from == null || to == null) {
            return getOrdersPaged(page, size);
        }
        if (tenantId != null) {
            return orderRepository.findByTenantIdAndCreatedAtBetweenOrderByCreatedAtDesc(tenantId, from, to, p);
        } else {
            return orderRepository.findAllByCreatedAtBetweenOrderByCreatedAtDesc(from, to, p);
        }
    }

    // Return up to 'limit' orders in the given date-range (desc by createdAt)
    public List<Order> getOrdersForDateRange(Long tenantId, LocalDateTime from, LocalDateTime to, int limit) {
        Pageable p = PageRequest.of(0, Math.max(1, limit), Sort.by(Sort.Direction.DESC, "createdAt"));
        if (from == null || to == null) {
            // fallback to latest
            return getLatestOrders(tenantId, limit);
        }
        if (tenantId != null) {
            return orderRepository.findByTenantIdAndCreatedAtBetweenOrderByCreatedAtDesc(tenantId, from, to, p).getContent();
        } else {
            return orderRepository.findAllByCreatedAtBetweenOrderByCreatedAtDesc(from, to, p).getContent();
        }
    }

    // Debug helper: search orders by customer name (case-insensitive contains)
    public List<Order> searchOrdersByCustomerName(String name) {
        if (name == null || name.isBlank()) return List.of();
        return orderRepository.findByCustomerNameIgnoreCaseContaining(name.trim());
    }
}
