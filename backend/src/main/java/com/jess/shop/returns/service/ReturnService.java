package com.jess.shop.returns.service;

import com.jess.shop.catalog.repository.ProductVariantRepository;
import com.jess.shop.common.exception.ResourceNotFoundException;
import com.jess.shop.order.entity.Order;
import com.jess.shop.order.entity.OrderItem;
import com.jess.shop.order.repository.OrderItemRepository;
import com.jess.shop.order.repository.OrderRepository;
import com.jess.shop.payment.service.StripeRefundService;
import com.jess.shop.returns.dto.ReturnDtos.*;
import com.jess.shop.returns.entity.ReturnItem;
import com.jess.shop.returns.entity.ReturnRequest;
import com.jess.shop.returns.entity.ReturnStatus;
import com.jess.shop.returns.repository.ReturnItemRepository;
import com.jess.shop.returns.repository.ReturnRequestRepository;
import com.stripe.exception.StripeException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ReturnService {

    private static final Logger log = LoggerFactory.getLogger(ReturnService.class);

    private final ReturnRequestRepository returnRequestRepository;
    private final ReturnItemRepository returnItemRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductVariantRepository variantRepository;
    private final StripeRefundService stripeRefundService;

    public ReturnService(ReturnRequestRepository returnRequestRepository, ReturnItemRepository returnItemRepository,
                          OrderRepository orderRepository, OrderItemRepository orderItemRepository,
                          ProductVariantRepository variantRepository, StripeRefundService stripeRefundService) {
        this.returnRequestRepository = returnRequestRepository;
        this.returnItemRepository = returnItemRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.variantRepository = variantRepository;
        this.stripeRefundService = stripeRefundService;
    }

    @Transactional
    public ReturnResponse create(UUID orderId, CreateReturnRequest request) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        ReturnRequest returnRequest = ReturnRequest.builder()
            .orderId(orderId)
            .customerId(order.getCustomerId())
            .status(ReturnStatus.REQUESTED)
            .reason(request.reason())
            .build();
        returnRequest = returnRequestRepository.save(returnRequest);

        for (ReturnItemRequest itemReq : request.items()) {
            ReturnItem item = ReturnItem.builder()
                .returnRequestId(returnRequest.getId())
                .orderItemId(itemReq.orderItemId())
                .quantity(itemReq.quantity())
                .reason(itemReq.reason())
                .build();
            returnItemRepository.save(item);
        }

        return toResponse(returnRequest);
    }

    public List<ReturnResponse> listForCustomer(UUID customerId) {
        return returnRequestRepository.findByCustomerId(customerId).stream().map(this::toResponse).toList();
    }

    public Page<ReturnResponse> adminList(ReturnStatus status, Pageable pageable) {
        Page<ReturnRequest> page = status == null
            ? returnRequestRepository.findAll(pageable)
            : returnRequestRepository.findByStatus(status, pageable);
        return page.map(this::toResponse);
    }

    @Transactional
    public ReturnResponse approve(UUID returnRequestId) {
        return updateStatus(returnRequestId, ReturnStatus.APPROVED);
    }

    @Transactional
    public ReturnResponse reject(UUID returnRequestId) {
        return updateStatus(returnRequestId, ReturnStatus.REJECTED);
    }

    /** Called once the physical item is back with Jess. Restocks the variant (unless it was
     * damaged/final-sale) and issues a Stripe refund for the returned line item(s). */
    @Transactional
    public ReturnResponse markReceivedAndRefund(UUID returnRequestId, ResolveReturnRequest request) {
        ReturnRequest returnRequest = returnRequestRepository.findById(returnRequestId)
            .orElseThrow(() -> new ResourceNotFoundException("Return request not found: " + returnRequestId));
        Order order = orderRepository.findById(returnRequest.getOrderId())
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + returnRequest.getOrderId()));

        List<ReturnItem> items = returnItemRepository.findByReturnRequestId(returnRequestId);
        BigDecimal refundAmount = BigDecimal.ZERO;

        for (ReturnItem returnItem : items) {
            OrderItem orderItem = orderItemRepository.findById(returnItem.getOrderItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Order item not found: " + returnItem.getOrderItemId()));
            refundAmount = refundAmount.add(orderItem.getUnitPrice().multiply(BigDecimal.valueOf(returnItem.getQuantity())));

            if (request.restock() && orderItem.getProductVariantId() != null) {
                variantRepository.incrementStock(orderItem.getProductVariantId(), returnItem.getQuantity());
            }
        }

        if (order.getStripePaymentIntentId() != null) {
            try {
                stripeRefundService.refund(order.getStripePaymentIntentId(), refundAmount);
            } catch (StripeException e) {
                throw new RuntimeException("Failed to issue Stripe refund for return " + returnRequestId, e);
            }
        } else {
            log.warn("Return {} has no payment intent on its order -- skipping Stripe refund", returnRequestId);
        }

        returnRequest.setStatus(ReturnStatus.REFUNDED);
        returnRequest.setResolvedAt(Instant.now());
        return toResponse(returnRequestRepository.save(returnRequest));
    }

    private ReturnResponse updateStatus(UUID id, ReturnStatus status) {
        ReturnRequest returnRequest = returnRequestRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Return request not found: " + id));
        returnRequest.setStatus(status);
        if (status == ReturnStatus.REJECTED) {
            returnRequest.setResolvedAt(Instant.now());
        }
        return toResponse(returnRequestRepository.save(returnRequest));
    }

    private ReturnResponse toResponse(ReturnRequest returnRequest) {
        List<ReturnItemResponse> items = returnItemRepository.findByReturnRequestId(returnRequest.getId()).stream()
            .map(i -> {
                String productName = orderItemRepository.findById(i.getOrderItemId())
                    .map(OrderItem::getProductNameSnapshot).orElse("(unknown)");
                return new ReturnItemResponse(i.getId(), i.getOrderItemId(), productName, i.getQuantity(), i.getReason());
            })
            .toList();
        return new ReturnResponse(returnRequest.getId(), returnRequest.getOrderId(), returnRequest.getStatus(),
            returnRequest.getReason(), returnRequest.getRequestedAt(), returnRequest.getResolvedAt(), items);
    }
}
