package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.PostalOffice;
import com.pps.profilesystem.Repository.PostalOfficeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Handles profile picture and cover photo upload / serving.
 *
 * ── Profile picture ──────────────────────────────────────────
 *   POST GET  /api/postal-office/{id}/profile-photo
 *
 * ── Cover photo carousel (3 slots) ───────────────────────────
 *   POST GET  /api/postal-office/{id}/cover-photo/{slot}   slot = 1 | 2 | 3
 *
 * Each slot maps to its own DB column:
 *   slot 1 → cover_photo
 *   slot 2 → cover_photo_2   (added in V2 migration)
 *   slot 3 → cover_photo_3   (added in V2 migration)
 *
 * ── Photo listing ────────────────────────────────────────────
 *   GET /api/postal-office/{id}/photos
 */
@RestController
@RequestMapping("/api/postal-office")
public class ProfilePhotoController {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    // Override in application.properties:  app.upload.dir=uploads/postal-offices
    @Value("${app.upload.dir:uploads/postal-offices}")
    private String uploadDir;

    // ── Profile picture ───────────────────────────────────────

    @PostMapping("/{id}/profile-photo")
    @Transactional
    public ResponseEntity<?> uploadProfilePhoto(@PathVariable Integer id,
                                                @RequestParam("file") MultipartFile file) {
        return handleUpload(id, file, "profile", 0);
    }

    @GetMapping("/{id}/profile-photo")
    @Transactional(readOnly = true)
    public ResponseEntity<Resource> serveProfilePhoto(@PathVariable Integer id) {
        return handleServe(id, "profile", 0);
    }

    @DeleteMapping("/{id}/profile-photo")
    @Transactional
    public ResponseEntity<?> deleteProfilePhoto(@PathVariable Integer id) {
        return handleDelete(id, "profile", 0);
    }

    // ── Cover photo — slot-based (1 / 2 / 3) ─────────────────

    @PostMapping("/{id}/cover-photo/{slot}")
    @Transactional
    public ResponseEntity<?> uploadCoverPhotoSlot(@PathVariable Integer id,
                                                  @PathVariable Integer slot,
                                                  @RequestParam("file") MultipartFile file) {
        if (slot < 1 || slot > 3) {
            return error(400, "Invalid slot. Use 1, 2, or 3.");
        }
        return handleUpload(id, file, "cover", slot);
    }

    @GetMapping("/{id}/cover-photo/{slot}")
    @Transactional(readOnly = true)
    public ResponseEntity<Resource> serveCoverPhotoSlot(@PathVariable Integer id,
                                                        @PathVariable Integer slot) {
        if (slot < 1 || slot > 3) {
            return ResponseEntity.notFound().build();
        }
        return handleServe(id, "cover", slot);
    }

    @DeleteMapping("/{id}/cover-photo/{slot}")
    @Transactional
    public ResponseEntity<?> deleteCoverPhotoSlot(@PathVariable Integer id, @PathVariable Integer slot) {
        if (slot < 1 || slot > 3) return error(400, "Invalid slot.");
        return handleDelete(id, "cover", slot);
    }

    // ── Photo listing ─────────────────────────────────────────

    @GetMapping("/{id}/photos")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getOfficePhotos(@PathVariable Integer id) {
        Optional<PostalOffice> opt = postalOfficeRepository.findById(id);
        if (opt.isEmpty()) {
            return error(404, "Office not found.");
        }

        PostalOffice office = opt.get();
        List<Map<String, Object>> photos = new ArrayList<>();

        // Profile picture
        if (hasPath(office.getProfilePicture())) {
            Map<String, Object> p = new HashMap<>();
            p.put("type",     "profile");
            p.put("slot",     0);
            p.put("url",      "/api/postal-office/" + id + "/profile-photo");
            p.put("filename", office.getProfilePicture());
            photos.add(p);
        }

        // Cover photo slots 1–3
        for (int slot = 1; slot <= 3; slot++) {
            String path = office.getCoverPhotoBySlot(slot);
            if (hasPath(path)) {
                Map<String, Object> p = new HashMap<>();
                p.put("type",     "cover");
                p.put("slot",     slot);
                p.put("url",      "/api/postal-office/" + id + "/cover-photo/" + slot);
                p.put("filename", path);
                photos.add(p);
            }
        }

        return ResponseEntity.ok(photos);
    }

    // ── Shared upload logic ───────────────────────────────────

    /**
     * @param type  "profile" or "cover"
     * @param slot  0 for profile picture; 1/2/3 for cover photo slots
     */
    private ResponseEntity<?> handleUpload(Integer id, MultipartFile file,
                                           String type, int slot) {
        if (file == null || file.isEmpty())
            return error(400, "No file selected.");

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/"))
            return error(400, "Only image files are allowed.");

        if (file.getSize() > 5 * 1024 * 1024)
            return error(400, "File must be smaller than 5MB.");

        Optional<PostalOffice> opt = postalOfficeRepository.findById(id);
        if (opt.isEmpty()) return error(404, "Office not found.");

        try {
            // Ensure upload directory exists
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(uploadPath);

            // Unique filename:  {type}{slot}_{id}_{uuid}.{ext}
            String orig = file.getOriginalFilename();
            String ext  = (orig != null && orig.contains("."))
                          ? orig.substring(orig.lastIndexOf('.')) : ".jpg";
            String slotTag = (slot == 0) ? "" : String.valueOf(slot);
            String filename = type + slotTag + "_" + id + "_"
                              + UUID.randomUUID().toString().substring(0, 8) + ext;
            Path filePath = uploadPath.resolve(filename);

            // Delete the old file for this slot from disk
            PostalOffice office = opt.get();
            String oldPath = getStoredPath(office, type, slot);
            deleteOldFile(oldPath);

            // Save new file
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Persist relative path to the correct column
            String relativePath = uploadDir + "/" + filename;
            setStoredPath(office, type, slot, relativePath);
            postalOfficeRepository.save(office);

            // Build the serving URL for the response
            String serveUrl = "/api/postal-office/" + id + "/"
                              + (type.equals("profile") ? "profile-photo" : "cover-photo/" + slot);

            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("message", "Photo uploaded successfully.");
            res.put("url",     serveUrl);
            return ResponseEntity.ok(res);

        } catch (IOException e) {
            return error(500, "Upload failed: " + e.getMessage());
        }
    }

    // ── Shared serve logic ────────────────────────────────────

    private ResponseEntity<Resource> handleServe(Integer id, String type, int slot) {
        Optional<PostalOffice> opt = postalOfficeRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        PostalOffice office = opt.get();
        String filePath = getStoredPath(office, type, slot);

        if (!hasPath(filePath)) return ResponseEntity.notFound().build();

        try {
            Path path = Paths.get(filePath).toAbsolutePath().normalize();
            Resource resource = new UrlResource(path.toUri());

            if (!resource.exists() || !resource.isReadable())
                return ResponseEntity.notFound().build();

            // Detect content type from extension
            String name = path.getFileName().toString().toLowerCase();
            MediaType mediaType = MediaType.IMAGE_JPEG;
            if (name.endsWith(".png"))  mediaType = MediaType.IMAGE_PNG;
            else if (name.endsWith(".gif"))  mediaType = MediaType.IMAGE_GIF;
            else if (name.endsWith(".webp")) mediaType = MediaType.parseMediaType("image/webp");

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CACHE_CONTROL, "max-age=86400") // 1-day browser cache
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private ResponseEntity<?> handleDelete(Integer id, String type, int slot) {
        Optional<PostalOffice> opt = postalOfficeRepository.findById(id);
        if (opt.isEmpty()) return error(404, "Office not found.");
        
        PostalOffice office = opt.get();
        String oldPath = getStoredPath(office, type, slot);
        
        if (hasPath(oldPath)) {
            deleteOldFile(oldPath);
            setStoredPath(office, type, slot, null);
            postalOfficeRepository.save(office);
            return ResponseEntity.ok(Map.of("success", true, "message", "Photo deleted successfully."));
        } else {
            return ResponseEntity.ok(Map.of("success", true, "message", "No photo to delete."));
        }
    }

    // ── Path helpers ──────────────────────────────────────────

    /**
     * Reads the stored file path from the correct entity field.
     *  type="profile", slot=0  → profilePicture
     *  type="cover",   slot=1  → coverPhoto
     *  type="cover",   slot=2  → coverPhoto2
     *  type="cover",   slot=3  → coverPhoto3
     */
    private String getStoredPath(PostalOffice office, String type, int slot) {
        if ("profile".equals(type)) return office.getProfilePicture();
        return office.getCoverPhotoBySlot(slot);   // slot 1/2/3
    }

    /** Writes the stored file path to the correct entity field. */
    private void setStoredPath(PostalOffice office, String type, int slot, String path) {
        if ("profile".equals(type)) {
            office.setProfilePicture(path);
        } else {
            office.setCoverPhotoBySlot(slot, path);
        }
    }

    private void deleteOldFile(String storedPath) {
        if (!hasPath(storedPath)) return;
        try {
            Files.deleteIfExists(Paths.get(storedPath).toAbsolutePath().normalize());
        } catch (Exception ignored) { /* old file gone — no problem */ }
    }

    private boolean hasPath(String p) {
        return p != null && !p.isBlank();
    }

    private ResponseEntity<?> error(int status, String msg) {
        Map<String, Object> body = new HashMap<>();
        body.put("success", false);
        body.put("message", msg);
        return ResponseEntity.status(status).body(body);
    }
}