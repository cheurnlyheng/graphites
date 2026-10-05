package com.jess.shop.shipping.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonUnwrapped;

import java.util.List;
import java.util.Map;

/** Minimal DTOs for the bits of Shippo's REST API this shop actually uses. Shippo has no official
 * Java SDK, so these are called directly over HTTP -- see ShippoService. */
public class ShippoDtos {

    public record AddressPayload(String name, String street1, String street2, String city, String state,
                                  String zip, String country, String phone, String email) {}

    public record ParcelPayload(String length, String width, String height,
                                 @JsonProperty("distance_unit") String distanceUnit,
                                 String weight, @JsonProperty("mass_unit") String massUnit) {}

    public record CreateShipmentRequest(@JsonProperty("address_from") AddressPayload addressFrom,
                                         @JsonProperty("address_to") AddressPayload addressTo,
                                         List<ParcelPayload> parcels, boolean async) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RateResponse(@JsonProperty("object_id") String objectId, String amount, String currency,
                                String provider, @JsonProperty("servicelevel") Map<String, Object> serviceLevel,
                                @JsonProperty("estimated_days") Integer estimatedDays) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ShipmentResponse(@JsonProperty("object_id") String objectId, List<RateResponse> rates) {}

    public record CreateTransactionRequest(String rate, @JsonProperty("label_file_type") String labelFileType, boolean async) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TransactionResponse(@JsonProperty("object_id") String objectId, String status,
                                       @JsonProperty("tracking_number") String trackingNumber,
                                       @JsonProperty("tracking_url_provider") String trackingUrlProvider,
                                       @JsonProperty("label_url") String labelUrl,
                                       List<TransactionMessage> messages) {}

    /** Shippo returns the actual reason a label purchase failed (bad address, carrier account not
     * activated, etc.) here -- without reading this, a failed purchase just looks like an opaque
     * "status: ERROR" with no explanation of what to do about it. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TransactionMessage(String source, String code, String text) {}

    public record ValidateAddressRequest(@JsonUnwrapped AddressPayload address, boolean validate) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AddressValidationResponse(@JsonProperty("object_id") String objectId,
                                             @JsonProperty("validation_results") ValidationResults validationResults) {

        @JsonIgnoreProperties(ignoreUnknown = true)
        public record ValidationResults(@JsonProperty("is_valid") boolean isValid, List<ValidationMessage> messages) {}

        @JsonIgnoreProperties(ignoreUnknown = true)
        public record ValidationMessage(String text) {}
    }

    /** Body of a Shippo tracking webhook (registered for the track_updated event). Only the fields this
     * shop actually reads are modeled -- see docs.goshippo.com/tracking/webhooks for the full shape. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TrackingWebhookPayload(String event, TrackingData data) {

        @JsonIgnoreProperties(ignoreUnknown = true)
        public record TrackingData(@JsonProperty("tracking_number") String trackingNumber,
                                    @JsonProperty("tracking_status") TrackingStatus trackingStatus) {}

        /** status is one of Shippo's fixed values: UNKNOWN, PRE_TRANSIT, TRANSIT, DELIVERED, RETURNED, FAILURE. */
        @JsonIgnoreProperties(ignoreUnknown = true)
        public record TrackingStatus(String status, @JsonProperty("status_date") String statusDate) {}
    }
}
