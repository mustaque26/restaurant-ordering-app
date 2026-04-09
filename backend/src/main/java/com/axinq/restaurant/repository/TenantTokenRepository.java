package com.axinq.restaurant.repository;

import com.axinq.restaurant.model.TenantToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TenantTokenRepository extends JpaRepository<TenantToken, Long> {
    TenantToken findByToken(String token);
}

