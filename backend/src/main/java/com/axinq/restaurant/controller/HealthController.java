package com.axinq.restaurant.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final DataSource dataSource;

    @Value("${spring.mail.dizminu.host:smtp.gmail.com}")
    private String dizminuHost;
    @Value("${spring.mail.dizminu.port:587}")
    private int dizminuPort;

    @Value("${spring.mail.sales.host:smtp.gmail.com}")
    private String salesHost;
    @Value("${spring.mail.sales.port:587}")
    private int salesPort;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> body = new HashMap<>();
        Map<String, Object> checks = new HashMap<>();
        boolean overallOk = true;

        // timestamp
        body.put("timestamp", Instant.now().toString());

        // DB check
        Map<String, Object> dbCheck = new HashMap<>();
        try (Connection c = dataSource.getConnection(); Statement s = c.createStatement()) {
            // Quick lightweight query to validate DB is responding
            try (ResultSet rs = s.executeQuery("SELECT 1")) {
                if (rs.next()) {
                    dbCheck.put("status", "OK");
                } else {
                    dbCheck.put("status", "ERROR");
                    dbCheck.put("message", "No result from test query");
                    overallOk = false;
                }
            }
        } catch (Exception ex) {
            dbCheck.put("status", "ERROR");
            dbCheck.put("message", ex.getMessage());
            overallOk = false;
        }
        checks.put("database", dbCheck);

        // SMTP connectivity checks (tcp connect to host:port)
        checks.put("dizminu_smtp", tcpCheck(dizminuHost, dizminuPort));
        checks.put("sales_smtp", tcpCheck(salesHost, salesPort));

        // determine overall status
        for (Object o : checks.values()) {
            if (o instanceof Map) {
                Map<?, ?> m = (Map<?, ?>) o;
                Object st = m.get("status");
                if (st == null || !"OK".equals(st.toString())) {
                    overallOk = false;
                    break;
                }
            }
        }

        body.put("status", overallOk ? "OK" : "DEGRADED");
        body.put("checks", checks);
        return ResponseEntity.ok(body);
    }

    private Map<String, Object> tcpCheck(String host, int port) {
        Map<String, Object> out = new HashMap<>();
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), 3000);
            out.put("status", "OK");
            out.put("host", host);
            out.put("port", port);
        } catch (Exception ex) {
            out.put("status", "ERROR");
            out.put("host", host);
            out.put("port", port);
            out.put("message", ex.getMessage());
        }
        return out;
    }
}
