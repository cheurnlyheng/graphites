package com.jess.shop.returns.controller;

import com.jess.shop.returns.dto.ReturnDtos.CreateReturnRequest;
import com.jess.shop.returns.dto.ReturnDtos.ReturnResponse;
import com.jess.shop.returns.service.ReturnService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
