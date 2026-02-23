package com.example.lms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class BackendLmsPostgresApplication {
    public static void main(String[] args) {
        SpringApplication.run(BackendLmsPostgresApplication.class, args);
    }
}
