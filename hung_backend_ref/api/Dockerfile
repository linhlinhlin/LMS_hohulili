# Giai đoạn 1: Build ứng dụng (dùng Maven)
# SỬA: Dùng image Temurin (một bản build OpenJDK) chính thức cho Java 21
FROM maven:3.9.7-eclipse-temurin-21 AS build

# Đặt thư mục làm việc
WORKDIR /app

# Copy file pom.xml và tải dependencies
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy toàn bộ code và build
COPY src ./src
RUN mvn clean package -DskipTests

# Giai đoạn 2: Chạy ứng dụng (dùng Java runtime)
# SỬA: Dùng image JRE (runtime) của Temurin 21
FROM eclipse-temurin:21-jre

WORKDIR /app

# Copy file .jar đã build từ giai đoạn 1
COPY --from=build /app/target/backend-lms-postgres-0.0.1-SNAPSHOT.jar app.jar

# Mở cổng 8080 (cổng mà Render mong đợi)
EXPOSE 8080

# Lệnh để chạy ứng dụng (Render sẽ tự động dùng cổng 8080)
ENTRYPOINT ["java", "-jar", "app.jar"]