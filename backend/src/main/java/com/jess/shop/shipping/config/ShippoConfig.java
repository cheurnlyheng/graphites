package com.jess.shop.shipping.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class ShippoConfig {

    @Value("${shippo.base-url}")
    private String baseUrl;

    @Value("${shippo.api-token}")
    private String apiToken;

    @Bean
    public WebClient shippoWebClient() {
        return WebClient.builder()
            .baseUrl(baseUrl)
            .defaultHeader("Authorization", "ShippoToken " + apiToken)
            .defaultHeader("Content-Type", "application/json")
            .build();
    }
}
