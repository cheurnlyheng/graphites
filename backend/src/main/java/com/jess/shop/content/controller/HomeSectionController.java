package com.jess.shop.content.controller;

import com.jess.shop.content.dto.HomeSectionDtos.HomeSectionResponse;
import com.jess.shop.content.service.HomeSectionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/home-sections")
public class HomeSectionController {

    private final HomeSectionService homeSectionService;

    public HomeSectionController(HomeSectionService homeSectionService) {
        this.homeSectionService = homeSectionService;
    }

    @GetMapping
    public List<HomeSectionResponse> list() {
        return homeSectionService.listForStorefront();
    }
}
