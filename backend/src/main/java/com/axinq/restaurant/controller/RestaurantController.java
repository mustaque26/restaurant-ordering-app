package com.axinq.restaurant.controller;

import com.axinq.restaurant.model.Tenant;
import com.axinq.restaurant.repository.TenantRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/restaurants")
public class RestaurantController {

    private final TenantRepository tenantRepository;

    public RestaurantController(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    // Public list of onboarded restaurants
    @GetMapping
    public List<RestaurantDto> listRestaurants() {
        return tenantRepository.findByOnboardedTrue()
                .stream()
                .map(RestaurantDto::fromTenant)
                .collect(Collectors.toList());
    }

    // Details for a single restaurant (public)
    @GetMapping(path = "/{id}")
    public ResponseEntity<RestaurantDto> getRestaurant(@PathVariable Long id) {
        return tenantRepository.findById(id)
                .filter(Tenant::isOnboarded)
                .map(t -> ResponseEntity.ok(RestaurantDto.fromTenant(t)))
                .orElse(ResponseEntity.notFound().build());
    }

    public static class RestaurantDto {
        public Long id;
        public String name;
        public String slug;
        public String logoUrl;
        public String description;
        public String address;

        public static RestaurantDto fromTenant(Tenant t) {
            RestaurantDto d = new RestaurantDto();
            d.id = t.getId();
            d.name = t.getName();
            d.slug = t.getSlug();
            d.logoUrl = t.getLogoUrl();
            // reuse featuresJson or other field as description if present; keep null-safe
            d.description = t.getFeaturesJson();
            d.address = t.getAddress();
            return d;
        }
    }
}
