package com.axinq.restaurant.service;

import com.axinq.restaurant.dto.MenuItemRequest;
import com.axinq.restaurant.model.MenuItem;
import com.axinq.restaurant.repository.MenuItemRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class MenuService {

    private final MenuItemRepository menuItemRepository;

    public MenuService(MenuItemRepository menuItemRepository) {
        this.menuItemRepository = menuItemRepository;
    }

    public List<MenuItem> getAll() {
        return menuItemRepository.findAll();
    }

    // tenant-aware available items: includes global items (tenantId null) and tenant-specific ones
    public List<MenuItem> getAvailable(Long tenantId) {
        return menuItemRepository.findAvailableForTenant(tenantId);
    }

    public List<MenuItem> getAvailable() {
        return getAvailable(null);
    }

    public MenuItem create(MenuItemRequest request, Long tenantId) {
        MenuItem item = MenuItem.builder()
                .name(request.name())
                .description(request.description())
                .price(request.price())
                .category(request.category())
                .imageUrl(request.imageUrl())
                .available(request.available())
                .tenantId(tenantId != null ? tenantId : request.tenantId())
                .build();
        return menuItemRepository.save(item);
    }

    public MenuItem create(MenuItemRequest request) {
        return create(request, request.tenantId());
    }

    public MenuItem update(Long id, MenuItemRequest request, Long tenantId) {
        MenuItem item = menuItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu item not found: " + id));

        // If the item belongs to a tenant, ensure the updater is the same tenant
        if (item.getTenantId() != null && tenantId != null && !item.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Unauthorized to update menu item: tenant mismatch");
        }

        item.setName(request.name());
        item.setDescription(request.description());
        item.setPrice(request.price());
        item.setCategory(request.category());
        item.setImageUrl(request.imageUrl());
        item.setAvailable(request.available());
        // allow changing tenantId only if item was previously global and tenantId is provided
        if (item.getTenantId() == null && tenantId != null) {
            item.setTenantId(tenantId);
        }

        return menuItemRepository.save(item);
    }

    public MenuItem update(Long id, MenuItemRequest request) {
        return update(id, request, request.tenantId());
    }

    public MenuItem setAvailability(Long id, boolean available, Long tenantId) {
        MenuItem item = menuItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu item not found: " + id));
        if (item.getTenantId() != null && tenantId != null && !item.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Unauthorized to change availability: tenant mismatch");
        }
        item.setAvailable(available);
        return menuItemRepository.save(item);
    }

    public MenuItem setAvailability(Long id, boolean available) {
        return setAvailability(id, available, null);
    }
}
