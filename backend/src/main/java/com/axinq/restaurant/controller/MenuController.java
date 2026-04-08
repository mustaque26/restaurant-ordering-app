package com.axinq.restaurant.controller;

import com.axinq.restaurant.dto.MenuItemRequest;
import com.axinq.restaurant.model.MenuItem;
import com.axinq.restaurant.service.MenuService;
import com.axinq.restaurant.service.AdminAuthService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/menu-items")
public class MenuController {

    private final MenuService menuService;
    private final AdminAuthService adminAuthService;

    public MenuController(MenuService menuService, AdminAuthService adminAuthService) {
        this.menuService = menuService;
        this.adminAuthService = adminAuthService;
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
    public MenuItem create(@RequestHeader(value = "Authorization", required = false) String auth,
                           @Valid @RequestBody MenuItemRequest request) {
        if (!adminAuthService.validateTokenHeader(auth)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return menuService.create(request);
    }

    @PutMapping("/{id}")
    public MenuItem update(@RequestHeader(value = "Authorization", required = false) String auth,
                           @PathVariable Long id, @Valid @RequestBody MenuItemRequest request) {
        if (!adminAuthService.validateTokenHeader(auth)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return menuService.update(id, request);
    }

    @PatchMapping("/{id}/availability")
    public MenuItem setAvailability(@RequestHeader(value = "Authorization", required = false) String auth,
                                    @PathVariable Long id, @RequestParam boolean available) {
        if (!adminAuthService.validateTokenHeader(auth)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return menuService.setAvailability(id, available);
    }
}
