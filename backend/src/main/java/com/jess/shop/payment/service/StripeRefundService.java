package com.jess.shop.payment.service;

import com.stripe.exception.StripeException;
import com.stripe.model.Refund;
import com.stripe.param.RefundCreateParams;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class StripeRefundService {

    public Refund refund(String paymentIntentId, BigDecimal amount) throws StripeException {
        RefundCreateParams.Builder builder = RefundCreateParams.builder().setPaymentIntent(paymentIntentId);
        if (amount != null) {
            builder.setAmount(amount.multiply(BigDecimal.valueOf(100)).longValue());
        }
        return Refund.create(builder.build());
    }
}
