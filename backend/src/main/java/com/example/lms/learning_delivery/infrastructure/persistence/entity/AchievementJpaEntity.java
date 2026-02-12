package com.example.lms.learning_delivery.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "achievements")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AchievementJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 100)
    private String icon;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false)
    @Builder.Default
    private Integer threshold = 1;
}
