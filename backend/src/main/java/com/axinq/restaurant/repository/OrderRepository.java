package com.axinq.restaurant.repository;

import com.axinq.restaurant.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, Long> {
}
