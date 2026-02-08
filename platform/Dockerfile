FROM gcc:14

RUN apt-get update && apt-get install -y --no-install-recommends cmake git libssl-dev libprotobuf-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /platform

ENV NATS_URL=nats://nats:4222

# CMD ["sh", "-c", "cmake -B build && cmake --build build && ./build/supervisor"]
CMD ["sleep", "infinity"]