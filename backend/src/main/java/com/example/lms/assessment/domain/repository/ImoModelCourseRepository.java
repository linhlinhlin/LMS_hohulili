package com.example.lms.assessment.domain.repository;

import com.example.lms.assessment.domain.model.ImoModelCourse;
import java.util.List;

public interface ImoModelCourseRepository {
    List<ImoModelCourse> findAllActive();
}
