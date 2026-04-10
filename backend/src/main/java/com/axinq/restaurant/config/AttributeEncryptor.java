package com.axinq.restaurant.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Simple AES/CBC encryptor for JPA attribute conversion.
 * Reads key from environment variable TENANT_ENCRYPTION_KEY or system property/app property 'app.encryption.key'.
 *
 * Note: This is a lightweight helper. For production consider using a proper KMS or JCE provider and stronger handling.
 */
@Converter
public class AttributeEncryptor implements AttributeConverter<String, String> {

    private static final String ENV_KEY = "TENANT_ENCRYPTION_KEY";
    private static final String DEFAULT_KEY_PROPERTY = "app.encryption.key";
    private static final String ALGO = "AES/CBC/PKCS5Padding";
    private static final int IV_LENGTH = 16;

    private final SecretKeySpec secretKey;
    private final SecureRandom random = new SecureRandom();

    public AttributeEncryptor() {
        String key = System.getenv(ENV_KEY);
        if (key == null || key.isBlank()) {
            key = System.getProperty(DEFAULT_KEY_PROPERTY);
        }
        if (key == null || key.isBlank()) {
            // Try Spring property via environment variable style
            key = System.getenv("APP_ENCRYPTION_KEY");
        }
        if (key == null) key = ""; // will derive a deterministic key (not secure) if not provided
        this.secretKey = createKey(key);
    }

    private SecretKeySpec createKey(String key) {
        try {
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = sha.digest(key.getBytes(StandardCharsets.UTF_8));
            byte[] keyBytes16 = new byte[16];
            System.arraycopy(keyBytes, 0, keyBytes16, 0, 16);
            return new SecretKeySpec(keyBytes16, "AES");
        } catch (Exception ex) {
            throw new RuntimeException("Failed to create encryption key", ex);
        }
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) return null;
        try {
            byte[] iv = new byte[IV_LENGTH];
            random.nextBytes(iv);
            IvParameterSpec ivSpec = new IvParameterSpec(iv);

            Cipher cipher = Cipher.getInstance(ALGO);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, ivSpec);
            byte[] encrypted = cipher.doFinal(attribute.getBytes(StandardCharsets.UTF_8));

            byte[] combined = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception ex) {
            throw new RuntimeException("Failed to encrypt attribute", ex);
        }
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        try {
            byte[] combined = Base64.getDecoder().decode(dbData);
            byte[] iv = new byte[IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, IV_LENGTH);
            int encLen = combined.length - IV_LENGTH;
            byte[] encrypted = new byte[encLen];
            System.arraycopy(combined, IV_LENGTH, encrypted, 0, encLen);

            Cipher cipher = Cipher.getInstance(ALGO);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new IvParameterSpec(iv));
            byte[] original = cipher.doFinal(encrypted);
            return new String(original, StandardCharsets.UTF_8);
        } catch (Exception ex) {
            throw new RuntimeException("Failed to decrypt dbData", ex);
        }
    }
}

