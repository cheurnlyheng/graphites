package com.jess.shop.catalog.service;

import com.jess.shop.catalog.entity.Product;
import com.jess.shop.catalog.entity.ProductVariant;
import com.jess.shop.catalog.repository.ProductRepository;
import com.jess.shop.catalog.repository.ProductVariantRepository;
import com.jess.shop.notification.service.EmailService;
import com.jess.shop.notification.service.EmailService.LowStockItem;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/** Replaces the old suppliers/purchase-order module -- Jess restocks outside the app, so all this
 * needs to do is notice a variant has dropped low and point her at it. See ProductService.listLowStock
 * for the admin Restock page's live list, and ProductVariant.lowStockAlertSent for why this doesn't
 * re-email the same dip every hour it stays low. */
@Service
public class LowStockAlertService {

    private final ProductVariantRepository variantRepository;
    private final ProductRepository productRepository;
    private final EmailService emailService;

    public LowStockAlertService(ProductVariantRepository variantRepository, ProductRepository productRepository,
                                 EmailService emailService) {
        this.variantRepository = variantRepository;
        this.productRepository = productRepository;
        this.emailService = emailService;
    }

    @Scheduled(fixedRate = 60 * 60 * 1000)
    @Transactional
    public void checkAndAlert() {
        List<ProductVariant> newlyLow = variantRepository.findNewlyLowStockVariants();
        if (newlyLow.isEmpty()) {
            return;
        }

        Map<UUID, Product> productsById = productRepository.findAllById(
            newlyLow.stream().map(ProductVariant::getProductId).distinct().toList()
        ).stream().collect(Collectors.toMap(Product::getId, p -> p));

        List<LowStockItem> items = newlyLow.stream()
            .map(v -> {
                Product p = productsById.get(v.getProductId());
                return new LowStockItem(v.getProductId(), p == null ? "(unknown)" : p.getName(), v.getSku(),
                    describeVariant(v), v.getStockQty(), v.getLowStockThreshold());
            })
            .toList();

        emailService.sendLowStockAlert(items);
        newlyLow.forEach(v -> v.setLowStockAlertSent(true));
        variantRepository.saveAll(newlyLow);
    }

    private static String describeVariant(ProductVariant v) {
        if (v.getSize() == null && v.getColor() == null) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        if (v.getSize() != null) {
            sb.append("Size ").append(v.getSize());
        }
        if (v.getColor() != null) {
            if (sb.length() > 0) sb.append(" / ");
            sb.append(v.getColor());
        }
        return sb.toString();
    }
}
