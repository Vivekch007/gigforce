package com.gigforce;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
@org.springframework.scheduling.annotation.EnableScheduling
public class GigForceApplication {
    public static void main(String[] args) {
        SpringApplication.run(GigForceApplication.class, args);
    }
}
