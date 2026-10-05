package com.jess.shop.content.controller;

import com.jess.shop.content.dto.HomeSectionDtos.UploadResponse;
import com.jess.shop.content.service.ImageStorageService;
import com.jess.shop.content.service.ImageStorageService.StoredImage;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/admin/uploads")
public class AdminUploadController {

    private final ImageStorageService imageStorageService;

    public AdminUploadController(ImageStorageService imageStorageService) {
        this.imageStorageService = imageStorageService;
    }

    /** trim=true is only ever passed for the hanging-rail cutout field -- see ImageField.tsx's
     * autoTrim prop -- never for ordinary product photos. */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public UploadResponse upload(@RequestParam("file") MultipartFile file,
                                  @RequestParam(value = "trim", required = false, defaultValue = "false") boolean trim) throws IOException {
        StoredImage stored = imageStorageService.store(file, trim);
        return new UploadResponse(stored.url(), stored.hookPercent());
    }
}
