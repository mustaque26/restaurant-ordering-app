# Multi-stage Dockerfile: build frontend, inject into Spring Boot static resources, build jar, run

# 1) Frontend build stage
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend/ .
RUN npm run build --silent

# 2) Backend build stage (build the jar and copy frontend build into resources)
FROM eclipse-temurin:17-jdk AS backend-build
WORKDIR /app
# copy all files
COPY . /app
# ensure static resource dir exists and is clean
RUN rm -rf backend/src/main/resources/static || true
RUN mkdir -p backend/src/main/resources/static
# copy frontend build into backend static resources
RUN cp -r /app/frontend/dist/* backend/src/main/resources/static/ || true
# build the backend jar (skip tests for faster build, remove -DskipTests for CI)
RUN ./backend/mvnw -f backend/pom.xml -DskipTests package

# 3) Runtime image - use a smaller Alpine-based image
FROM openjdk:17-jdk-alpine AS runtime
WORKDIR /app

# install curl for healthcheck
RUN apk add --no-cache curl

COPY --from=backend-build /app/backend/target/*.jar app.jar
ENV JAVA_OPTS=""
EXPOSE 8080

# probe the API health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

CMD java $JAVA_OPTS -Dserver.port=${PORT:-8080} -jar /app/app.jar
