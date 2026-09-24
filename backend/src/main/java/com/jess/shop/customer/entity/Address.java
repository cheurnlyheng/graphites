package com.jess.shop.customer.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "address")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Address {

    @Id
    @GeneratedValue
    private UUID id;

    /** Null for a guest order's one-off address (not tied to a saved customer). */
    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    @Column(nullable = false)
    private String line1;

    private String line2;

    @Column(nullable = false, length = 120)
    private String city;

    @Column(length = 120)
    private String state;

    @Column(name = "postal_code", nullable = false, length = 20)
    private String postalCode;

    /** ISO 3166-1 alpha-2 country code, e.g. "US". */
    @Column(nullable = false, length = 2)
    private String country;

    @Column(length = 30)
    private String phone;

    /** Null = never validated (e.g. a saved address not yet used on an order). Set right when an
     * order's shipping address is captured, via Shippo's address validation API. */
    @Column(name = "address_valid")
    private Boolean addressValid;

    @Column(name = "address_validation_note", length = 500)
    private String addressValidationNote;
}
