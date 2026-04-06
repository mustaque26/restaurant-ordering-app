package com.axinq.restaurant.repository;

import com.axinq.restaurant.model.RestaurantSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RestaurantSettingsRepository extends JpaRepository<RestaurantSettings, Long> {
}
