E:\Sach\Sua\LMS_hohulili\api>mvn test 2>&1 | findstr /I "BUILD run: Tests FAILURE SUCCESS"
[INFO] Building backend-lms-postgres 0.0.1-SNAPSHOT
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.083 s -- in JPA Entity Rules
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.039 s -- in Naming Convention Rules
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.135 s -- in Layer Dependency Rules
[INFO] Tests run: 0, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 3.536 s -- in com.example.lms.architecture.DddArchitectureTest
[INFO] Running ApproveCourseUseCase Tests
Mockito is currently self-attaching to enable the inline-mock-maker. This will no longer work in future releases of the JDK. Please add Mockito as an agent to your build as described in Mockito's documentation: https://javadoc.io/doc/org.mockito/mockito-core/latest/org.mockito/org/mockito/Mockito.html#0.3
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1.299 s -- in ApproveCourseUseCase Tests
[INFO] Running CreateCourseUseCase Tests
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.058 s -- in CreateCourseUseCase Tests
[INFO] Running SubmitCourseForApprovalUseCase Tests
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.042 s -- in SubmitCourseForApprovalUseCase Tests
[INFO] Running AuthenticateUserUseCaseV2 Tests
[INFO] Running Token Generation Tests
00:32:37.134 [main] INFO com.example.lms.identity.application.usecase.AuthenticateUserUseCaseV2 -- User authenticated successfully (V2): 5c04c194-ef62-46f6-a207-6a9797ea5a82
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.169 s -- in Token Generation Tests
[INFO] Running Error Handling Tests
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.029 s -- in Error Handling Tests
[INFO] Running Happy Path Tests
00:32:37.193 [main] INFO com.example.lms.identity.application.usecase.AuthenticateUserUseCaseV2 -- User authenticated successfully (V2): 7f496e17-c5c3-4d69-91a6-d6cdc36dcfd5
00:32:37.202 [main] INFO com.example.lms.identity.application.usecase.AuthenticateUserUseCaseV2 -- User authenticated successfully (V2): b610af49-302c-477d-bf64-da797c188ea4
00:32:37.211 [main] INFO com.example.lms.identity.application.usecase.AuthenticateUserUseCaseV2 -- User authenticated successfully (V2): 459992a3-2b79-4a60-a21a-d40323c39403
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.028 s -- in Happy Path Tests
[INFO] Tests run: 0, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.245 s -- in AuthenticateUserUseCaseV2 Tests
[INFO] Running ChangePasswordUseCaseV2 Tests
[INFO] Running Error Handling Tests
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.047 s -- in Error Handling Tests
[INFO] Running Happy Path Tests
00:32:37.288 [main] INFO com.example.lms.identity.application.usecase.ChangePasswordUseCaseV2 -- Password changed successfully (V2) for user: cd52ebe7-4ebc-4850-8a50-277e60a21c2c
00:32:37.296 [main] INFO com.example.lms.identity.application.usecase.ChangePasswordUseCaseV2 -- Password changed successfully (V2) for user: 239bf141-7251-4173-925e-fb8ae4e1736e
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.019 s -- in Happy Path Tests
[INFO] Tests run: 0, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.072 s -- in ChangePasswordUseCaseV2 Tests
[INFO] Running GetCurrentUserUseCaseV2 Tests
[INFO] Running Error Handling Tests
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.007 s -- in Error Handling Tests
[INFO] Running Happy Path Tests
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.034 s -- in Happy Path Tests      
[INFO] Tests run: 0, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.049 s -- in GetCurrentUserUseCaseV2 Tests
[INFO] Running RegisterUserUseCaseV2 Tests
00:32:37.369 [main] INFO com.example.lms.identity.application.usecase.RegisterUserUseCaseV2 -- User registered successfully (V2): b1dc1795-e4f4-4baf-94ab-3ce002c3f7ec
00:32:37.380 [main] INFO com.example.lms.identity.application.usecase.RegisterUserUseCaseV2 -- User registered successfully (V2): 5bd82091-3499-4c60-a691-063d46d16cff
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.028 s -- in Integration with Dependencies
[INFO] Running Validation Error Tests
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.025 s -- in Validation Error Tests
[INFO] Running Happy Path Tests
00:32:37.419 [main] INFO com.example.lms.identity.application.usecase.RegisterUserUseCaseV2 -- User registered successfully (V2): 8e18af5e-87e2-4fc6-9eaa-52185f2075f3
00:32:37.426 [main] INFO com.example.lms.identity.application.usecase.RegisterUserUseCaseV2 -- User registered successfully (V2): e2896869-b42b-45dd-b7fd-9821148b6f1c
00:32:37.434 [main] INFO com.example.lms.identity.application.usecase.RegisterUserUseCaseV2 -- User registered successfully (V2): 5e45260b-41ff-49f9-b51e-0769e51d8419
00:32:37.445 [main] INFO com.example.lms.identity.application.usecase.RegisterUserUseCaseV2 -- User registered successfully (V2): bebdda63-5b4d-4382-bac0-08d0b7478cd0
00:32:37.453 [main] INFO com.example.lms.identity.application.usecase.RegisterUserUseCaseV2 -- User registered successfully (V2): f25b7930-21fa-4723-b585-bd023cf6ba45
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.043 s -- in Happy Path Tests
[INFO] Tests run: 0, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.103 s -- in RegisterUserUseCaseV2 Tests
[INFO] Running CreateLearningClassUseCaseV3 Tests
[INFO] Running Happy Path Tests
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.059 s -- in Happy Path Tests
[INFO] Tests run: 0, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.073 s -- in CreateLearningClassUseCaseV3 Tests
[INFO] Running EnrollStudentUseCaseV3 Tests
[INFO] Running Error Handling Tests
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.115 s -- in Error Handling Tests
[INFO] Running Happy Path Tests
00:32:37.681 [main] INFO com.example.lms.learning_delivery.application.usecase.EnrollStudentUseCaseV3 -- Student 9b8def4b-0aa4-4d59-8849-69182643c1b0 enrolled successfully in class 0b7aec64-dee6-4c22-a47e-a22486de8ebc (V3)
00:32:37.687 [main] INFO com.example.lms.learning_delivery.application.usecase.EnrollStudentUseCaseV3 -- Student c3bc18cc-a87e-4332-9907-e14ef40c19ac enrolled successfully in class 26d3d496-54d1-4820-92d0-21f4db1b89de (V3)
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.037 s -- in Happy Path Tests
[INFO] Tests run: 0, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.156 s -- in EnrollStudentUseCaseV3 Tests
[INFO] Tests run: 55, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
