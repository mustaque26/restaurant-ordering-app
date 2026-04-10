package com.axinq.restaurant.service;

import com.axinq.restaurant.model.RestaurantSettings;
import com.axinq.restaurant.model.Tenant;
import com.axinq.restaurant.repository.RestaurantSettingsRepository;
import com.axinq.restaurant.repository.TenantRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class RestaurantSettingsService {

    private final RestaurantSettingsRepository repository;
    private final TenantRepository tenantRepository;

    public RestaurantSettingsService(RestaurantSettingsRepository repository, TenantRepository tenantRepository) {
        this.repository = repository;
        this.tenantRepository = tenantRepository;
    }

    /**
     * Return restaurant settings. If tenantId is provided and a tenant exists, use tenant-specific
     * values (e.g. restaurant name) saved during subscription. Otherwise fall back to global
     * settings; if none are present create defaults.
     */
    public RestaurantSettings getSettings(Long tenantId) {
        // load global settings (if present) to reuse QR and contact number
        Optional<RestaurantSettings> global = repository.findById(1L);
        String defaultQr = global.map(RestaurantSettings::getPaymentQrImageUrl)
                .orElse("https://dummyimage.com/300x300/000/fff&text=Scan+to+Pay");
        String defaultContact = global.map(RestaurantSettings::getContactNumber)
                .orElse("+91-9999999999");

        if (tenantId != null) {
            Optional<Tenant> maybeTenant = tenantRepository.findById(tenantId);
            if (maybeTenant.isPresent()) {
                Tenant t = maybeTenant.get();
                String name = (t.getName() != null && !t.getName().isBlank()) ? t.getName() : "Dizminu Restaurant Suite";
                String qr = (t.getLogoUrl() != null && !t.getLogoUrl().isBlank()) ? t.getLogoUrl() : defaultQr;
                return RestaurantSettings.builder()
                        .id(1L)
                        .restaurantName(name)
                        .paymentQrImageUrl(qr)
                        .contactNumber(defaultContact)
                        .build();
            }
        }

        // no tenant context or tenant not found - return global settings or create default with Dizminu name
        if (global.isPresent()) return global.get();

        // create and persist default
        RestaurantSettings def = RestaurantSettings.builder()
                .id(1L)
                .restaurantName("Dizminu Restaurant Suite")
                .paymentQrImageUrl(defaultQr)
                .contactNumber(defaultContact)
                .build();
        return repository.save(def);
    }

    public RestaurantSettings updatePaymentQr(String qrUrl) {
        RestaurantSettings settings = getSettings(null);
        settings.setPaymentQrImageUrl(qrUrl);
        return repository.save(settings);
    }
}
