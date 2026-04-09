package com.axinq.restaurant.repository;

import com.axinq.restaurant.model.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, Long> {
    Tenant findByAdminEmail(String email);
}

