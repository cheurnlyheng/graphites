package com.jess.shop.inventory.service;

import com.jess.shop.common.exception.ResourceNotFoundException;
import com.jess.shop.inventory.dto.InventoryDtos.*;
import com.jess.shop.inventory.entity.ProductSupplier;
import com.jess.shop.inventory.entity.Supplier;
import com.jess.shop.inventory.repository.ProductSupplierRepository;
import com.jess.shop.inventory.repository.SupplierRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final ProductSupplierRepository productSupplierRepository;

    public SupplierService(SupplierRepository supplierRepository, ProductSupplierRepository productSupplierRepository) {
        this.supplierRepository = supplierRepository;
        this.productSupplierRepository = productSupplierRepository;
    }

    public List<SupplierResponse> listAll() {
        return supplierRepository.findAll().stream().map(this::toResponse).toList();
    }

    public SupplierResponse create(CreateSupplierRequest request) {
        Supplier supplier = Supplier.builder()
            .name(request.name())
            .contactEmail(request.contactEmail())
            .phone(request.phone())
            .notes(request.notes())
            .build();
        return toResponse(supplierRepository.save(supplier));
    }

    public void linkToVariant(UUID variantId, LinkSupplierRequest request) {
        if (!supplierRepository.existsById(request.supplierId())) {
            throw new ResourceNotFoundException("Supplier not found: " + request.supplierId());
        }
        ProductSupplier link = ProductSupplier.builder()
            .productVariantId(variantId)
            .supplierId(request.supplierId())
            .costPrice(request.costPrice())
            .reorderQty(request.reorderQty() == null ? 0 : request.reorderQty())
            .build();
        productSupplierRepository.save(link);
    }

    private SupplierResponse toResponse(Supplier s) {
        return new SupplierResponse(s.getId(), s.getName(), s.getContactEmail(), s.getPhone(), s.getNotes());
    }
}
