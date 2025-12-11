package com.example.lms.service;

import com.example.lms.entity.Category;
import com.example.lms.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CategoryService {
    private final CategoryRepository categoryRepository;

    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }
    
    // Helper to create basic categories if empty (Seeding)
    public void seedCategories() {
        if (categoryRepository.count() == 0) {
            categoryRepository.save(Category.builder().code("DEV").name("Development").build());
            categoryRepository.save(Category.builder().code("IT").name("IT & Software").build());
            categoryRepository.save(Category.builder().code("BIZ").name("Business").build());
            categoryRepository.save(Category.builder().code("DES").name("Design").build());
        }
    }
}
