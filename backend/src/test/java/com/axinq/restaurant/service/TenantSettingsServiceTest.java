package com.axinq.restaurant.service;

import com.axinq.restaurant.model.Tenant;
import com.axinq.restaurant.repository.TenantRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class TenantSettingsServiceTest {

    private TenantRepository tenantRepository;
    private TenantSettingsService service;

    @BeforeEach
    void setUp() {
        tenantRepository = Mockito.mock(TenantRepository.class);
        service = new TenantSettingsService(tenantRepository);
    }

    @AfterEach
    void tearDown() throws IOException {
        // cleanup storage dir created by the service
        Path storage = Path.of("storage/tenants");
        if (Files.exists(storage)) {
            try (Stream<Path> walk = Files.walk(storage)) {
                walk.map(Path::toFile)
                        .sorted((a, b) -> b.getPath().compareTo(a.getPath()))
                        .forEach(f -> { if (!f.delete()) f.deleteOnExit(); });
            }
            // attempt to remove parent storage dir
            Path root = Path.of("storage");
            if (Files.exists(root)) {
                try { Files.delete(root); } catch (Exception ignored) {}
            }
        }
    }

    @Test
    void updateSettings_savesQrAndPassword_andPersistsTenant() throws IOException {
        Long tenantId = 999L;
        Tenant t = new Tenant();
        t.setId(tenantId);
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(t));
        when(tenantRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        byte[] img = "dummydata".getBytes();
        MockMultipartFile qr = new MockMultipartFile("qrCodeImage", "qr.png", "image/png", img);

        Tenant updated = service.updateSettings(tenantId, "my-secret-app-pass", qr);
        assertThat(updated).isNotNull();

        // verify repository save called
        ArgumentCaptor<Tenant> cap = ArgumentCaptor.forClass(Tenant.class);
        verify(tenantRepository, times(1)).save(cap.capture());

        Tenant saved = cap.getValue();
        assertThat(saved.getGmailAppPassword()).isEqualTo("my-secret-app-pass");
        assertThat(saved.getPaymentQrImageUrl()).isNotBlank();

        // file exists
        Path p = Path.of(saved.getPaymentQrImageUrl());
        assertThat(Files.exists(p)).isTrue();
    }
}
