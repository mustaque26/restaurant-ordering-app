package com.axinq.restaurant.repository;

import com.axinq.restaurant.model.MenuItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {
    List<MenuItem> findByAvailableTrue();

    // tenant-specific: available items that are either global (tenantId is null) or belong to the given tenant
    @Query("SELECT m FROM MenuItem m WHERE m.available = true AND (m.tenantId = :tenantId OR m.tenantId IS NULL)")
    List<MenuItem> findAvailableForTenantQuery(@Param("tenantId") Long tenantId);

    // helper for fetching items that belong to a specific tenant (including global ones)
    default List<MenuItem> findAvailableForTenant(Long tenantId) {
        if (tenantId == null) return findByAvailableTrue();
        return findAvailableForTenantQuery(tenantId);
    }
}
