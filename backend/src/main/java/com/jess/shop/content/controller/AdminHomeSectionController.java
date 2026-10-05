package com.jess.shop.content.controller;

import com.jess.shop.content.dto.HomeSectionDtos.AdminHomeSectionResponse;
import com.jess.shop.content.dto.HomeSectionDtos.AdminSectionProduct;
import com.jess.shop.content.dto.HomeSectionDtos.ReorderSectionsRequest;
import com.jess.shop.content.dto.HomeSectionDtos.SaveHomeSectionRequest;
import com.jess.shop.content.service.HomeSectionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/home-sections")
public class AdminHomeSectionController {

    private final HomeSectionService homeSectionService;

    public AdminHomeSectionController(HomeSectionService homeSectionService) {
        this.homeSectionService = homeSectionService;
    }

    @GetMapping
    public List<AdminHomeSectionResponse> list() {
        return homeSectionService.listForAdmin();
    }

    @GetMapping("/{id}")
    public AdminHomeSectionResponse get(@PathVariable UUID id) {
        return homeSectionService.getForAdmin(id);
    }

    /** Every product with its image, for the "pick products" grid. */
    @GetMapping("/product-options")
    public List<AdminSectionProduct> productOptions() {
        return homeSectionService.productOptions();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminHomeSectionResponse create(@Valid @RequestBody SaveHomeSectionRequest request) {
        return homeSectionService.create(request);
    }

    @PutMapping("/{id}")
    public AdminHomeSectionResponse update(@PathVariable UUID id, @Valid @RequestBody SaveHomeSectionRequest request) {
        return homeSectionService.update(id, request);
    }

    @PutMapping("/order")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reorder(@Valid @RequestBody ReorderSectionsRequest request) {
        homeSectionService.reorder(request.sectionIds());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        homeSectionService.delete(id);
    }
}
