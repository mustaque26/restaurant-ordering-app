package com.axinq.restaurant.repository;

import com.axinq.restaurant.model.MenuItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {
    List<MenuItem> findByAvailableTrue();

    // tenant-specific: available items that are either global (tenantId is null) or belong to the given tenant
    List<MenuItem> findByAvailableTrueAndTenantIdOrTenantIdIsNull(Long tenantId);

    // helper for fetching items that belong to a specific tenant (including global ones)
    default List<MenuItem> findAvailableForTenant(Long tenantId) {
        if (tenantId == null) return findByAvailableTrue();
        return findByAvailableTrueAndTenantIdOrTenantIdIsNull(tenantId);
    }
}
