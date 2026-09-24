package com.jess.shop.shipping.service;

import com.jess.shop.shipping.dto.ShippoDtos.*;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

/** Thin client over Shippo's REST API (no official Java SDK exists). */
@Service
public class ShippoService {

    private final WebClient shippoWebClient;

    public ShippoService(WebClient shippoWebClient) {
        this.shippoWebClient = shippoWebClient;
    }

    public ShipmentResponse getRates(AddressPayload from, AddressPayload to, ParcelPayload parcel) {
        CreateShipmentRequest request = new CreateShipmentRequest(from, to, List.of(parcel), false);
        return shippoWebClient.post()
            .uri("/shipments/")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(ShipmentResponse.class)
            .block();
    }

    public TransactionResponse buyLabel(String rateObjectId) {
        CreateTransactionRequest request = new CreateTransactionRequest(rateObjectId, "PDF", false);
        return shippoWebClient.post()
            .uri("/transactions/")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(TransactionResponse.class)
            .block();
    }

    public AddressValidationResponse validateAddress(AddressPayload address) {
        return shippoWebClient.post()
            .uri("/addresses/")
            .bodyValue(new ValidateAddressRequest(address, true))
            .retrieve()
            .bodyToMono(AddressValidationResponse.class)
            .block();
    }
}
