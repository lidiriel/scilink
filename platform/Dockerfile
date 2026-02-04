FROM rust:1.90-slim AS builder

WORKDIR /build
COPY Cargo.toml Cargo.lock* ./
COPY src ./src

RUN cargo build

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/target/debug/scilink-supervisor /usr/local/bin/supervisor

ENV NATS_URL=nats://nats:4222
CMD ["supervisor"]
