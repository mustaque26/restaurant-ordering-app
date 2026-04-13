package com.axinq.restaurant.service;

import com.axinq.restaurant.model.Tenant;
import com.axinq.restaurant.repository.TenantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Service
public class TenantSettingsService {

    private final TenantRepository tenantRepository;
    private final Path storageRoot;

    public TenantSettingsService(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
        // Default storage root inside backend/storage — change via config for production
        this.storageRoot = Paths.get("storage");
    }

    @Transactional
    public Tenant updateSettings(Long tenantId, String googleAppPassword, MultipartFile qrCodeImage) throws IOException {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + tenantId));

        if (googleAppPassword != null && !googleAppPassword.isBlank()) {
            // In production, store encrypted or in a secure vault. The Tenant entity already uses AttributeEncryptor for gmailAppPassword.
            tenant.setGmailAppPassword(googleAppPassword.trim());
        }

        if (qrCodeImage != null && !qrCodeImage.isEmpty()) {
            Path tenantDir = storageRoot.resolve("tenants").resolve(String.valueOf(tenantId));
            Files.createDirectories(tenantDir);

            String original = qrCodeImage.getOriginalFilename();
            String ext = "";
            if (original != null && original.contains(".")) {
                ext = original.substring(original.lastIndexOf('.'));
            }
            String filename = "payment-qr" + ext;
            Path target = tenantDir.resolve(filename);

            try {
                Files.copy(qrCodeImage.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException e) {
                throw new IOException("Failed to store QR image", e);
            }

            // Store relative path; in production you may want an absolute public URL
            tenant.setPaymentQrImageUrl(target.toString());
        }

        return tenantRepository.save(tenant);
    }
}

