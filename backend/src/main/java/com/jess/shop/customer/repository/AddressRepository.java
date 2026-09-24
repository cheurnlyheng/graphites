package com.jess.shop.customer.repository;

import com.jess.shop.customer.entity.Address;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AddressRepository extends JpaRepository<Address, UUID> {
    List<Address> findByCustomerId(UUID customerId);
}
