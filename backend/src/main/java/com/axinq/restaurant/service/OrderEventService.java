package com.axinq.restaurant.service;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OrderEventService {

    // Map orderId -> list of emitters
    private final Map<Long, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter createEmitter(Long orderId) {
        SseEmitter emitter = new SseEmitter(60 * 60 * 1000L); // 1 hour
        emitters.compute(orderId, (k, list) -> {
            if (list == null) list = new ArrayList<>();
            list.add(emitter);
            return list;
        });

        emitter.onCompletion(() -> removeEmitter(orderId, emitter));
        emitter.onTimeout(() -> removeEmitter(orderId, emitter));
        emitter.onError((e) -> removeEmitter(orderId, emitter));

        return emitter;
    }

    private void removeEmitter(Long orderId, SseEmitter emitter) {
        emitters.computeIfPresent(orderId, (k, list) -> {
            list.remove(emitter);
            return list.isEmpty() ? null : list;
        });
    }

    public void emitStatus(Long orderId, Object payload) {
        List<SseEmitter> list = emitters.get(orderId);
        if (list == null || list.isEmpty()) return;
        List<SseEmitter> failed = new ArrayList<>();
        for (SseEmitter e : list) {
            try {
                e.send(SseEmitter.event().name("status").data(payload));
            } catch (IOException ioe) {
                failed.add(e);
            }
        }
        // remove failed emitters
        if (!failed.isEmpty()) {
            for (SseEmitter fe : failed) removeEmitter(orderId, fe);
        }
    }
}

