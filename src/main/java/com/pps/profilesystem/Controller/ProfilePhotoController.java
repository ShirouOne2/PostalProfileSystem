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
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Handles profile picture and cover photo upload/serving.
 *
 * Upload: POST /api/postal-office/{id}/profile-photo
 * Upload: POST /api/postal-office/{id}/cover-photo
 * Serve:  GET  /api/postal-office/{id}/profile-photo
 * Serve:  GET  /api/postal-office/{id}/cover-photo
 *
 * Files are saved to disk (uploads/postal-offices/).
 * File path (varchar) is stored in the DB — matches existing schema.
 */
@RestController
@RequestMapping("/api/postal-office")
public class ProfilePhotoController {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    // Upload directory — override in application.properties if needed:
    // app.upload.dir=uploads/postal-offices
    @Value("${app.upload.dir:uploads/postal-offices}")
    private String uploadDir;

    /* ── Upload profile picture ──────────────────────────────── */
    @PostMapping("/{id}/profile-photo")
    @Transactional
    public ResponseEntity<?> uploadProfilePhoto(@PathVariable Integer id,
                                                @RequestParam("file") MultipartFile file) {
        return handleUpload(id, file, "profile", 1);
    }

    /* ── Serve profile picture ───────────────────────────────── */
    @GetMapping("/{id}/profile-photo")
    @Transactional(readOnly = true)
    public ResponseEntity<Resource> serveProfilePhoto(@PathVariable Integer id) {
        return handleServe(id, "profile", 1);
    }

    /* ── Upload cover photo ──────────────────────────────────── */

    /* ── Upload specific cover photo slot ───────────────────── */
    @PostMapping("/{id}/cover-photo/{slot}")
    @Transactional
    public ResponseEntity<?> uploadCoverPhotoSlot(@PathVariable Integer id,
                                                  @PathVariable Integer slot,
                                                  @RequestParam("file") MultipartFile file) {
        return handleUpload(id, file, "cover", slot);
    }

    /* ── Serve specific cover photo slot ─────────────────────── */
    @GetMapping("/{id}/cover-photo/{slot}")
    @Transactional(readOnly = true)
    public ResponseEntity<Resource> serveCoverPhotoSlot(@PathVariable Integer id, @PathVariable Integer slot) {
        return handleServe(id, "cover", slot);
    }

    /* ---- Get all photos for an office ---- */
    @GetMapping("/{id}/photos")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getOfficePhotos(@PathVariable Integer id) {
        Optional<PostalOffice> opt = postalOfficeRepository.findById(id);
        if (opt.isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Office not found");
            return ResponseEntity.status(404).body(error);
        }

        PostalOffice office = opt.get();
        java.util.List<Map<String, Object>> photos = new java.util.ArrayList<>();

        // Add profile photo if exists
        if (office.getProfilePicture() != null && !office.getProfilePicture().isBlank()) {
            Map<String, Object> photo = new HashMap<>();
            photo.put("type", "profile");
            photo.put("slot", 0);
            photo.put("url", "/api/postal-office/" + id + "/profile-photo");
            photo.put("filename", office.getProfilePicture());
            photos.add(photo);
        }

        // Add cover photo if exists
        if (office.getCoverPhoto() != null && !office.getCoverPhoto().isBlank()) {
            Map<String, Object> photo = new HashMap<>();
            photo.put("type", "cover");
            photo.put("slot", 1);
            photo.put("url", "/api/postal-office/" + id + "/cover-photo");
            photo.put("filename", office.getCoverPhoto());
            photos.add(photo);
        }

        return ResponseEntity.ok(photos);
    }

    /* ── Shared upload logic ─────────────────────────────────── */
    private ResponseEntity<?> handleUpload(Integer id, MultipartFile file, String type, Integer slot) {
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
            // Create upload directory if it doesn't exist
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(uploadPath);

            // Generate unique filename: {type}_{id}_{uuid}.{ext}
            String originalFilename = file.getOriginalFilename();
            String ext = (originalFilename != null && originalFilename.contains("."))
                ? originalFilename.substring(originalFilename.lastIndexOf('.'))
                : ".jpg";
            String filename = type + "_" + id + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;

            Path filePath = uploadPath.resolve(filename);

            // Delete old file if exists
            PostalOffice office = opt.get();
            String oldPath = "profile".equals(type) ? office.getProfilePicture() : office.getCoverPhoto();
            if (oldPath != null && !oldPath.isBlank()) {
                try {
                    Files.deleteIfExists(Paths.get(oldPath).toAbsolutePath().normalize());
                } catch (Exception ignored) { /* old file gone, no problem */ }
            }

            // Save new file
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Store relative path in DB
            String relativePath = uploadDir + "/" + filename;
            if ("profile".equals(type)) {
                office.setProfilePicture(relativePath);
            } else {
                office.setCoverPhoto(relativePath);
            }
            postalOfficeRepository.save(office);

            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("message", "Photo uploaded successfully.");
            res.put("url", "/api/postal-office/" + id + "/" + ("profile".equals(type) ? "profile-photo" : "cover-photo"));
            return ResponseEntity.ok(res);

        } catch (IOException e) {
            return error(500, "Upload failed: " + e.getMessage());
        }
    }

    /* ── Shared serve logic ──────────────────────────────────── */
    private ResponseEntity<Resource> handleServe(Integer id, String type, Integer slot) {
        Optional<PostalOffice> opt = postalOfficeRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        PostalOffice office = opt.get();
        String filePath = "profile".equals(type) ? office.getProfilePicture() : office.getCoverPhoto();

        if (filePath == null || filePath.isBlank())
            return ResponseEntity.notFound().build();

        try {
            Path path = Paths.get(filePath).toAbsolutePath().normalize();
            Resource resource = new UrlResource(path.toUri());

            if (!resource.exists() || !resource.isReadable())
                return ResponseEntity.notFound().build();

            // Detect content type from file extension
            String filename = path.getFileName().toString().toLowerCase();
            MediaType mediaType = MediaType.IMAGE_JPEG;
            if (filename.endsWith(".png"))  mediaType = MediaType.IMAGE_PNG;
            else if (filename.endsWith(".gif")) mediaType = MediaType.IMAGE_GIF;
            else if (filename.endsWith(".webp")) mediaType = MediaType.parseMediaType("image/webp");

            return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CACHE_CONTROL, "max-age=86400") // cache 1 day
                .body(resource);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private ResponseEntity<?> error(int status, String msg) {
        Map<String, Object> e = new HashMap<>();
        e.put("success", false);
        e.put("message", msg);
        return ResponseEntity.status(status).body(e);
    }
}