package com.jess.shop.catalog.repository;

import com.jess.shop.catalog.entity.Product;
import com.jess.shop.catalog.entity.ProductVariant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/** Proves the oversell guard documented on ProductVariantRepository.decrementStock actually holds
 * under real concurrent access -- a unit test with mocks can assert the SQL looks right, but only a
 * real database can prove two simultaneous checkouts for the last unit can't both "win". Runs
 * against a real, disposable Postgres via Testcontainers (requires Docker locally, same as
 * docker-compose.yml already does for dev). */
@SpringBootTest(properties = "app.jwt.secret=test-only-secret-do-not-use-in-production-xxxxx")
@Testcontainers
class ProductVariantRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private ProductVariantRepository variantRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private PlatformTransactionManager transactionManager;

    /** decrementStock is a @Modifying query -- it requires an active transaction to execute at all,
     * which production code gets for free from OrderService.markPaid's own @Transactional. A bare
     * test method (or a raw worker thread) has no such transaction, so each call here gets its own,
     * same as each real checkout's markPaid call does. */
    private int decrementInOwnTransaction(UUID variantId, int qty) {
        return new TransactionTemplate(transactionManager).execute(status -> variantRepository.decrementStock(variantId, qty));
    }

    @Test
    void concurrentCheckoutsForTheLastUnitNeverOversell() throws InterruptedException {
        Product product = productRepository.save(Product.builder()
            .name("Concurrency Test Shirt")
            .slug("concurrency-test-shirt-" + UUID.randomUUID())
            .price(BigDecimal.valueOf(25))
            .build());
        ProductVariant variant = variantRepository.save(ProductVariant.builder()
            .productId(product.getId())
            .sku("CONCURRENCY-TEST-" + UUID.randomUUID())
            .stockQty(1)
            .build());
        UUID variantId = variant.getId();

        int attempts = 5;
        ExecutorService pool = Executors.newFixedThreadPool(attempts);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneGate = new CountDownLatch(attempts);
        AtomicInteger successCount = new AtomicInteger(0);

        for (int i = 0; i < attempts; i++) {
            pool.submit(() -> {
                try {
                    startGate.await();
                    int updated = decrementInOwnTransaction(variantId, 1);
                    if (updated > 0) successCount.incrementAndGet();
                } catch (InterruptedException ignored) {
                } finally {
                    doneGate.countDown();
                }
            });
        }
        startGate.countDown(); // release all threads at once to actually race
        doneGate.await();
        pool.shutdown();

        assertThat(successCount.get()).isEqualTo(1);
        ProductVariant reloaded = variantRepository.findById(variantId).orElseThrow();
        assertThat(reloaded.getStockQty()).isEqualTo(0);
    }

    @Test
    void decrementFailsCleanlyWhenNotEnoughStock() {
        Product product = productRepository.save(Product.builder()
            .name("Low Stock Test Shirt")
            .slug("low-stock-test-shirt-" + UUID.randomUUID())
            .price(BigDecimal.valueOf(25))
            .build());
        ProductVariant variant = variantRepository.save(ProductVariant.builder()
            .productId(product.getId())
            .sku("LOW-STOCK-TEST-" + UUID.randomUUID())
            .stockQty(2)
            .build());

        int updated = decrementInOwnTransaction(variant.getId(), 5);

        assertThat(updated).isZero();
        ProductVariant reloaded = variantRepository.findById(variant.getId()).orElseThrow();
        assertThat(reloaded.getStockQty()).isEqualTo(2); // untouched, not driven negative
    }
}
