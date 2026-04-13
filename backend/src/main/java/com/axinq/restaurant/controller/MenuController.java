package com.axinq.restaurant.controller;

import com.axinq.restaurant.dto.MenuItemRequest;
import com.axinq.restaurant.model.MenuItem;
import com.axinq.restaurant.service.MenuService;
import com.axinq.restaurant.service.TenantAuthService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/menu-items")
public class MenuController {

    private final MenuService menuService;
    private final TenantAuthService tenantAuthService;

    public MenuController(MenuService menuService, TenantAuthService tenantAuthService) {
        this.menuService = menuService;
        this.tenantAuthService = tenantAuthService;
    }

    @GetMapping
    public List<MenuItem> getAll() {
        return menuService.getAll();
    }

    @GetMapping("/available")
    public List<MenuItem> getAvailable(@RequestHeader(value = "Authorization", required = false) String auth,
                                       @RequestParam(value = "tenantId", required = false) Long tenantId) {
        Long effectiveTenantId = tenantId;
        if (effectiveTenantId == null) {
            effectiveTenantId = tenantAuthService.validateTokenHeader(auth);
        }
        return menuService.getAvailable(effectiveTenantId);
    }

    @PostMapping
    public MenuItem create(@RequestHeader(value = "Authorization", required = false) String auth,
                           @Valid @RequestBody MenuItemRequest request) {
        Long tenantId = tenantAuthService.validateTokenHeader(auth);
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        // associate menu item to the requesting tenant
        return menuService.create(request, tenantId);
    }

    @PutMapping("/{id}")
    public MenuItem update(@RequestHeader(value = "Authorization", required = false) String auth,
                           @PathVariable Long id, @Valid @RequestBody MenuItemRequest request) {
        Long tenantId = tenantAuthService.validateTokenHeader(auth);
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return menuService.update(id, request, tenantId);
    }

    @PatchMapping("/{id}/availability")
    public MenuItem setAvailability(@RequestHeader(value = "Authorization", required = false) String auth,
                                    @PathVariable Long id, @RequestParam boolean available) {
        Long tenantId = tenantAuthService.validateTokenHeader(auth);
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return menuService.setAvailability(id, available, tenantId);
    }
}
