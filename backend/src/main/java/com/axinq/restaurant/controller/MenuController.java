package com.axinq.restaurant.controller;

import com.axinq.restaurant.dto.MenuItemRequest;
import com.axinq.restaurant.model.MenuItem;
import com.axinq.restaurant.service.MenuService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/menu-items")
public class MenuController {

    private final MenuService menuService;

    public MenuController(MenuService menuService) {
        this.menuService = menuService;
    }

    @GetMapping
    public List<MenuItem> getAll() {
        return menuService.getAll();
    }

    @GetMapping("/available")
    public List<MenuItem> getAvailable() {
        return menuService.getAvailable();
    }

    @PostMapping
    public MenuItem create(@Valid @RequestBody MenuItemRequest request) {
        return menuService.create(request);
    }

    @PutMapping("/{id}")
    public MenuItem update(@PathVariable Long id, @Valid @RequestBody MenuItemRequest request) {
        return menuService.update(id, request);
    }

    @PatchMapping("/{id}/availability")
    public MenuItem setAvailability(@PathVariable Long id, @RequestParam boolean available) {
        return menuService.setAvailability(id, available);
    }
}
