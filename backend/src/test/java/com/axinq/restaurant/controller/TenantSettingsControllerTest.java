package com.axinq.restaurant.controller;

import com.axinq.restaurant.model.Tenant;
import com.axinq.restaurant.repository.TenantRepository;
import com.axinq.restaurant.service.TenantSettingsService;
import com.axinq.restaurant.service.TenantAuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.multipart.MultipartFile;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = TenantSettingsController.class)
class TenantSettingsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    // Provide a stubbed TenantSettingsService via TestConfiguration to avoid mocking concrete class
    @TestConfiguration
    static class Config {
        @Bean
        public TenantSettingsService tenantSettingsService(TenantRepository repo) {
            return new TenantSettingsService(repo) {
                @Override
                public Tenant updateSettings(Long tenantId, String googleAppPassword, MultipartFile qrCodeImage) {
                    Tenant t = new Tenant();
                    t.setId(tenantId != null ? tenantId : 42L);
                    return t;
                }
            };
        }

        // Provide a simple TenantAuthService stub instead of mocking it (avoids Mockito inline mock issues)
        @Bean
        @Primary
        public TenantAuthService tenantAuthServiceStub() {
            return new TenantAuthService(null, null) {
                @Override
                public Long validateTokenHeader(String authHeader) {
                    return 42L;
                }
            };
        }
    }

    @MockBean
    private TenantRepository tenantRepository; // injected into the stub service bean

    @BeforeEach
    void setUp() {
        // tenantAuthService stub returns 42L by TestConfiguration
    }

    @Test
    void updateTenantSettings_authenticated_ok() throws Exception {
        MockMultipartFile qr = new MockMultipartFile("qrCodeImage", "qr.png", "image/png", "data".getBytes());

        mockMvc.perform(multipart("/api/tenants/42/settings")
                        .file(qr)
                        .with(request -> { request.setMethod("PUT"); return request; })
                        .header("Authorization", "Bearer token")
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isOk());
    }
}
