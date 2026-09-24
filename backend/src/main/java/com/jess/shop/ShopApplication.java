package com.jess.shop;

import me.paulschwarz.springdotenv.spring.DotenvApplicationInitializer;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ShopApplication {

    public static void main(String[] args) {
        // spring-dotenv does not auto-register itself (no spring.factories/.imports in the jar) --
        // it must be added as an ApplicationContextInitializer explicitly, or backend/.env is
        // silently ignored and every ${VAR:default} placeholder falls back to its literal default.
        new SpringApplicationBuilder(ShopApplication.class)
            .initializers(new DotenvApplicationInitializer())
            .run(args);
    }
}
