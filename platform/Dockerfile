FROM rust:1.93-slim

WORKDIR /platform

ENV NATS_URL=nats://nats:4222

CMD ["sh", "-c", "cargo build && ./target/debug/scilink-supervisor"]