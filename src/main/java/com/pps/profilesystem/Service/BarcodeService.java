package com.pps.profilesystem.Service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import com.pps.profilesystem.Entity.Barcode;
import com.pps.profilesystem.Repository.BarcodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;
import javax.imageio.ImageIO;

/**
 * Service for managing barcodes.
 */
@Service
@RequiredArgsConstructor
public class BarcodeService {

    private final BarcodeRepository barcodeRepository;

    /* ── CRUD ── */

    public List<Barcode> getAll() {
        return barcodeRepository.findAll();
    }

    public Optional<Barcode> getById(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("ID cannot be null");
        }
        return barcodeRepository.findById(id);
    }

    public List<Barcode> getByInventoryId(Integer inventoryId) {
        return barcodeRepository.findByInventoryId(inventoryId);
    }

    public Barcode save(Barcode barcode) {
        // Auto-set QR content if not provided
        if (barcode.getQrContent() == null) {
            barcode.setQrContent(buildQrContent(barcode));
        }
        return barcodeRepository.save(barcode);
    }

    public boolean delete(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("ID cannot be null");
        }
        if (barcodeRepository.existsById(id)) {
            barcodeRepository.deleteById(id);
            return true;
        }
        return false;
    }

    /* ── QR GENERATION ── */

    /**
     * Generates a QR code PNG as a byte array for a given Barcode entity.
     * @param barcode  the barcode record
     * @param size     pixel size (width & height), e.g. 300
     */
    public byte[] generateQrPng(Barcode barcode, int size) throws WriterException, IOException {
        String content = barcode.getQrContent() != null
                ? barcode.getQrContent()
                : buildQrContent(barcode);

        Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
        hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.H);
        hints.put(EncodeHintType.MARGIN, 2);
        hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");

        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix matrix = writer.encode(content, BarcodeFormat.QR_CODE, size, size, hints);

        BufferedImage image = MatrixToImageWriter.toBufferedImage(matrix);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, "PNG", baos);
        return baos.toByteArray();
    }

    /**
     * Returns QR image as Base64 string (for embedding directly in HTML/Thymeleaf).
     */
    public String generateQrBase64(Barcode barcode, int size) throws WriterException, IOException {
        byte[] pngBytes = generateQrPng(barcode, size);
        return Base64.getEncoder().encodeToString(pngBytes);
    }

    /* ── HELPERS ── */

    public String buildQrContent(Barcode b) {
        return nullSafe(b.getRefNum());
    }

    private String nullSafe(String s) {
        return s != null ? s : "";
    }
}
