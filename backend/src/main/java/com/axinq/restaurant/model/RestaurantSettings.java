package com.axinq.restaurant.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "restaurant_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RestaurantSettings {

    @Id
    private Long id;

    private String restaurantName;
    private String paymentQrImageUrl;
    private String contactNumber;
}
