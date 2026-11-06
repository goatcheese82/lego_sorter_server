# Stage 1: build the web app
FROM node:22-alpine AS web
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm test && npm run build

# Stage 2: build the static server
FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY server ./server
RUN go vet ./... && CGO_ENABLED=0 go build -o /out/server ./server

# Stage 3: runtime
FROM alpine:3.20
RUN apk add --no-cache ca-certificates wget
WORKDIR /app
COPY --from=build /out/server /app/server
COPY --from=web /src/dist /app/dist
USER 1000:1000
EXPOSE 3008
ENTRYPOINT ["/app/server"]
