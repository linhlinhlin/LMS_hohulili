E:\Sach\Sua\LMS_hohulili\api>mvn clean compile -DskipTests 
[INFO] Scanning for projects...
[INFO] 
[INFO] ------------------< com.example:backend-lms-postgres >------------------
[INFO] Building backend-lms-postgres 0.0.1-SNAPSHOT
[INFO]   from pom.xml
[INFO] --------------------------------[ jar ]---------------------------------
[INFO] 
[INFO] --- clean:3.4.1:clean (default-clean) @ backend-lms-postgres ---
[INFO] Deleting E:\Sach\Sua\LMS_hohulili\api\target
[INFO] 
[INFO] --- resources:3.3.1:resources (default-resources) @ backend-lms-postgres ---
[INFO] Copying 3 resources from src\main\resources to target\classes
[INFO] Copying 35 resources from src\main\resources to target\classes
[INFO] 
[INFO] --- compiler:3.11.0:compile (default-compile) @ backend-lms-postgres ---
[INFO] Changes detected - recompiling the module! :source
[INFO] Compiling 262 source files with javac [debug release 21] to target\classes
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/Package.java:[40,5] @Builder.Default requires @Builder or @SuperBuilder on the class for it to mean anything.
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/Package.java:[47,5] @Builder.Default requires @Builder or @SuperBuilder on the class for it to mean anything.
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/StudentLessonProgress.java:[54,5] @Builder.Default requires @Builder or @SuperBuilder on the class for it to mean anything.
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/Course.java:[46,5] @Builder.Default requires @Builder or @SuperBuilder on the class for it to mean anything.
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/Course.java:[55,5] @Builder.Default requires @Builder or @SuperBuilder on the class for it to mean anything.
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/Course.java:[61,5] @Builder.Default requires @Builder or @SuperBuilder on the class for it to mean anything.
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/Course.java:[66,5] @Builder.Default requires @Builder or @SuperBuilder on the class for it to mean anything.
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/Course.java:[71,5] @Builder.Default requires @Builder or @SuperBuilder on the class for it to mean anything.
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/Course.java:[85,5] @Builder.Default requires @Builder or @SuperBuilder on the class for it to mean anything.
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/Course.java:[95,5] @Builder.Default requires @Builder or @SuperBuilder on the class for it to mean anything.
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/Course.java:[114,5] @Builder.Default requires @Builder or @SuperBuilder on the class for it to mean anything.
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/Course.java:[118,5] @Builder.Default requires @Builder or @SuperBuilder on the class for it to mean anything.
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/Quiz.java:[31,20] Not generating setTitle(): A method with that name already exists
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/Quiz.java:[35,20] Not generating setDescription(): A method with that name already exists
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/Quiz.java:[64,21] Not generating setTimeLimitMinutes(): A method with that name already exists
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/Quiz.java:[69,21] Not generating setMaxAttempts(): A method with that name already exists
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/Quiz.java:[74,21] Not generating setPassingScore(): A method with that name already exists
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/Quiz.java:[79,21] Not generating setShuffleQuestions(): A method with that name already exists
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/Quiz.java:[84,21] Not generating setShuffleOptions(): A method with that name already exists
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/Quiz.java:[89,21] Not generating setShowResultsImmediately(): A method with that name already exists   
[WARNING] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/entity/Quiz.java:[94,21] Not generating setShowCorrectAnswers(): A method with that name already exists       
[INFO] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/service/LessonService.java: Some input files use or override a deprecated API.
[INFO] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/service/LessonService.java: Recompile with -Xlint:deprecation for details.
[INFO] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/service/AssignmentService.java: E:\Sach\Sua\LMS_hohulili\api\src\main\java\com\example\lms\service\AssignmentService.java uses unchecked or unsafe operations.
[INFO] /E:/Sach/Sua/LMS_hohulili/api/src/main/java/com/example/lms/service/AssignmentService.java: Recompile with -Xlint:unchecked for details.
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  23.690 s
[INFO] Finished at: 2025-12-24T03:27:30+07:00