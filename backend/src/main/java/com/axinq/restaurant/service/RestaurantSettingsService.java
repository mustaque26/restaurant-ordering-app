package com.axinq.restaurant.service;

import com.axinq.restaurant.model.RestaurantSettings;
import com.axinq.restaurant.repository.RestaurantSettingsRepository;
import org.springframework.stereotype.Service;

@Service
public class RestaurantSettingsService {

    private final RestaurantSettingsRepository repository;

    public RestaurantSettingsService(RestaurantSettingsRepository repository) {
        this.repository = repository;
    }

    public RestaurantSettings getSettings() {
        return repository.findById(1L)
                .orElseGet(() -> repository.save(RestaurantSettings.builder()
                        .id(1L)
                        .restaurantName("Franzzo")
                        .paymentQrImageUrl("https://dummyimage.com/300x300/000/fff&text=Scan+to+Pay")
                        .contactNumber("+91-9999999999")
                        .build()));
    }

    public RestaurantSettings updatePaymentQr(String qrUrl) {
        RestaurantSettings settings = getSettings();
        settings.setPaymentQrImageUrl(qrUrl);
        return repository.save(settings);
    }
}
