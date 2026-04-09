package com.axinq.restaurant.repository;

import com.axinq.restaurant.model.WhatsappMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface WhatsappMessageRepository extends JpaRepository<WhatsappMessage, Long> {
    List<WhatsappMessage> findByStatusAndNextAttemptAtBefore(String status, Instant before);
}

