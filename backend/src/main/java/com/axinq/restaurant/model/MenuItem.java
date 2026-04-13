package com.axinq.restaurant.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.*;

@Entity
@Table(name = "menu_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MenuItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;
    private BigDecimal price;
    private String category;
    private String imageUrl;

    @Column(nullable = false)
    private boolean available;

    // When null, the menu item is global (available to all tenants). When non-null, it belongs to a specific tenant.
    @Column(name = "tenant_id")
    private Long tenantId;
}
