package com.jess.shop.returns.controller;

import com.jess.shop.returns.dto.ReturnDtos.CreateReturnRequest;
import com.jess.shop.returns.dto.ReturnDtos.PhotoUploadResponse;
import com.jess.shop.returns.dto.ReturnDtos.ReturnResponse;
import com.jess.shop.returns.service.ReturnService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

/** Not login-gated (mirrors order lookup) -- there are no customer accounts, so a return is always
 * requested using the order id from the confirmation email, same as viewing the order itself. */
@RestController
@RequestMapping("/api/orders/{orderId}/returns")
public class ReturnController {

    private final ReturnService returnService;

    public ReturnController(ReturnService returnService) {
        this.returnService = returnService;
    }

    @PostMapping
    public ReturnResponse create(@PathVariable UUID orderId, @Valid @RequestBody CreateReturnRequest request) {
        return returnService.create(orderId, request);
    }

    /** Condition-proof photos, uploaded one at a time before the rest of the form is submitted (same
     * pattern as the admin ImageField). orderId isn't used for authorization here -- same guest-order
     * trust model as the rest of this controller -- it's just kept in the URL for consistency. */
    @PostMapping(path = "/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public PhotoUploadResponse uploadPhoto(@PathVariable UUID orderId, @RequestParam("file") MultipartFile file) throws IOException {
        return new PhotoUploadResponse(returnService.uploadPhoto(file));
    }
}
