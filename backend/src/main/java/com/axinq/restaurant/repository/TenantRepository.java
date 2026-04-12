package com.axinq.restaurant.repository;

import com.axinq.restaurant.model.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, Long> {
    // find a single tenant by admin email (exact match)
    Tenant findByAdminEmail(String email);

    // return all tenants (case-insensitive) for a given admin email so service can disambiguate
    List<Tenant> findByAdminEmailIgnoreCase(String email);
}
