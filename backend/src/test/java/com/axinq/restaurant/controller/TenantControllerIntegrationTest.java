package com.axinq.restaurant.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;

import com.axinq.restaurant.model.Tenant;
import com.axinq.restaurant.repository.TenantRepository;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
public class TenantControllerIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TenantRepository tenantRepository;

    private final RestTemplate rest = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @AfterEach
    public void cleanup() {
        tenantRepository.deleteAll();
    }

    @Test
    public void createTenant_then_duplicateReturns409() throws Exception {
        String base = "http://localhost:" + port + "/api/tenants";

        // Create first tenant
        Tenant t1 = new Tenant();
        t1.setName("Integration Test Restaurant");
        t1.setLogoUrl("");
        t1.setAdminEmail("dup@example.com");
        t1.setPlan("BASIC");
        t1.setFeaturesJson("{}");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> req = new HttpEntity<>(mapper.writeValueAsString(t1), headers);

        ResponseEntity<String> resp1 = rest.postForEntity(base, req, String.class);
        assertThat(resp1.getStatusCode()).isEqualTo(HttpStatus.OK);

        // Attempt duplicate with different casing
        Tenant t2 = new Tenant();
        t2.setName("Other Name");
        t2.setLogoUrl("");
        t2.setAdminEmail("DUP@EXAMPLE.COM");
        t2.setPlan("PRIME");
        t2.setFeaturesJson("{}");

        HttpEntity<String> req2 = new HttpEntity<>(mapper.writeValueAsString(t2), headers);
        org.springframework.http.HttpStatusCode status2 = null;
        String respBody2 = null;
        try {
            ResponseEntity<String> resp2 = rest.postForEntity(base, req2, String.class);
            status2 = resp2.getStatusCode();
            respBody2 = resp2.getBody();
        } catch (HttpClientErrorException he) {
            status2 = he.getStatusCode();
            respBody2 = he.getResponseBodyAsString();
        }

        // Expect 409 Conflict
        assertThat(status2.value()).isEqualTo(HttpStatus.CONFLICT.value());

        // Response body should contain existingTenants array
        JsonNode body = mapper.readTree(respBody2);
        assertThat(body.has("existingTenants")).isTrue();
        assertThat(body.get("existingTenants").isArray()).isTrue();
        assertThat(body.get("existingTenants").size()).isGreaterThanOrEqualTo(1);

        // If incoming was PRIME and existing was BASIC, controller should suggest action 'upgrade'
        assertThat(body.has("action")).isTrue();
        assertThat(body.get("action").asText()).isEqualTo("upgrade");

        JsonNode first = body.get("existingTenants").get(0);
        assertThat(first.get("adminEmail").asText().equalsIgnoreCase("dup@example.com")).isTrue();
    }
}
