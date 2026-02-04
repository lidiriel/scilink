// Microservices Supervisor
// Manages microservices lifecycle with NATS communication.
// Features: Start/Stop/Restart, Health Monitoring, Auto-restart, Logging

// control log verbosity via RUST_LOG env variable
use tracing_subscriber::EnvFilter;

// macro that turns main() into an async runtime. 
// Without it, you can't use .await in main. 
// It starts the Tokio event loop (thread pool, I/O reactor, timers).
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // The function signature. Result<(), Box<dyn std::error::Error>> means ...
    // it returns nothing on success, or any error type on failure. 
    // The ? operator throughout the function relies on this ...
    // it propagates errors upward instead of crashing.

    // Initialize tracing subscriber for logging
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive("info".parse()?))
        .init();
    // Reads the NATS_URL environment variable. If not set, defaults to nats://nats:4222 — nats is 
    // the Docker service hostname, 4222 is the NATS default port.
    let nats_url = std::env::var("NATS_URL").unwrap_or_else(|_| "nats://nats:4222".to_string());
    tracing::info!("Connecting to NATS at {}", nats_url);

    // Connect to NATS server with JetStream enabled
    let client = async_nats::connect(&nats_url).await?;
    // Wraps the NATS client with the JetStream API. 
    // This gives access to streams, consumers, key-value stores, and object stores. 
    // The jetstream variable is what you'll use later to publish/subscribe 
    // with persistence guarantees.
    let jetstream = async_nats::jetstream::new(client);

    tracing::info!("Supervisor connected to NATS with JetStream");

    // TODO: Implement supervisor logic
    // - Subscribe to workflow execution commands
    // - Manage device state
    // - Orchestrate piece execution

    // Keep the service running
    // Wait for Ctrl+C signal to shut down gracefully
    tokio::signal::ctrl_c().await?;
    tracing::info!("Supervisor shutting down");
    // clean exit with no error
    Ok(())
}
