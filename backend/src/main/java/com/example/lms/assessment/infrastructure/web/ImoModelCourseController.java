package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.domain.model.ImoModelCourse;
import com.example.lms.assessment.domain.repository.ImoModelCourseRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v3/imo-model-courses")
@RequiredArgsConstructor
@Tag(name = "IMO Model Courses", description = "IMO Model Course reference catalog for question classification")
public class ImoModelCourseController {

    private final ImoModelCourseRepository repository;

    @GetMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "List all active IMO Model Courses grouped by category")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getImoModelCourses() {
        List<ImoModelCourse> courses = repository.findAllActive();

        List<Map<String, Object>> flat = courses.stream()
                .map(this::toCourseMap)
                .toList();

        Map<String, List<Map<String, Object>>> grouped = courses.stream()
                .collect(Collectors.groupingBy(
                        ImoModelCourse::getCategory,
                        LinkedHashMap::new,
                        Collectors.mapping(this::toCourseMap, Collectors.toList())
                ));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("data", flat);
        result.put("grouped", grouped);

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    private Map<String, Object> toCourseMap(ImoModelCourse c) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", c.getId());
        map.put("code", c.getCode());
        map.put("title", c.getTitle());
        map.put("category", c.getCategory());
        return map;
    }
}
