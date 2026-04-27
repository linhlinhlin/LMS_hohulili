# =============================================================================
# LMS Maritime Backend - Multi-Stage Docker Build
# SOTA: BuildKit cache, non-root user, JVM container optimization, health check
# =============================================================================

# syntax=docker/dockerfile:1.4

# ----- Stage 1: Build -----
FROM maven:3.9.14-eclipse-temurin-25 AS build
WORKDIR /app

# Cache Maven dependencies (BuildKit cache mount)
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn dependency:go-offline -B

# Build application
COPY src ./src
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn clean package -DskipTests -B

# ----- Stage 2: Runtime -----
FROM eclipse-temurin:21-jre-alpine

ARG SHAKA_PACKAGER_VERSION=v3.4.2

RUN apk add --no-cache ffmpeg x264-libs wget ca-certificates && \
    ffmpeg -version && \
    ffmpeg -hide_banner -encoders 2>/dev/null | grep -q libx264 && echo "libx264 encoder: OK" && \
    wget -q "https://github.com/shaka-project/shaka-packager/releases/download/${SHAKA_PACKAGER_VERSION}/packager-linux-x64" -O /usr/local/bin/packager && \
    chmod +x /usr/local/bin/packager && \
    /usr/local/bin/packager --version

# Security: Create non-root user with specific UID/GID
RUN addgroup -g 1001 -S lmsgroup && \
    adduser -S lmsuser -u 1001 -G lmsgroup -s /sbin/nologin

WORKDIR /app

# Create necessary directories with proper ownership
RUN mkdir -p /app/uploads /app/logs && \
    chown -R lmsuser:lmsgroup /app

# Copy artifact from build stage
COPY --from=build --chown=lmsuser:lmsgroup /app/target/backend-lms-postgres-*.jar app.jar

# Switch to non-root user
USER 1001

# Expose application port
EXPOSE 8080

# Health check using Spring Boot Actuator
HEALTHCHECK --interval=30s --timeout=10s --start-period=180s --retries=5 \
    CMD wget -q --spider --tries=1 --timeout=8 http://localhost:8080/actuator/health || exit 1

# JVM optimization for containers (can be overridden by JAVA_OPTS env)
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"

# Run application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
