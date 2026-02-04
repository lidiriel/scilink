use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive("info".parse()?))
        .init();

    let nats_url = std::env::var("NATS_URL").unwrap_or_else(|_| "nats://nats:4222".to_string());
    tracing::info!("Connecting to NATS at {}", nats_url);

    let client = async_nats::connect(&nats_url).await?;
    let jetstream = async_nats::jetstream::new(client);

    tracing::info!("Supervisor connected to NATS with JetStream");

    // TODO: Implement supervisor logic
    // - Subscribe to workflow execution commands
    // - Manage device state
    // - Orchestrate piece execution

    // Keep the service running
    tokio::signal::ctrl_c().await?;
    tracing::info!("Supervisor shutting down");

    Ok(())
}
