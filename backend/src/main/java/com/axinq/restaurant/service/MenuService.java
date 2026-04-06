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

    public List<MenuItem> getAvailable() {
        return menuItemRepository.findByAvailableTrue();
    }

    public MenuItem create(MenuItemRequest request) {
        MenuItem item = MenuItem.builder()
                .name(request.name())
                .description(request.description())
                .price(request.price())
                .category(request.category())
                .imageUrl(request.imageUrl())
                .available(request.available())
                .build();
        return menuItemRepository.save(item);
    }

    public MenuItem update(Long id, MenuItemRequest request) {
        MenuItem item = menuItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu item not found: " + id));

        item.setName(request.name());
        item.setDescription(request.description());
        item.setPrice(request.price());
        item.setCategory(request.category());
        item.setImageUrl(request.imageUrl());
        item.setAvailable(request.available());

        return menuItemRepository.save(item);
    }

    public MenuItem setAvailability(Long id, boolean available) {
        MenuItem item = menuItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu item not found: " + id));
        item.setAvailable(available);
        return menuItemRepository.save(item);
    }
}
