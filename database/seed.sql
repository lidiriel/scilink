-- Seed data for testing
-- Executed after schema.sql via docker-entrypoint-initdb.d (alphabetical order)

-- Sample experiments
INSERT INTO experiments (name, description) VALUES
    ('Temperature Monitoring', 'Monitor temperature sensors across the lab'),
    ('Motor Control Test', 'Test motor control with PID feedback loop');

-- Sample settings (platforms)
INSERT INTO settings (category, name, description, data) VALUES
    ('platform', 'Microbiology', 'Automated microbiology platform', '{"arch": "arm64", "os": "linux"}'),
    ('platform', 'Test Platform', 'A testing platform', '{"arch": "arm64", "os": "Linux"}');

-- Sample bus setting
INSERT INTO settings (category, name, description, data) VALUES
    ('bus', 'MODBUS-Main', 'Primary MODBUS bus', '{"connection_type": "MODBUS-RTU", "port": "/dev/ttyUSB1", "baud_rate": 9600, "data_bits": 8, "parity": "none", "stop_bits": 1, "platform_id": 1}');
