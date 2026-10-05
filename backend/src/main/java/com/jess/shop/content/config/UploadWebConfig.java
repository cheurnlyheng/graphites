package com.jess.shop.content.config;

import com.jess.shop.content.service.ImageStorageService;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.time.Duration;

@Configuration
public class UploadWebConfig implements WebMvcConfigurer {

    private final ImageStorageService storage;

    public UploadWebConfig(ImageStorageService storage) {
        this.storage = storage;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = storage.getDir().toUri().toString();
        if (!location.endsWith("/")) {
            location += "/";
        }
        // Filenames are random UUIDs and never reused, so browsers can cache them indefinitely.
        registry.addResourceHandler(ImageStorageService.URL_PREFIX + "**")
            .addResourceLocations(location)
            .setCacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable());
    }
}
