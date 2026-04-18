package com.axinq.restaurant.repository;

import com.axinq.restaurant.model.Order;
import com.axinq.restaurant.model.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    Page<Order> findByTenantIdOrderByCreatedAtDesc(Long tenantId, Pageable pageable);
    Page<Order> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<Order> findByTenantIdAndCreatedAtBetweenOrderByCreatedAtDesc(Long tenantId, LocalDateTime from, LocalDateTime to, Pageable pageable);
    Page<Order> findAllByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime from, LocalDateTime to, Pageable pageable);

    // recent (not closed) queries
    Page<Order> findByTenantIdAndStatusNotInOrderByCreatedAtDesc(Long tenantId, List<OrderStatus> statuses, Pageable pageable);
    Page<Order> findByStatusNotInOrderByCreatedAtDesc(List<OrderStatus> statuses, Pageable pageable);

    // debug / utility
    List<Order> findByCustomerNameIgnoreCaseContaining(String name);
}
