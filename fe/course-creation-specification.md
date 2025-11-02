{
  "title": "LMS Maritime - Course Creation Functionality Specification",
  "version": "2.0",
  "created": "2025-01-09",
  "author": "Frontend Team",
  "description": "Chi tiết chức năng tạo khóa học cho hệ thống LMS Maritime",

  "overview": {
    "purpose": "Định nghĩa chi tiết chức năng tạo khóa học từ phía frontend",
    "scope": "Bao gồm 2 implementation: Simple version và Enhanced version",
    "target_audience": ["Backend Team", "Frontend Team", "QA Team", "Product Team"]
  },

  "implementations": {
    "simple_version": {
      "component_path": "src/app/features/teacher/courses/course-creation.component.ts",
      "description": "Version đơn giản với form cơ bản",
      "features": [
        "Tạo khóa học với thông tin cơ bản",
        "Template từ khóa học hiện có",
        "Pagination cho danh sách khóa học",
        "Validation cơ bản"
      ]
    },
    "enhanced_version": {
      "component_path": "src/app/features/thamkhao/courses/course-creation.component.ts",
      "description": "Version nâng cao với đầy đủ tính năng maritime",
      "features": [
        "Form chi tiết với nhiều trường",
        "Upload thumbnail và tài liệu",
        "Categories chuyên biệt cho maritime",
        "Certificate types",
        "Skills và prerequisites",
        "Loading states và error handling"
      ]
    }
  },

  "data_structures": {

    "simple_course_request": {
      "interface": "CreateCourseRequest",
      "file": "src/app/api/types/course.types.ts",
      "fields": {
        "code": {
          "type": "string",
          "required": true,
          "maxLength": 64,
          "description": "Mã định danh duy nhất của khóa học",
          "example": "ME101"
        },
        "title": {
          "type": "string",
          "required": true,
          "maxLength": 255,
          "description": "Tên đầy đủ của khóa học",
          "example": "Kỹ thuật Tàu biển Cơ bản"
        },
        "description": {
          "type": "string",
          "required": false,
          "description": "Mô tả chi tiết về khóa học",
          "example": "Khóa học cung cấp kiến thức cơ bản về kỹ thuật tàu biển..."
        }
      }
    },

    "enhanced_course_data": {
      "interface": "TeacherCourse",
      "file": "src/app/features/thamkhao/services/teacher.service.ts",
      "fields": {
        "id": {
          "type": "string",
          "required": true,
          "description": "UUID duy nhất của khóa học",
          "auto_generated": true
        },
        "title": {
          "type": "string",
          "required": true,
          "minLength": 5,
          "description": "Tên khóa học",
          "example": "Kỹ thuật Tàu biển Cơ bản"
        },
        "shortDescription": {
          "type": "string",
          "required": true,
          "maxLength": 200,
          "description": "Mô tả ngắn gọn",
          "example": "Kiến thức cơ bản về kỹ thuật tàu biển"
        },
        "description": {
          "type": "string",
          "required": true,
          "minLength": 50,
          "description": "Mô tả chi tiết về khóa học",
          "example": "Khóa học cung cấp kiến thức cơ bản về kỹ thuật tàu biển, bao gồm cấu trúc tàu, hệ thống động cơ..."
        },
        "category": {
          "type": "string",
          "required": true,
          "enum": ["safety", "navigation", "engineering", "logistics", "law", "certificates"],
          "description": "Danh mục chuyên ngành hàng hải",
          "options": {
            "safety": "An toàn Hàng hải",
            "navigation": "Điều khiển Tàu",
            "engineering": "Kỹ thuật Tàu biển",
            "logistics": "Quản lý Cảng",
            "law": "Luật Hàng hải",
            "certificates": "Chứng chỉ Chuyên môn"
          }
        },
        "level": {
          "type": "enum",
          "required": true,
          "values": ["beginner", "intermediate", "advanced"],
          "description": "Cấp độ khó của khóa học",
          "options": {
            "beginner": "Cơ bản",
            "intermediate": "Trung cấp",
            "advanced": "Nâng cao"
          }
        },
        "duration": {
          "type": "string",
          "required": true,
          "description": "Thời lượng học",
          "example": "40 giờ, 8 tuần"
        },
        "price": {
          "type": "number",
          "required": true,
          "min": 0,
          "description": "Giá khóa học (VNĐ)",
          "example": 2500000
        },
        "modules": {
          "type": "number",
          "required": false,
          "min": 1,
          "default": 1,
          "description": "Số module trong khóa học"
        },
        "lessons": {
          "type": "number",
          "required": false,
          "min": 1,
          "default": 1,
          "description": "Số bài học trong khóa học"
        },
        "skills": {
          "type": "string[]",
          "required": false,
          "description": "Danh sách kỹ năng học được (mỗi skill trên 1 dòng)",
          "example": ["Hiểu biết về cấu trúc tàu", "Vận hành hệ thống động cơ"]
        },
        "prerequisites": {
          "type": "string[]",
          "required": false,
          "description": "Yêu cầu tiên quyết (mỗi yêu cầu trên 1 dòng)",
          "example": ["Kiến thức vật lý cơ bản", "Hiểu biết về toán học"]
        },
        "certificate": {
          "type": "object",
          "required": true,
          "properties": {
            "type": {
              "type": "enum",
              "required": true,
              "values": ["STCW", "IMO", "Professional", "Completion"],
              "description": "Loại chứng chỉ",
              "options": {
                "STCW": "STCW (Standards of Training, Certification and Watchkeeping)",
                "IMO": "IMO (International Maritime Organization)",
                "Professional": "Chứng chỉ Chuyên nghiệp",
                "Completion": "Chứng chỉ Hoàn thành"
              }
            },
            "description": {
              "type": "string",
              "required": false,
              "description": "Mô tả về chứng chỉ"
            }
          }
        },
        "thumbnail": {
          "type": "string",
          "required": false,
          "description": "URL hình ảnh thumbnail",
          "default": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop"
        },
        "status": {
          "type": "enum",
          "required": false,
          "default": "draft",
          "values": ["draft", "active", "completed", "archived"],
          "description": "Trạng thái khóa học"
        },
        "createdAt": {
          "type": "Date",
          "required": false,
          "auto_generated": true,
          "description": "Ngày tạo"
        },
        "updatedAt": {
          "type": "Date",
          "required": false,
          "auto_generated": true,
          "description": "Ngày cập nhật cuối"
        }
      }
    }
  },

  "api_endpoints": {
    "create_course_simple": {
      "method": "POST",
      "endpoint": "/api/courses",
      "description": "Tạo khóa học (version đơn giản)",
      "request_body": {
        "type": "CreateCourseRequest",
        "example": {
          "code": "ME101",
          "title": "Kỹ thuật Tàu biển Cơ bản",
          "description": "Khóa học cung cấp kiến thức cơ bản về kỹ thuật tàu biển"
        }
      },
      "response": {
        "success": {
          "status": 201,
          "body": {
            "success": true,
            "data": {
              "id": "course_123",
              "code": "ME101",
              "title": "Kỹ thuật Tàu biển Cơ bản",
              "description": "Khóa học cung cấp kiến thức cơ bản về kỹ thuật tàu biển",
              "status": "draft",
              "teacherId": "teacher_456",
              "createdAt": "2025-01-09T16:30:00Z"
            }
          }
        },
        "error": {
          "status": 400,
          "body": {
            "success": false,
            "message": "Validation failed",
            "errors": [
              {
                "field": "code",
                "message": "Mã khóa học đã tồn tại"
              }
            ]
          }
        }
      }
    },

    "create_course_enhanced": {
      "method": "POST",
      "endpoint": "/api/teacher/courses",
      "description": "Tạo khóa học (version nâng cao)",
      "request_body": {
        "type": "TeacherCourse",
        "example": {
          "title": "Kỹ thuật Tàu biển Cơ bản",
          "shortDescription": "Kiến thức cơ bản về kỹ thuật tàu biển",
          "description": "Khóa học cung cấp kiến thức cơ bản về kỹ thuật tàu biển, bao gồm cấu trúc tàu, hệ thống động cơ...",
          "category": "engineering",
          "level": "beginner",
          "duration": "40 giờ",
          "price": 2500000,
          "modules": 6,
          "lessons": 24,
          "skills": ["Hiểu biết về cấu trúc tàu", "Vận hành hệ thống động cơ"],
          "prerequisites": ["Kiến thức vật lý cơ bản"],
          "certificate": {
            "type": "STCW",
            "description": "Chứng chỉ STCW về kỹ thuật tàu biển"
          },
          "thumbnail": "https://example.com/thumbnail.jpg"
        }
      },
      "response": {
        "success": {
          "status": 201,
          "body": {
            "success": true,
            "data": {
              "id": "course_123",
              "title": "Kỹ thuật Tàu biển Cơ bản",
              "status": "draft",
              "createdAt": "2025-01-09T16:30:00Z",
              "updatedAt": "2025-01-09T16:30:00Z"
            }
          }
        }
      }
    },

    "upload_thumbnail": {
      "method": "POST",
      "endpoint": "/api/upload/thumbnail",
      "description": "Upload hình ảnh thumbnail cho khóa học",
      "content_type": "multipart/form-data",
      "parameters": {
        "file": {
          "type": "file",
          "required": true,
          "accepted_types": ["image/jpeg", "image/jpg", "image/png", "image/gif"],
          "max_size": "10MB"
        },
        "category": {
          "type": "string",
          "required": true,
          "value": "image"
        }
      },
      "response": {
        "success": {
          "status": 200,
          "body": {
            "fileName": "thumbnail.jpg",
            "originalFileName": "my-thumbnail.jpg",
            "fileUrl": "https://cdn.example.com/thumbnails/thumbnail.jpg",
            "fileSize": 2048576,
            "contentType": "image/jpeg",
            "uploadedAt": "2025-01-09T16:30:00Z"
          }
        }
      }
    },

    "upload_course_materials": {
      "method": "POST",
      "endpoint": "/api/upload/course-materials",
      "description": "Upload tài liệu khóa học",
      "content_type": "multipart/form-data",
      "parameters": {
        "files": {
          "type": "file[]",
          "required": true,
          "accepted_types": [
            ".pdf", ".doc", ".docx", ".ppt", ".pptx",
            ".txt", ".mp4", ".avi", ".mov",
            ".jpg", ".jpeg", ".png"
          ],
          "max_size": "100MB per file"
        },
        "category": {
          "type": "string",
          "required": true,
          "value": "course"
        }
      }
    }
  },

  "validation_rules": {
    "frontend_validation": {
      "title": {
        "required": true,
        "minLength": 5,
        "pattern": null
      },
      "shortDescription": {
        "required": true,
        "maxLength": 200
      },
      "description": {
        "required": true,
        "minLength": 50
      },
      "category": {
        "required": true,
        "enum": ["safety", "navigation", "engineering", "logistics", "law", "certificates"]
      },
      "level": {
        "required": true,
        "enum": ["beginner", "intermediate", "advanced"]
      },
      "price": {
        "required": true,
        "min": 0,
        "type": "number"
      },
      "certificateType": {
        "required": true,
        "enum": ["STCW", "IMO", "Professional", "Completion"]
      }
    },

    "backend_validation": {
      "required_fields": ["title", "shortDescription", "description", "category", "level", "price", "certificate.type"],
      "field_constraints": {
        "title": "max 255 characters",
        "shortDescription": "max 200 characters",
        "description": "min 50 characters",
        "price": "positive number",
        "modules": "min 1",
        "lessons": "min 1"
      },
      "business_rules": [
        "Course code must be unique",
        "Teacher can only create courses for their own account",
        "Price must be in VND and reasonable range",
        "Certificate type must match maritime standards"
      ]
    }
  },

  "user_flows": {
    "simple_creation_flow": [
      "Navigate to course creation page",
      "Fill basic information (code, title, description)",
      "Submit form",
      "Redirect to course editor page",
      "Show success message"
    ],

    "enhanced_creation_flow": [
      "Navigate to course creation page",
      "Fill basic information section",
      "Fill detailed information section",
      "Configure certificate information",
      "Upload thumbnail image",
      "Upload course materials (optional)",
      "Submit form with loading state",
      "Show success message and redirect to courses list"
    ],

    "template_usage_flow": [
      "View existing courses list",
      "Click 'Dùng làm mẫu' on any course",
      "Form auto-fills with selected course data",
      "Modify as needed",
      "Submit to create new course"
    ]
  },

  "error_handling": {
    "frontend_errors": {
      "validation_errors": {
        "display": "Inline validation messages",
        "fields": ["title", "shortDescription", "description", "category", "level", "price", "certificateType"],
        "styling": "Red border and text"
      },
      "api_errors": {
        "network_error": "Show generic error message",
        "server_error": "Show server error message",
        "validation_error": "Show field-specific error messages"
      }
    },

    "backend_error_responses": {
      "400_bad_request": {
        "description": "Validation failed",
        "example": {
          "success": false,
          "message": "Validation failed",
          "errors": [
            {
              "field": "code",
              "message": "Course code already exists"
            }
          ]
        }
      },
      "401_unauthorized": {
        "description": "User not authenticated",
        "example": {
          "success": false,
          "message": "Authentication required"
        }
      },
      "403_forbidden": {
        "description": "User not authorized to create courses",
        "example": {
          "success": false,
          "message": "Insufficient permissions"
        }
      },
      "500_internal_error": {
        "description": "Server error",
        "example": {
          "success": false,
          "message": "Internal server error"
        }
      }
    }
  },

  "ui_components": {
    "form_sections": {
      "basic_information": {
        "title": "Thông tin cơ bản",
        "icon": "ℹ️",
        "fields": ["title", "shortDescription", "category", "level", "duration", "price"]
      },
      "detailed_information": {
        "title": "Thông tin chi tiết",
        "icon": "📝",
        "fields": ["description", "modules", "lessons", "skills", "prerequisites"]
      },
      "certificate_information": {
        "title": "Thông tin chứng chỉ",
        "icon": "🏆",
        "fields": ["certificateType", "certificateDescription"]
      },
      "media_uploads": {
        "thumbnail": {
          "title": "Hình ảnh khóa học",
          "icon": "🖼️",
          "max_size": "10MB",
          "accepted_types": ["image/jpeg", "image/jpg", "image/png", "image/gif"]
        },
        "materials": {
          "title": "Tài liệu khóa học",
          "icon": "📎",
          "max_size": "100MB per file",
          "accepted_types": [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".txt", ".mp4", ".avi", ".mov", ".jpg", ".jpeg", ".png"]
        }
      }
    },

    "interactive_elements": {
      "submit_button": {
        "states": ["normal", "loading", "disabled"],
        "loading_text": "Đang tạo...",
        "normal_text": "Tạo khóa học"
      },
      "cancel_button": {
        "text": "Hủy",
        "action": "Navigate back to courses list"
      },
      "template_button": {
        "text": "Dùng làm mẫu",
        "action": "Prefill form with selected course data"
      }
    }
  },

  "testing_requirements": {
    "unit_tests": {
      "component_tests": [
        "Form validation for all fields",
        "Submit functionality",
        "Error handling",
        "Loading states",
        "File upload handling"
      ],
      "service_tests": [
        "API calls for course creation",
        "Error response handling",
        "Data transformation"
      ]
    },

    "integration_tests": {
      "api_integration": [
        "Successful course creation",
        "Validation error handling",
        "File upload integration",
        "Redirect after creation"
      ],
      "ui_integration": [
        "Form field interactions",
        "File upload UI",
        "Loading states",
        "Error message display"
      ]
    },

    "e2e_tests": {
      "user_scenarios": [
        "Complete course creation flow",
        "Template usage flow",
        "Error scenarios",
        "File upload scenarios"
      ]
    }
  },

  "performance_requirements": {
    "response_times": {
      "form_validation": "< 100ms",
      "api_submission": "< 3 seconds",
      "file_upload": "< 10 seconds for 10MB file"
    },
    "bundle_size": {
      "main_chunk": "< 500KB",
      "lazy_chunk": "< 200KB"
    }
  },

  "accessibility_requirements": {
    "wcag_compliance": "Level AA",
    "keyboard_navigation": "Full support",
    "screen_reader_support": "Proper labels and descriptions",
    "color_contrast": "Minimum 4.5:1 ratio"
  },

  "internationalization": {
    "supported_languages": ["vi", "en"],
    "text_keys": [
      "course.creation.title",
      "course.creation.basic.info",
      "course.creation.detailed.info",
      "course.creation.certificate.info",
      "course.creation.submit",
      "course.creation.cancel"
    ]
  },

  "future_enhancements": {
    "planned_features": [
      "Course preview before publishing",
      "Bulk course creation",
      "Course templates library",
      "AI-powered content suggestions",
      "Advanced pricing models",
      "Course versioning"
    ]
  },

  "dependencies": {
    "angular_version": "20.3.0",
    "key_dependencies": [
      "@angular/forms",
      "@angular/router",
      "@angular/common",
      "rxjs"
    ],
    "custom_services": [
      "CourseApi",
      "TeacherService",
      "ErrorHandlingService",
      "FileUploadService"
    ]
  },

  "deployment_notes": {
    "environment_variables": [
      "API_BASE_URL",
      "FILE_UPLOAD_URL",
      "MAX_FILE_SIZE"
    ],
    "feature_flags": [
      "ENABLE_ENHANCED_COURSE_CREATION",
      "ENABLE_FILE_UPLOAD",
      "ENABLE_COURSE_TEMPLATES"
    ]
  }
}