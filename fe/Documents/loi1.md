      e1_0.progress,
        e1_0.status,
        e1_0.student_id
    from
        enrollments e1_0
    where
        e1_0.student_id=?
        and e1_0.class_id=?
2025-12-21T18:55:43.349+07:00 TRACE 28836 --- [backend-lms-postgres] [mcat-handler-20] org.hibernate.orm.jdbc.bind              : binding parameter (1:UUID) <- [f7f1c8d9-23e2-4182-9506-a05a96901946]
2025-12-21T18:55:43.350+07:00 TRACE 28836 --- [backend-lms-postgres] [mcat-handler-20] org.hibernate.orm.jdbc.bind              : binding parameter (2:UUID) <- [156ca87e-d44f-4253-94c1-dd0e06a4e10c]
2025-12-21T18:55:43.424+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-20] o.s.w.s.m.m.a.HttpEntityMethodProcessor  : Using 'application/json', given [application/json, text/plain, */*] and supported [application/json, application/*+json, application/yaml]
2025-12-21T18:55:43.425+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-20] o.s.w.s.m.m.a.HttpEntityMethodProcessor  : Writing [com.example.lms.shared.infrastructure.web.ApiResponse@7d44d980]
2025-12-21T18:55:43.426+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-20] o.s.web.servlet.DispatcherServlet        : Completed 200 OK
JWT FILTER HIT: /api/v3/student/progress/courses/77b89d53-623a-46fa-8cca-7b2fcd5e4676/next-lesson
JWT Token: eyJhbGciOiJIUzM4NCJ9...
2025-12-21T18:57:02.629+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-26] tor$SharedEntityManagerInvocationHandler : Creating new EntityManager for shared EntityManager invocation
2025-12-21T18:57:02.635+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-26] org.hibernate.SQL                        :
    select
        uje1_0.id,
        uje1_0.created_at,
        uje1_0.email,
        uje1_0.enabled,
        uje1_0.full_name,
        uje1_0.password,
        uje1_0.role,
        uje1_0.updated_at,
        uje1_0.username
    from
        users uje1_0
    where
        uje1_0.email=?
Hibernate:
    select
        uje1_0.id,
        uje1_0.created_at,
        uje1_0.email,
        uje1_0.enabled,
        uje1_0.full_name,
        uje1_0.password,
        uje1_0.role,
        uje1_0.updated_at,
        uje1_0.username
    from
        users uje1_0
    where
        uje1_0.email=?
2025-12-21T18:57:02.705+07:00 TRACE 28836 --- [backend-lms-postgres] [mcat-handler-26] org.hibernate.orm.jdbc.bind              : binding parameter (1:VARCHAR) <- [stu12345@gmail.com]       
2025-12-21T18:57:02.779+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-26] o.s.web.servlet.DispatcherServlet        : GET "/api/v3/student/progress/courses/77b89d53-623a-46fa-8cca-7b2fcd5e4676/next-lesson", parameters={}
2025-12-21T18:57:02.780+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-26] s.w.s.m.m.a.RequestMappingHandlerMapping : Mapped to com.example.lms.learning_delivery.infrastructure.web.StudentEnrollmentControllerV3#getNextLesson(UUID)
2025-12-21T18:57:02.783+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-26] tor$SharedEntityManagerInvocationHandler : Creating new EntityManager for shared EntityManager invocation
2025-12-21T18:57:02.784+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-26] org.hibernate.SQL                        :
    select
        lc1_0.id,
        lc1_0.code,
        lc1_0.course_id,
        lc1_0.course_version_id,
        lc1_0.created_at,
        lc1_0.end_date,
        lc1_0.max_students,
        lc1_0.name,
        lc1_0.schedule_type,
        lc1_0.semester,
        lc1_0.start_date,
        lc1_0.status,
        lc1_0.teacher_id,
        lc1_0.updated_at
    from
        learning_classes lc1_0
    where
        lc1_0.course_id=?
Hibernate:
    select
        lc1_0.id,
        lc1_0.code,
        lc1_0.course_id,
        lc1_0.course_version_id,
        lc1_0.created_at,
        lc1_0.end_date,
        lc1_0.max_students,
        lc1_0.name,
        lc1_0.schedule_type,
        lc1_0.semester,
        lc1_0.start_date,
        lc1_0.status,
        lc1_0.teacher_id,
        lc1_0.updated_at
    from
        learning_classes lc1_0
    where
        lc1_0.course_id=?
2025-12-21T18:57:02.785+07:00 TRACE 28836 --- [backend-lms-postgres] [mcat-handler-26] org.hibernate.orm.jdbc.bind              : binding parameter (1:UUID) <- [77b89d53-623a-46fa-8cca-7b2fcd5e4676]
2025-12-21T18:57:02.854+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-26] tor$SharedEntityManagerInvocationHandler : Creating new EntityManager for shared EntityManager invocation
2025-12-21T18:57:02.855+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-26] org.hibernate.SQL                        :
    select
        e1_0.id,
        e1_0.completed_at,
        e1_0.completion_percent,
        e1_0.enrolled_at,
        e1_0.joined_at,
        e1_0.last_accessed_at,
        e1_0.class_id,
        e1_0.progress,
        e1_0.status,
        e1_0.student_id
    from
        enrollments e1_0
    where
        e1_0.student_id=?
        and e1_0.class_id=?
Hibernate:
    select
        e1_0.id,
        e1_0.completed_at,
        e1_0.completion_percent,
        e1_0.enrolled_at,
        e1_0.joined_at,
        e1_0.last_accessed_at,
        e1_0.class_id,
        e1_0.progress,
        e1_0.status,
        e1_0.student_id
    from
        enrollments e1_0
    where
        e1_0.student_id=?
        and e1_0.class_id=?
2025-12-21T18:57:02.855+07:00 TRACE 28836 --- [backend-lms-postgres] [mcat-handler-26] org.hibernate.orm.jdbc.bind              : binding parameter (1:UUID) <- [f7f1c8d9-23e2-4182-9506-a05a96901946]
2025-12-21T18:57:02.855+07:00 TRACE 28836 --- [backend-lms-postgres] [mcat-handler-26] org.hibernate.orm.jdbc.bind              : binding parameter (2:UUID) <- [5cd2061d-3f54-4288-9e0c-7a474d926292]
2025-12-21T18:57:02.925+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-26] tor$SharedEntityManagerInvocationHandler : Creating new EntityManager for shared EntityManager invocation
2025-12-21T18:57:02.926+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-26] org.hibernate.SQL                        :
    select
        e1_0.id,
        e1_0.completed_at,
        e1_0.completion_percent,
        e1_0.enrolled_at,
        e1_0.joined_at,
        e1_0.last_accessed_at,
        e1_0.class_id,
        e1_0.progress,
        e1_0.status,
        e1_0.student_id
    from
        enrollments e1_0
    where
        e1_0.student_id=?
        and e1_0.class_id=?
Hibernate:
    select
        e1_0.id,
        e1_0.completed_at,
        e1_0.completion_percent,
        e1_0.enrolled_at,
        e1_0.joined_at,
        e1_0.last_accessed_at,
        e1_0.class_id,
        e1_0.progress,
        e1_0.status,
        e1_0.student_id
    from
        enrollments e1_0
    where
        e1_0.student_id=?
        and e1_0.class_id=?
2025-12-21T18:57:02.926+07:00 TRACE 28836 --- [backend-lms-postgres] [mcat-handler-26] org.hibernate.orm.jdbc.bind              : binding parameter (1:UUID) <- [f7f1c8d9-23e2-4182-9506-a05a96901946]
2025-12-21T18:57:02.928+07:00 TRACE 28836 --- [backend-lms-postgres] [mcat-handler-26] org.hibernate.orm.jdbc.bind              : binding parameter (2:UUID) <- [156ca87e-d44f-4253-94c1-dd0e06a4e10c]
2025-12-21T18:57:02.996+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-26] o.s.w.s.m.m.a.HttpEntityMethodProcessor  : Using 'application/json', given [application/json, text/plain, */*] and supported [application/json, application/*+json, application/yaml]
2025-12-21T18:57:02.996+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-26] o.s.w.s.m.m.a.HttpEntityMethodProcessor  : Writing [com.example.lms.shared.infrastructure.web.ApiResponse@7f305e4f]
2025-12-21T18:57:02.998+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-26] o.s.web.servlet.DispatcherServlet        : Completed 200 OK
JWT FILTER HIT: /api/v3/courses/77b89d53-623a-46fa-8cca-7b2fcd5e4676
JWT Token: eyJhbGciOiJIUzM4NCJ9...
JWT FILTER HIT: /api/v3/student/progress/courses/77b89d53-623a-46fa-8cca-7b2fcd5e4676/completed-ids
JWT Token: eyJhbGciOiJIUzM4NCJ9...
JWT FILTER HIT: /api/v3/courses/77b89d53-623a-46fa-8cca-7b2fcd5e4676/content
JWT Token: eyJhbGciOiJIUzM4NCJ9...
2025-12-21T18:57:03.296+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-30] tor$SharedEntityManagerInvocationHandler : Creating new EntityManager for shared EntityManager invocation
2025-12-21T18:57:03.299+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-31] tor$SharedEntityManagerInvocationHandler : Creating new EntityManager for shared EntityManager invocation
2025-12-21T18:57:03.302+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-32] tor$SharedEntityManagerInvocationHandler : Creating new EntityManager for shared EntityManager invocation
2025-12-21T18:57:03.305+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-30] org.hibernate.SQL                        :
    select
        uje1_0.id,
        uje1_0.created_at,
        uje1_0.email,
        uje1_0.enabled,
        uje1_0.full_name,
        uje1_0.password,
        uje1_0.role,
        uje1_0.updated_at,
        uje1_0.username
    from
        users uje1_0
    where
        uje1_0.email=?
Hibernate:
    select
        uje1_0.id,
        uje1_0.created_at,
        uje1_0.email,
        uje1_0.enabled,
        uje1_0.full_name,
        uje1_0.password,
        uje1_0.role,
        uje1_0.updated_at,
        uje1_0.username
    from
        users uje1_0
    where
        uje1_0.email=?
2025-12-21T18:57:03.308+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-31] org.hibernate.SQL                        :
    select
        uje1_0.id,
        uje1_0.created_at,
        uje1_0.email,
        uje1_0.enabled,
        uje1_0.full_name,
        uje1_0.password,
        uje1_0.role,
        uje1_0.updated_at,
        uje1_0.username
    from
        users uje1_0
    where
        uje1_0.email=?
Hibernate:
    select
        uje1_0.id,
        uje1_0.created_at,
        uje1_0.email,
        uje1_0.enabled,
        uje1_0.full_name,
        uje1_0.password,
        uje1_0.role,
        uje1_0.updated_at,
        uje1_0.username
    from
        users uje1_0
    where
        uje1_0.email=?
2025-12-21T18:57:03.309+07:00 TRACE 28836 --- [backend-lms-postgres] [mcat-handler-30] org.hibernate.orm.jdbc.bind              : binding parameter (1:VARCHAR) <- [stu12345@gmail.com]       
2025-12-21T18:57:03.309+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-32] org.hibernate.SQL                        :
    select
        uje1_0.id,
        uje1_0.created_at,
        uje1_0.email,
        uje1_0.enabled,
        uje1_0.full_name,
        uje1_0.password,
        uje1_0.role,
        uje1_0.updated_at,
        uje1_0.username
    from
        users uje1_0
    where
        uje1_0.email=?
Hibernate:
    select
        uje1_0.id,
        uje1_0.created_at,
        uje1_0.email,
        uje1_0.enabled,
        uje1_0.full_name,
        uje1_0.password,
        uje1_0.role,
        uje1_0.updated_at,
        uje1_0.username
    from
        users uje1_0
    where
        uje1_0.email=?
2025-12-21T18:57:03.395+07:00 TRACE 28836 --- [backend-lms-postgres] [mcat-handler-32] org.hibernate.orm.jdbc.bind              : binding parameter (1:VARCHAR) <- [stu12345@gmail.com]       
2025-12-21T18:57:03.398+07:00 TRACE 28836 --- [backend-lms-postgres] [mcat-handler-31] org.hibernate.orm.jdbc.bind              : binding parameter (1:VARCHAR) <- [stu12345@gmail.com]       
2025-12-21T18:57:03.401+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-30] o.s.web.servlet.DispatcherServlet        : GET "/api/v3/courses/77b89d53-623a-46fa-8cca-7b2fcd5e4676", parameters={}
2025-12-21T18:57:03.402+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-30] s.w.s.m.m.a.RequestMappingHandlerMapping : Mapped to com.example.lms.course_authoring.infrastructure.web.CourseQueryControllerV3#getCourseById(UUID)
2025-12-21T18:57:03.402+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-30] o.s.orm.jpa.JpaTransactionManager        : Creating new transaction with name [org.springframework.data.jpa.repository.support.SimpleJpaRepository.findById]: PROPAGATION_REQUIRED,ISOLATION_DEFAULT,readOnly
2025-12-21T18:57:03.404+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-30] o.s.orm.jpa.JpaTransactionManager        : Opened new EntityManager [SessionImpl(600763659<open>)] for JPA transaction
2025-12-21T18:57:03.404+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-30] o.s.orm.jpa.JpaTransactionManager        : Exposing JPA transaction as JDBC [org.springframework.orm.jpa.vendor.HibernateJpaDialect$HibernateConnectionHandle@30b810bd]
2025-12-21T18:57:03.413+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-30] org.hibernate.SQL                        :
    select
        c1_0.id,
        c1_0.benefits,
        c1_0.category_id,
        c1_0.code,
        c1_0.course_information,
        c1_0.created_at,
        c1_0.credits,
        c1_0.description,
        c1_0.intro_video_url,
        c1_0.price,
        c1_0.price_type,
        c1_0.review_comment,
        c1_0.reviewed_at,
        c1_0.reviewed_by_id,
        c1_0.sale_price,
        c1_0.status,
        c1_0.teacher_id,
        c1_0.title,
        c1_0.updated_at,
        c1_0.visibility,
        c1_0.welcome_message
    from
        courses c1_0
    where
        c1_0.id=?
Hibernate:
    select
        c1_0.id,
        c1_0.benefits,
        c1_0.category_id,
        c1_0.code,
        c1_0.course_information,
        c1_0.created_at,
        c1_0.credits,
        c1_0.description,
        c1_0.intro_video_url,
        c1_0.price,
        c1_0.price_type,
        c1_0.review_comment,
        c1_0.reviewed_at,
        c1_0.reviewed_by_id,
        c1_0.sale_price,
        c1_0.status,
        c1_0.teacher_id,
        c1_0.title,
        c1_0.updated_at,
        c1_0.visibility,
        c1_0.welcome_message
    from
        courses c1_0
    where
        c1_0.id=?
2025-12-21T18:57:03.414+07:00 TRACE 28836 --- [backend-lms-postgres] [mcat-handler-30] org.hibernate.orm.jdbc.bind              : binding parameter (1:UUID) <- [77b89d53-623a-46fa-8cca-7b2fcd5e4676]
2025-12-21T18:57:03.464+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-32] o.s.web.servlet.DispatcherServlet        : GET "/api/v3/courses/77b89d53-623a-46fa-8cca-7b2fcd5e4676/content", parameters={}
2025-12-21T18:57:03.465+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-32] s.w.s.m.m.a.RequestMappingHandlerMapping : Mapped to com.example.lms.course_authoring.infrastructure.web.CourseQueryControllerV3#getCourseContent(UUID)
2025-12-21T18:57:03.466+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-31] o.s.web.servlet.DispatcherServlet        : GET "/api/v3/student/progress/courses/77b89d53-623a-46fa-8cca-7b2fcd5e4676/completed-ids", parameters={}
2025-12-21T18:57:03.467+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-31] s.w.s.m.m.a.RequestMappingHandlerMapping : Mapped to com.example.lms.learning_delivery.infrastructure.web.StudentEnrollmentControllerV3#getCompletedLessonIds(UUID)
2025-12-21T18:57:03.467+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-32] tor$SharedEntityManagerInvocationHandler : Creating new EntityManager for shared EntityManager invocation
2025-12-21T18:57:03.468+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-31] tor$SharedEntityManagerInvocationHandler : Creating new EntityManager for shared EntityManager invocation
2025-12-21T18:57:03.470+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-31] org.hibernate.SQL                        :
    select
        lc1_0.id,
        lc1_0.code,
        lc1_0.course_id,
        lc1_0.course_version_id,
        lc1_0.created_at,
        lc1_0.end_date,
        lc1_0.max_students,
        lc1_0.name,
        lc1_0.schedule_type,
        lc1_0.semester,
        lc1_0.start_date,
        lc1_0.status,
        lc1_0.teacher_id,
        lc1_0.updated_at
    from
        learning_classes lc1_0
    where
        lc1_0.course_id=?
Hibernate:
    select
        lc1_0.id,
        lc1_0.code,
        lc1_0.course_id,
        lc1_0.course_version_id,
        lc1_0.created_at,
        lc1_0.end_date,
        lc1_0.max_students,
        lc1_0.name,
        lc1_0.schedule_type,
        lc1_0.semester,
        lc1_0.start_date,
        lc1_0.status,
        lc1_0.teacher_id,
        lc1_0.updated_at
    from
        learning_classes lc1_0
    where
        lc1_0.course_id=?
2025-12-21T18:57:03.471+07:00 TRACE 28836 --- [backend-lms-postgres] [mcat-handler-31] org.hibernate.orm.jdbc.bind              : binding parameter (1:UUID) <- [77b89d53-623a-46fa-8cca-7b2fcd5e4676]
2025-12-21T18:57:03.486+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-30] o.s.orm.jpa.JpaTransactionManager        : Initiating transaction commit
2025-12-21T18:57:03.486+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-30] o.s.orm.jpa.JpaTransactionManager        : Committing JPA transaction on EntityManager [SessionImpl(600763659<open>)]
2025-12-21T18:57:03.487+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-32] org.hibernate.SQL                        :
    select
        c1_0.id,
        c1_0.benefits,
        c1_0.category_id,
        c2_0.course_id,
        c2_0.id,
        c2_0.created_at,
        c2_0.description,
        l1_0.chapter_id,
        l1_0.id,
        l1_0.content,
        l1_0.created_at,
        l1_0.description,
        l1_0.duration_minutes,
        l1_0.is_preview,
        l1_0.is_required,
        l1_0.lesson_type,
        l1_0.order_index,
        l1_0.title,
        l1_0.updated_at,
        l1_0.video_url,
        c2_0.order_index,
        c2_0.title,
        c2_0.updated_at,
        c1_0.code,
        c1_0.course_information,
        c1_0.created_at,
        c1_0.credits,
        c1_0.description,
        c1_0.intro_video_url,
        c1_0.price,
        c1_0.price_type,
        c1_0.review_comment,
        c1_0.reviewed_at,
        c1_0.reviewed_by_id,
        c1_0.sale_price,
        c1_0.status,
        c1_0.teacher_id,
        c1_0.title,
        c1_0.updated_at,
        c1_0.visibility,
        c1_0.welcome_message
    from
        courses c1_0
    left join
        chapters c2_0
            on c1_0.id=c2_0.course_id
    left join
        lessons l1_0
            on c2_0.id=l1_0.chapter_id
    where
        c1_0.id=?
    order by
        c2_0.order_index,
        l1_0.order_index
Hibernate:
    select
        c1_0.id,
        c1_0.benefits,
        c1_0.category_id,
        c2_0.course_id,
        c2_0.id,
        c2_0.created_at,
        c2_0.description,
        l1_0.chapter_id,
        l1_0.id,
        l1_0.content,
        l1_0.created_at,
        l1_0.description,
        l1_0.duration_minutes,
        l1_0.is_preview,
        l1_0.is_required,
        l1_0.lesson_type,
        l1_0.order_index,
        l1_0.title,
        l1_0.updated_at,
        l1_0.video_url,
        c2_0.order_index,
        c2_0.title,
        c2_0.updated_at,
        c1_0.code,
        c1_0.course_information,
        c1_0.created_at,
        c1_0.credits,
        c1_0.description,
        c1_0.intro_video_url,
        c1_0.price,
        c1_0.price_type,
        c1_0.review_comment,
        c1_0.reviewed_at,
        c1_0.reviewed_by_id,
        c1_0.sale_price,
        c1_0.status,
        c1_0.teacher_id,
        c1_0.title,
        c1_0.updated_at,
        c1_0.visibility,
        c1_0.welcome_message
    from
        courses c1_0
    left join
        chapters c2_0
            on c1_0.id=c2_0.course_id
    left join
        lessons l1_0
            on c2_0.id=l1_0.chapter_id
    where
        c1_0.id=?
    order by
        c2_0.order_index,
        l1_0.order_index
2025-12-21T18:57:03.492+07:00 TRACE 28836 --- [backend-lms-postgres] [mcat-handler-32] org.hibernate.orm.jdbc.bind              : binding parameter (1:UUID) <- [77b89d53-623a-46fa-8cca-7b2fcd5e4676]
2025-12-21T18:57:03.538+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-31] tor$SharedEntityManagerInvocationHandler : Creating new EntityManager for shared EntityManager invocation
2025-12-21T18:57:03.539+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-31] org.hibernate.SQL                        :
    select
        e1_0.id,
        e1_0.completed_at,
        e1_0.completion_percent,
        e1_0.enrolled_at,
        e1_0.joined_at,
        e1_0.last_accessed_at,
        e1_0.class_id,
        e1_0.progress,
        e1_0.status,
        e1_0.student_id
    from
        enrollments e1_0
    where
        e1_0.student_id=?
        and e1_0.class_id=?
Hibernate:
    select
        e1_0.id,
        e1_0.completed_at,
        e1_0.completion_percent,
        e1_0.enrolled_at,
        e1_0.joined_at,
        e1_0.last_accessed_at,
        e1_0.class_id,
        e1_0.progress,
        e1_0.status,
        e1_0.student_id
    from
        enrollments e1_0
    where
        e1_0.student_id=?
        and e1_0.class_id=?
2025-12-21T18:57:03.541+07:00 TRACE 28836 --- [backend-lms-postgres] [mcat-handler-31] org.hibernate.orm.jdbc.bind              : binding parameter (1:UUID) <- [f7f1c8d9-23e2-4182-9506-a05a96901946]
2025-12-21T18:57:03.541+07:00 TRACE 28836 --- [backend-lms-postgres] [mcat-handler-31] org.hibernate.orm.jdbc.bind              : binding parameter (2:UUID) <- [5cd2061d-3f54-4288-9e0c-7a474d926292]
2025-12-21T18:57:03.553+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-30] o.s.orm.jpa.JpaTransactionManager        : Closing JPA EntityManager [SessionImpl(600763659<open>)] after transaction
2025-12-21T18:57:03.559+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-30] .m.m.a.ExceptionHandlerExceptionResolver : Using @ExceptionHandler com.example.lms.shared.infrastructure.web.GlobalExceptionHandler#handleGeneral(Exception)
2025-12-21T18:57:03.559+07:00 ERROR 28836 --- [backend-lms-postgres] [mcat-handler-30] c.e.l.s.i.web.GlobalExceptionHandler     : Unexpected error

org.hibernate.LazyInitializationException: failed to lazily initialize a collection of role: com.example.lms.course_authoring.domain.model.Course.chapters: could not initialize proxy - no Session
        at org.hibernate.collection.spi.AbstractPersistentCollection.throwLazyInitializationException(AbstractPersistentCollection.java:635) ~[hibernate-core-6.6.29.Final.jar:6.6.29.Final]  
        at org.hibernate.collection.spi.AbstractPersistentCollection.withTemporarySessionIfNeeded(AbstractPersistentCollection.java:219) ~[hibernate-core-6.6.29.Final.jar:6.6.29.Final]      
        at org.hibernate.collection.spi.AbstractPersistentCollection.readSize(AbstractPersistentCollection.java:150) ~[hibernate-core-6.6.29.Final.jar:6.6.29.Final]
        at org.hibernate.collection.spi.PersistentSet.size(PersistentSet.java:148) ~[hibernate-core-6.6.29.Final.jar:6.6.29.Final]
        at java.base/java.util.Collections$UnmodifiableCollection.size(Collections.java:1066) ~[na:na]
        at com.example.lms.course_authoring.infrastructure.web.CourseQueryControllerV3.toDetail(CourseQueryControllerV3.java:265) ~[classes/:na]
        at com.example.lms.course_authoring.infrastructure.web.CourseQueryControllerV3.lambda$getCourseById$0(CourseQueryControllerV3.java:89) ~[classes/:na]
        at java.base/java.util.Optional.map(Optional.java:260) ~[na:na]
        at com.example.lms.course_authoring.infrastructure.web.CourseQueryControllerV3.getCourseById(CourseQueryControllerV3.java:89) ~[classes/:na]
        at java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:103) ~[na:na]
        at java.base/java.lang.reflect.Method.invoke(Method.java:580) ~[na:na]
        at org.springframework.aop.support.AopUtils.invokeJoinpointUsingReflection(AopUtils.java:360) ~[spring-aop-6.2.11.jar:6.2.11]
        at org.springframework.aop.framework.CglibAopProxy$DynamicAdvisedInterceptor.intercept(CglibAopProxy.java:724) ~[spring-aop-6.2.11.jar:6.2.11]
        at com.example.lms.course_authoring.infrastructure.web.CourseQueryControllerV3$$SpringCGLIB$$0.getCourseById(<generated>) ~[classes/:na]
        at java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:103) ~[na:na]
        at java.base/java.lang.reflect.Method.invoke(Method.java:580) ~[na:na]
        at org.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:258) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.web.method.support.InvocableHandlerMethod.invokeForRequest(InvocableHandlerMethod.java:191) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod.invokeAndHandle(ServletInvocableHandlerMethod.java:118) ~[spring-webmvc-6.2.11.jar:6.2.11]     
        at org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.invokeHandlerMethod(RequestMappingHandlerAdapter.java:991) ~[spring-webmvc-6.2.11.jar:6.2.11]   
        at org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.handleInternal(RequestMappingHandlerAdapter.java:896) ~[spring-webmvc-6.2.11.jar:6.2.11]        
        at org.springframework.web.servlet.mvc.method.AbstractHandlerMethodAdapter.handle(AbstractHandlerMethodAdapter.java:87) ~[spring-webmvc-6.2.11.jar:6.2.11]
        at org.springframework.web.servlet.DispatcherServlet.doDispatch(DispatcherServlet.java:1089) ~[spring-webmvc-6.2.11.jar:6.2.11]
        at org.springframework.web.servlet.DispatcherServlet.doService(DispatcherServlet.java:979) ~[spring-webmvc-6.2.11.jar:6.2.11]
        at org.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:1014) ~[spring-webmvc-6.2.11.jar:6.2.11]
        at org.springframework.web.servlet.FrameworkServlet.doGet(FrameworkServlet.java:903) ~[spring-webmvc-6.2.11.jar:6.2.11]
        at jakarta.servlet.http.HttpServlet.service(HttpServlet.java:564) ~[tomcat-embed-core-10.1.46.jar:6.0]
        at org.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:885) ~[spring-webmvc-6.2.11.jar:6.2.11]
        at jakarta.servlet.http.HttpServlet.service(HttpServlet.java:658) ~[tomcat-embed-core-10.1.46.jar:6.0]
        at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:195) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:140) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.tomcat.websocket.server.WsFilter.doFilter(WsFilter.java:51) ~[tomcat-embed-websocket-10.1.46.jar:10.1.46]
        at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:164) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:140) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:110) ~[spring-web-6.2.11.jar:6.2.11]
        at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:164) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:140) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.springframework.web.filter.CompositeFilter$VirtualFilterChain.doFilter(CompositeFilter.java:108) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.web.filter.CompositeFilter$VirtualFilterChain.doFilter(CompositeFilter.java:108) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.security.web.FilterChainProxy.lambda$doFilterInternal$3(FilterChainProxy.java:231) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.security.web.ObservationFilterChainDecorator$FilterObservation$SimpleFilterObservation.lambda$wrap$1(ObservationFilterChainDecorator.java:490) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.security.web.ObservationFilterChainDecorator$AroundFilterObservation$SimpleAroundFilterObservation.lambda$wrap$1(ObservationFilterChainDecorator.java:351) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.security.web.ObservationFilterChainDecorator.lambda$wrapSecured$0(ObservationFilterChainDecorator.java:83) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.security.web.ObservationFilterChainDecorator$VirtualFilterChain.doFilter(ObservationFilterChainDecorator.java:129) ~[spring-security-web-6.5.5.jar:6.5.5]      
        at org.springframework.security.web.access.intercept.AuthorizationFilter.doFilter(AuthorizationFilter.java:101) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.wrapFilter(ObservationFilterChainDecorator.java:241) ~[spring-security-web-6.5.5.jar:6.5.5]     
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.doFilter(ObservationFilterChainDecorator.java:228) ~[spring-security-web-6.5.5.jar:6.5.5]       
        at org.springframework.security.web.ObservationFilterChainDecorator$VirtualFilterChain.doFilter(ObservationFilterChainDecorator.java:138) ~[spring-security-web-6.5.5.jar:6.5.5]      
        at org.springframework.security.web.access.ExceptionTranslationFilter.doFilter(ExceptionTranslationFilter.java:125) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.security.web.access.ExceptionTranslationFilter.doFilter(ExceptionTranslationFilter.java:119) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.wrapFilter(ObservationFilterChainDecorator.java:241) ~[spring-security-web-6.5.5.jar:6.5.5]     
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.doFilter(ObservationFilterChainDecorator.java:228) ~[spring-security-web-6.5.5.jar:6.5.5]       
        at org.springframework.security.web.ObservationFilterChainDecorator$VirtualFilterChain.doFilter(ObservationFilterChainDecorator.java:138) ~[spring-security-web-6.5.5.jar:6.5.5]      
        at org.springframework.security.web.session.SessionManagementFilter.doFilter(SessionManagementFilter.java:131) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.security.web.session.SessionManagementFilter.doFilter(SessionManagementFilter.java:85) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.wrapFilter(ObservationFilterChainDecorator.java:241) ~[spring-security-web-6.5.5.jar:6.5.5]     
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.doFilter(ObservationFilterChainDecorator.java:228) ~[spring-security-web-6.5.5.jar:6.5.5]       
        at org.springframework.security.web.ObservationFilterChainDecorator$VirtualFilterChain.doFilter(ObservationFilterChainDecorator.java:138) ~[spring-security-web-6.5.5.jar:6.5.5]      
        at org.springframework.security.web.authentication.AnonymousAuthenticationFilter.doFilter(AnonymousAuthenticationFilter.java:100) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.wrapFilter(ObservationFilterChainDecorator.java:241) ~[spring-security-web-6.5.5.jar:6.5.5]     
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.doFilter(ObservationFilterChainDecorator.java:228) ~[spring-security-web-6.5.5.jar:6.5.5]       
        at org.springframework.security.web.ObservationFilterChainDecorator$VirtualFilterChain.doFilter(ObservationFilterChainDecorator.java:138) ~[spring-security-web-6.5.5.jar:6.5.5]      
        at org.springframework.security.web.servletapi.SecurityContextHolderAwareRequestFilter.doFilter(SecurityContextHolderAwareRequestFilter.java:179) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.wrapFilter(ObservationFilterChainDecorator.java:241) ~[spring-security-web-6.5.5.jar:6.5.5]     
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.doFilter(ObservationFilterChainDecorator.java:228) ~[spring-security-web-6.5.5.jar:6.5.5]       
        at org.springframework.security.web.ObservationFilterChainDecorator$VirtualFilterChain.doFilter(ObservationFilterChainDecorator.java:138) ~[spring-security-web-6.5.5.jar:6.5.5]      
        at org.springframework.security.web.savedrequest.RequestCacheAwareFilter.doFilter(RequestCacheAwareFilter.java:63) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.wrapFilter(ObservationFilterChainDecorator.java:241) ~[spring-security-web-6.5.5.jar:6.5.5]     
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.doFilter(ObservationFilterChainDecorator.java:228) ~[spring-security-web-6.5.5.jar:6.5.5]       
        at org.springframework.security.web.ObservationFilterChainDecorator$VirtualFilterChain.doFilter(ObservationFilterChainDecorator.java:138) ~[spring-security-web-6.5.5.jar:6.5.5]      
        at com.example.lms.config.JwtAuthenticationFilter.doFilterInternal(JwtAuthenticationFilter.java:115) ~[classes/:na]
        at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:116) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.wrapFilter(ObservationFilterChainDecorator.java:241) ~[spring-security-web-6.5.5.jar:6.5.5]     
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.doFilter(ObservationFilterChainDecorator.java:228) ~[spring-security-web-6.5.5.jar:6.5.5]       
        at org.springframework.security.web.ObservationFilterChainDecorator$VirtualFilterChain.doFilter(ObservationFilterChainDecorator.java:138) ~[spring-security-web-6.5.5.jar:6.5.5]      
        at org.springframework.security.web.authentication.logout.LogoutFilter.doFilter(LogoutFilter.java:107) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.security.web.authentication.logout.LogoutFilter.doFilter(LogoutFilter.java:93) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.wrapFilter(ObservationFilterChainDecorator.java:241) ~[spring-security-web-6.5.5.jar:6.5.5]     
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.doFilter(ObservationFilterChainDecorator.java:228) ~[spring-security-web-6.5.5.jar:6.5.5]       
        at org.springframework.security.web.ObservationFilterChainDecorator$VirtualFilterChain.doFilter(ObservationFilterChainDecorator.java:138) ~[spring-security-web-6.5.5.jar:6.5.5]      
        at org.springframework.web.filter.CorsFilter.doFilterInternal(CorsFilter.java:91) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:116) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.wrapFilter(ObservationFilterChainDecorator.java:241) ~[spring-security-web-6.5.5.jar:6.5.5]     
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.doFilter(ObservationFilterChainDecorator.java:228) ~[spring-security-web-6.5.5.jar:6.5.5]       
        at org.springframework.security.web.ObservationFilterChainDecorator$VirtualFilterChain.doFilter(ObservationFilterChainDecorator.java:138) ~[spring-security-web-6.5.5.jar:6.5.5]      
        at org.springframework.security.web.header.HeaderWriterFilter.doHeadersAfter(HeaderWriterFilter.java:90) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.security.web.header.HeaderWriterFilter.doFilterInternal(HeaderWriterFilter.java:75) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:116) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.wrapFilter(ObservationFilterChainDecorator.java:241) ~[spring-security-web-6.5.5.jar:6.5.5]     
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.doFilter(ObservationFilterChainDecorator.java:228) ~[spring-security-web-6.5.5.jar:6.5.5]       
        at org.springframework.security.web.ObservationFilterChainDecorator$VirtualFilterChain.doFilter(ObservationFilterChainDecorator.java:138) ~[spring-security-web-6.5.5.jar:6.5.5]      
        at org.springframework.security.web.context.SecurityContextHolderFilter.doFilter(SecurityContextHolderFilter.java:82) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.security.web.context.SecurityContextHolderFilter.doFilter(SecurityContextHolderFilter.java:69) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.wrapFilter(ObservationFilterChainDecorator.java:241) ~[spring-security-web-6.5.5.jar:6.5.5]     
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.doFilter(ObservationFilterChainDecorator.java:228) ~[spring-security-web-6.5.5.jar:6.5.5]       
        at org.springframework.security.web.ObservationFilterChainDecorator$VirtualFilterChain.doFilter(ObservationFilterChainDecorator.java:138) ~[spring-security-web-6.5.5.jar:6.5.5]      
        at org.springframework.security.web.context.request.async.WebAsyncManagerIntegrationFilter.doFilterInternal(WebAsyncManagerIntegrationFilter.java:62) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:116) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.wrapFilter(ObservationFilterChainDecorator.java:241) ~[spring-security-web-6.5.5.jar:6.5.5]     
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.doFilter(ObservationFilterChainDecorator.java:228) ~[spring-security-web-6.5.5.jar:6.5.5]       
        at org.springframework.security.web.ObservationFilterChainDecorator$VirtualFilterChain.doFilter(ObservationFilterChainDecorator.java:138) ~[spring-security-web-6.5.5.jar:6.5.5]      
        at org.springframework.security.web.session.DisableEncodeUrlFilter.doFilterInternal(DisableEncodeUrlFilter.java:42) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:116) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.wrapFilter(ObservationFilterChainDecorator.java:241) ~[spring-security-web-6.5.5.jar:6.5.5]     
        at org.springframework.security.web.ObservationFilterChainDecorator$AroundFilterObservation$SimpleAroundFilterObservation.lambda$wrap$0(ObservationFilterChainDecorator.java:334) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.security.web.ObservationFilterChainDecorator$ObservationFilter.doFilter(ObservationFilterChainDecorator.java:225) ~[spring-security-web-6.5.5.jar:6.5.5]       
        at org.springframework.security.web.ObservationFilterChainDecorator$VirtualFilterChain.doFilter(ObservationFilterChainDecorator.java:138) ~[spring-security-web-6.5.5.jar:6.5.5]      
        at org.springframework.security.web.FilterChainProxy.doFilterInternal(FilterChainProxy.java:233) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.security.web.FilterChainProxy.doFilter(FilterChainProxy.java:191) ~[spring-security-web-6.5.5.jar:6.5.5]
        at org.springframework.web.filter.CompositeFilter$VirtualFilterChain.doFilter(CompositeFilter.java:113) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.web.filter.ServletRequestPathFilter.doFilter(ServletRequestPathFilter.java:52) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.web.filter.CompositeFilter$VirtualFilterChain.doFilter(CompositeFilter.java:113) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.web.filter.CompositeFilter.doFilter(CompositeFilter.java:74) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.security.config.annotation.web.configuration.WebSecurityConfiguration$CompositeFilterChainProxy.doFilter(WebSecurityConfiguration.java:319) ~[spring-security-config-6.5.5.jar:6.5.5]
        at org.springframework.web.filter.CompositeFilter$VirtualFilterChain.doFilter(CompositeFilter.java:113) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.web.servlet.handler.HandlerMappingIntrospector.lambda$createCacheFilter$4(HandlerMappingIntrospector.java:267) ~[spring-webmvc-6.2.11.jar:6.2.11]
        at org.springframework.web.filter.CompositeFilter$VirtualFilterChain.doFilter(CompositeFilter.java:113) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.web.filter.CompositeFilter.doFilter(CompositeFilter.java:74) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.security.config.annotation.web.configuration.WebMvcSecurityConfiguration$CompositeFilterChainProxy.doFilter(WebMvcSecurityConfiguration.java:240) ~[spring-security-config-6.5.5.jar:6.5.5]
        at org.springframework.web.filter.DelegatingFilterProxy.invokeDelegate(DelegatingFilterProxy.java:362) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.web.filter.DelegatingFilterProxy.doFilter(DelegatingFilterProxy.java:278) ~[spring-web-6.2.11.jar:6.2.11]
        at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:164) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:140) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.springframework.web.filter.RequestContextFilter.doFilterInternal(RequestContextFilter.java:100) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:116) ~[spring-web-6.2.11.jar:6.2.11]
        at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:164) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:140) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.springframework.web.filter.FormContentFilter.doFilterInternal(FormContentFilter.java:93) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:116) ~[spring-web-6.2.11.jar:6.2.11]
        at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:164) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:140) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.springframework.web.filter.ServerHttpObservationFilter.doFilterInternal(ServerHttpObservationFilter.java:110) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:116) ~[spring-web-6.2.11.jar:6.2.11]
        at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:164) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:140) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.springframework.web.filter.CharacterEncodingFilter.doFilterInternal(CharacterEncodingFilter.java:201) ~[spring-web-6.2.11.jar:6.2.11]
        at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:116) ~[spring-web-6.2.11.jar:6.2.11]
        at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:164) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:140) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.catalina.core.StandardWrapperValve.invoke(StandardWrapperValve.java:167) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.catalina.core.StandardContextValve.invoke(StandardContextValve.java:90) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.catalina.authenticator.AuthenticatorBase.invoke(AuthenticatorBase.java:483) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.catalina.core.StandardHostValve.invoke(StandardHostValve.java:116) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.catalina.valves.ErrorReportValve.invoke(ErrorReportValve.java:93) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.catalina.core.StandardEngineValve.invoke(StandardEngineValve.java:74) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.catalina.connector.CoyoteAdapter.service(CoyoteAdapter.java:344) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.coyote.http11.Http11Processor.service(Http11Processor.java:398) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.coyote.AbstractProcessorLight.process(AbstractProcessorLight.java:63) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.coyote.AbstractProtocol$ConnectionHandler.process(AbstractProtocol.java:903) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun(NioEndpoint.java:1776) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at org.apache.tomcat.util.net.SocketProcessorBase.run(SocketProcessorBase.java:52) ~[tomcat-embed-core-10.1.46.jar:10.1.46]
        at java.base/java.lang.VirtualThread.run(VirtualThread.java:329) ~[na:na]

2025-12-21T18:57:03.580+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-30] o.s.w.s.m.m.a.HttpEntityMethodProcessor  : Using 'application/json', given [application/json, text/plain, */*] and supported [application/json, application/*+json, application/yaml]
2025-12-21T18:57:03.582+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-30] o.s.w.s.m.m.a.HttpEntityMethodProcessor  : Writing [com.example.lms.shared.infrastructure.web.ApiResponse@5ee6056c]
2025-12-21T18:57:03.585+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-30] .m.m.a.ExceptionHandlerExceptionResolver : Resolved [org.hibernate.LazyInitializationException: failed to lazily initialize a collection of role: com.example.lms.course_authoring.domain.model.Course.chapters: could not initialize proxy - no Session]
2025-12-21T18:57:03.586+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-30] o.s.web.servlet.DispatcherServlet        : Completed 500 INTERNAL_SERVER_ERROR
2025-12-21T18:57:03.586+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-32] o.s.w.s.m.m.a.HttpEntityMethodProcessor  : Using 'application/json', given [application/json, text/plain, */*] and supported [application/json, application/*+json, application/yaml]
2025-12-21T18:57:03.587+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-32] o.s.w.s.m.m.a.HttpEntityMethodProcessor  : Writing [com.example.lms.shared.infrastructure.web.ApiResponse@3f4de73f]
2025-12-21T18:57:03.591+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-32] o.s.web.servlet.DispatcherServlet        : Completed 200 OK
2025-12-21T18:57:03.609+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-31] tor$SharedEntityManagerInvocationHandler : Creating new EntityManager for shared EntityManager invocation
2025-12-21T18:57:03.610+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-31] org.hibernate.SQL                        :
    select
        e1_0.id,
        e1_0.completed_at,
        e1_0.completion_percent,
        e1_0.enrolled_at,
        e1_0.joined_at,
        e1_0.last_accessed_at,
        e1_0.class_id,
        e1_0.progress,
        e1_0.status,
        e1_0.student_id
    from
        enrollments e1_0
    where
        e1_0.student_id=?
        and e1_0.class_id=?
Hibernate:
    select
        e1_0.id,
        e1_0.completed_at,
        e1_0.completion_percent,
        e1_0.enrolled_at,
        e1_0.joined_at,
        e1_0.last_accessed_at,
        e1_0.class_id,
        e1_0.progress,
        e1_0.status,
        e1_0.student_id
    from
        enrollments e1_0
    where
        e1_0.student_id=?
        and e1_0.class_id=?
2025-12-21T18:57:03.619+07:00 TRACE 28836 --- [backend-lms-postgres] [mcat-handler-31] org.hibernate.orm.jdbc.bind              : binding parameter (1:UUID) <- [f7f1c8d9-23e2-4182-9506-a05a96901946]
2025-12-21T18:57:03.620+07:00 TRACE 28836 --- [backend-lms-postgres] [mcat-handler-31] org.hibernate.orm.jdbc.bind              : binding parameter (2:UUID) <- [156ca87e-d44f-4253-94c1-dd0e06a4e10c]
2025-12-21T18:57:03.821+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-31] o.s.w.s.m.m.a.HttpEntityMethodProcessor  : Using 'application/json', given [application/json, text/plain, */*] and supported [application/json, application/*+json, application/yaml]
2025-12-21T18:57:03.822+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-31] o.s.w.s.m.m.a.HttpEntityMethodProcessor  : Writing [com.example.lms.shared.infrastructure.web.ApiResponse@9ec598d]
2025-12-21T18:57:03.822+07:00 DEBUG 28836 --- [backend-lms-postgres] [mcat-handler-31] o.s.web.servlet.DispatcherServlet        : Completed 200 OK
