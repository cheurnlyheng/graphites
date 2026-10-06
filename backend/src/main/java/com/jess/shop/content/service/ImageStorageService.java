package com.jess.shop.content.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

/** Stores admin-uploaded images on local disk and serves them under /uploads/** (see UploadWebConfig). */
@Service
public class ImageStorageService {

    public static final String URL_PREFIX = "/uploads/";

    // A hanging-rail cutout's canvas is usually much bigger than the garment itself (whatever headroom
    // the original photo happened to have above/around it) -- the hanging rail renders the whole canvas,
    // so that dead space makes the garment look small and unevenly sized next to other products. This
    // mirrors the one-off fix applied to the first 6 products, now applied automatically on every upload.
    private static final int ALPHA_THRESHOLD = 10;
    private static final double PADDING_RATIO = 0.035;

    private final Path dir;

    public ImageStorageService(@Value("${app.upload-dir:uploads}") String uploadDir) {
        this.dir = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    public Path getDir() {
        return dir;
    }

    public record StoredImage(String url, BigDecimal hookPercent) {}

    /** Returns the public path of the stored image, e.g. "/uploads/3f2c....jpg". The client-supplied
     * filename and content type are never trusted: the type comes from the file's own signature, and
     * the stored name is a random UUID. SVG is deliberately not accepted (it can carry scripts).
     *
     * @param trimTransparentPadding crop to the opaque content's bounding box (plus a small margin) and
     *        return the hook percent that now places the hook point where it was before cropping --
     *        only meaningful for hanging-rail cutouts, never applied to ordinary product photos. */
    public StoredImage store(MultipartFile file, boolean trimTransparentPadding) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Choose an image to upload");
        }
        String extension;
        try (InputStream in = file.getInputStream()) {
            extension = detectExtension(in.readNBytes(12));
        }
        if (extension == null) {
            throw new IllegalArgumentException("Only JPG, PNG, WebP or GIF images can be uploaded");
        }
        Files.createDirectories(dir);
        String name = UUID.randomUUID() + "." + extension;
        Path target = dir.resolve(name);
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target);
        }
        BigDecimal hookPercent = trimTransparentPadding ? trimTransparentPadding(target) : null;
        return new StoredImage(URL_PREFIX + name, hookPercent);
    }

    /** Crops the image in place to its opaque bounding box (with a small breathing-room margin) and
     * returns the hook percent for the new, cropped height. Returns null (leaving the file untouched)
     * if the image has no alpha channel, is fully transparent, or is already tightly cropped. */
    // A PNG's declared dimensions can be enormous while the file on disk is tiny (the pixel grid is
    // compressed) -- ImageIO.read() allocates and decodes the full pixel grid up front, so a crafted
    // file can exhaust memory well before the per-pixel loop below ever runs. Checked via the image
    // reader's header only (no pixel decode yet) before committing to a full read. 8000x8000 is far
    // beyond any real product photo this admin panel would ever receive.
    private static final int MAX_DIMENSION = 8000;

    private BigDecimal trimTransparentPadding(Path target) throws IOException {
        try (var in = ImageIO.createImageInputStream(target.toFile())) {
            var readers = ImageIO.getImageReaders(in);
            if (readers.hasNext()) {
                var reader = readers.next();
                try {
                    reader.setInput(in);
                    if (reader.getWidth(0) > MAX_DIMENSION || reader.getHeight(0) > MAX_DIMENSION) {
                        throw new IllegalArgumentException("Image dimensions are too large (max " + MAX_DIMENSION + "px per side)");
                    }
                } finally {
                    reader.dispose();
                }
            }
        }

        BufferedImage img = ImageIO.read(target.toFile());
        if (img == null || !img.getColorModel().hasAlpha()) {
            return null;
        }
        int width = img.getWidth();
        int height = img.getHeight();
        int minX = width, maxX = -1, minY = height, maxY = -1;
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int alpha = (img.getRGB(x, y) >>> 24) & 0xFF;
                if (alpha > ALPHA_THRESHOLD) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < 0) {
            return null; // fully transparent -- nothing to trim
        }

        int visibleW = maxX - minX + 1;
        int visibleH = maxY - minY + 1;
        int pad = (int) Math.round(PADDING_RATIO * Math.max(visibleW, visibleH));

        int cropMinX = Math.max(0, minX - pad);
        int cropMaxX = Math.min(width - 1, maxX + pad);
        int cropMinY = Math.max(0, minY - pad);
        int cropMaxY = Math.min(height - 1, maxY + pad);

        if (cropMinX == 0 && cropMinY == 0 && cropMaxX == width - 1 && cropMaxY == height - 1) {
            return null; // already tight -- skip a pointless re-encode
        }

        int newWidth = cropMaxX - cropMinX + 1;
        int newHeight = cropMaxY - cropMinY + 1;
        BufferedImage cropped = img.getSubimage(cropMinX, cropMinY, newWidth, newHeight);
        ImageIO.write(cropped, "png", target.toFile());

        double hookPercent = (minY - cropMinY) / (double) newHeight * 100;
        return BigDecimal.valueOf(hookPercent).setScale(2, RoundingMode.HALF_UP);
    }

    private static String detectExtension(byte[] h) {
        if (h.length >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) return "jpg";
        if (h.length >= 8 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G') return "png";
        if (h.length >= 6 && new String(h, 0, 4, StandardCharsets.US_ASCII).equals("GIF8")) return "gif";
        if (h.length >= 12 && new String(h, 0, 4, StandardCharsets.US_ASCII).equals("RIFF")
            && new String(h, 8, 4, StandardCharsets.US_ASCII).equals("WEBP")) return "webp";
        return null;
    }
}
