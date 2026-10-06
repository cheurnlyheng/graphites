package com.jess.shop.common.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;

/** Fires one harmless, response-ignored request to each external API at boot, on a background
 * thread, so the first real TLS handshake + connection-pool setup for that host happens during
 * deploy (where a slow/costly first hit is invisible to customers and Railway's own startup grace
 * period absorbs it) instead of on a live customer's checkout click -- which is exactly when the
 * Shippo rate lookup was seen to coincide with Railway reporting the container ran out of memory.
 * Best-effort only: any failure here is logged and swallowed, never allowed to affect startup or
 * a real request later. */
@Component
public class ExternalClientWarmupRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ExternalClientWarmupRunner.class);

    private final WebClient shippoWebClient;
    private final WebClient resendWebClient;

    public ExternalClientWarmupRunner(WebClient shippoWebClient, WebClient resendWebClient) {
        this.shippoWebClient = shippoWebClient;
        this.resendWebClient = resendWebClient;
    }

    @Override
    public void run(ApplicationArguments args) {
        warmUp(shippoWebClient, "Shippo");
        warmUp(resendWebClient, "Resend");
    }

    private void warmUp(WebClient client, String name) {
        client.get().uri("/")
            .retrieve()
            .toBodilessEntity()
            .timeout(Duration.ofSeconds(20))
            .doOnError(e -> log.info("{} warm-up request finished with {} (expected -- only the connection setup matters)",
                name, e.toString()))
            .onErrorResume(e -> Mono.empty())
            .subscribe();
    }
}
