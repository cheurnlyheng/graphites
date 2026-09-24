package com.jess.shop.inventory.service;

import com.jess.shop.catalog.entity.Product;
import com.jess.shop.catalog.entity.ProductVariant;
import com.jess.shop.catalog.repository.ProductRepository;
import com.jess.shop.catalog.repository.ProductVariantRepository;
import com.jess.shop.common.exception.ResourceNotFoundException;
import com.jess.shop.inventory.dto.InventoryDtos.*;
import com.jess.shop.inventory.entity.ProductSupplier;
import com.jess.shop.inventory.entity.PurchaseOrder;
import com.jess.shop.inventory.entity.PurchaseOrderItem;
import com.jess.shop.inventory.entity.PurchaseOrderStatus;
import com.jess.shop.inventory.repository.ProductSupplierRepository;
import com.jess.shop.inventory.repository.PurchaseOrderItemRepository;
import com.jess.shop.inventory.repository.PurchaseOrderRepository;
import com.jess.shop.inventory.repository.SupplierRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class RestockService {

    private static final Logger log = LoggerFactory.getLogger(RestockService.class);

    private final ProductVariantRepository variantRepository;
    private final ProductRepository productRepository;
    private final ProductSupplierRepository productSupplierRepository;
    private final SupplierRepository supplierRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;

    public RestockService(ProductVariantRepository variantRepository, ProductRepository productRepository,
                           ProductSupplierRepository productSupplierRepository, SupplierRepository supplierRepository,
                           PurchaseOrderRepository purchaseOrderRepository, PurchaseOrderItemRepository purchaseOrderItemRepository) {
        this.variantRepository = variantRepository;
        this.productRepository = productRepository;
        this.productSupplierRepository = productSupplierRepository;
        this.supplierRepository = supplierRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderItemRepository = purchaseOrderItemRepository;
    }

    public List<LowStockVariant> listLowStock() {
        return variantRepository.findLowStockVariants().stream().map(v -> {
            Product product = productRepository.findById(v.getProductId()).orElse(null);
            return new LowStockVariant(v.getId(), v.getSku(), product == null ? "(unknown)" : product.getName(),
                v.getStockQty(), v.getLowStockThreshold());
        }).toList();
    }

    /** Runs hourly: for every variant at/below its low-stock threshold with a linked supplier,
     * ensures there's a DRAFT purchase order containing it -- so Jess has something ready to review
     * and send instead of discovering the shortage only once she's already out of stock. */
    @Scheduled(fixedRate = 60 * 60 * 1000)
    @Transactional
    public void generateDraftPurchaseOrders() {
        List<ProductVariant> lowStock = variantRepository.findLowStockVariants();
        for (ProductVariant variant : lowStock) {
            Optional<ProductSupplier> link = productSupplierRepository.findFirstByProductVariantId(variant.getId());
            if (link.isEmpty()) {
                log.info("Variant {} is low on stock but has no linked supplier -- skipping auto-draft", variant.getSku());
                continue;
            }
            ensureDraftPurchaseOrderItem(link.get(), variant);
        }
    }

    private void ensureDraftPurchaseOrderItem(ProductSupplier link, ProductVariant variant) {
        List<PurchaseOrder> drafts = purchaseOrderRepository.findBySupplierIdAndStatus(link.getSupplierId(), PurchaseOrderStatus.DRAFT);
        PurchaseOrder draft = drafts.isEmpty()
            ? purchaseOrderRepository.save(PurchaseOrder.builder().supplierId(link.getSupplierId()).status(PurchaseOrderStatus.DRAFT).build())
            : drafts.get(0);

        boolean alreadyOnDraft = purchaseOrderItemRepository.findByPurchaseOrderId(draft.getId()).stream()
            .anyMatch(i -> variant.getId().equals(i.getProductVariantId()));
        if (alreadyOnDraft) {
            return;
        }

        int qty = (link.getReorderQty() != null && link.getReorderQty() > 0) ? link.getReorderQty() : 10;
        purchaseOrderItemRepository.save(PurchaseOrderItem.builder()
            .purchaseOrderId(draft.getId())
            .productVariantId(variant.getId())
            .quantity(qty)
            .unitCost(link.getCostPrice())
            .build());
    }

    public List<PurchaseOrderResponse> listDraftPurchaseOrders() {
        return purchaseOrderRepository.findAll().stream()
            .filter(po -> po.getStatus() == PurchaseOrderStatus.DRAFT)
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public PurchaseOrderResponse markSent(UUID purchaseOrderId) {
        PurchaseOrder po = purchaseOrderRepository.findById(purchaseOrderId)
            .orElseThrow(() -> new ResourceNotFoundException("Purchase order not found: " + purchaseOrderId));
        po.setStatus(PurchaseOrderStatus.SENT);
        return toResponse(purchaseOrderRepository.save(po));
    }

    private PurchaseOrderResponse toResponse(PurchaseOrder po) {
        List<PurchaseOrderItemResponse> items = purchaseOrderItemRepository.findByPurchaseOrderId(po.getId()).stream()
            .map(i -> {
                ProductVariant v = i.getProductVariantId() == null ? null : variantRepository.findById(i.getProductVariantId()).orElse(null);
                return new PurchaseOrderItemResponse(i.getId(), i.getProductVariantId(), v == null ? "?" : v.getSku(),
                    i.getQuantity(), i.getUnitCost());
            })
            .toList();
        String supplierName = supplierRepository.findById(po.getSupplierId()).map(Supplier -> Supplier.getName()).orElse("(unknown)");
        return new PurchaseOrderResponse(po.getId(), po.getSupplierId(), supplierName, po.getStatus().name(), po.getCreatedAt(), items);
    }
}
