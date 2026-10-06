package com.jess.shop.shipping.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Configuration
public class ShippoConfig {

    @Value("${shippo.base-url}")
    private String baseUrl;

    @Value("${shippo.api-token}")
    private String apiToken;

    @Bean
    public WebClient shippoWebClient() {
        // Without a timeout, a slow/hanging Shippo API leaves the calling thread (and its
        // connection) parked on .block() indefinitely -- a couple of those piling up is enough
        // to start starving the container on a small Railway instance.
        HttpClient httpClient = HttpClient.create()
            .responseTimeout(Duration.ofSeconds(15));
        return WebClient.builder()
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .baseUrl(baseUrl)
            .defaultHeader("Authorization", "ShippoToken " + apiToken)
            .defaultHeader("Content-Type", "application/json")
            .build();
    }
}
