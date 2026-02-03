-- Seed data for testing
-- Executed after schema.sql via docker-entrypoint-initdb.d (alphabetical order)

-- Sample experiments
INSERT INTO experiments (name, description) VALUES
    ('Temperature Monitoring', 'Monitor temperature sensors across the lab'),
    ('Motor Control Test', 'Test motor control with PID feedback loop');

-- Sample settings (platforms)
INSERT INTO settings (category, name, description, data) VALUES
    ('platform', 'Microbiology', 'Automated microbiology platform', '{"arch": "arm64", "os": "linux"}'),
    ('platform', 'Electrotechnic', 'Sensor acquisition board', '{"arch": "avr", "os": "none"}');

-- Sample devices
INSERT INTO devices_installed (piece_name, piece_directory, label, device_type, icon_class, description, mode, data) VALUES
    ('temperature_sensor', 'sensors', 'Temp Sensor #1', 'sensor', 'fa-solid:temperature-half', 'Main lab temperature sensor', 'activate', '{"connection_type": "MODBUS-RTU", "bus_name": "MODBUS-Main", "slave_id": 1}'),
    ('temperature_sensor', 'sensors', 'Temp Sensor #2', 'sensor', 'fa-solid:temperature-half', 'Secondary temperature sensor', 'simulate', '{"connection_type": "MODBUS-RTU", "bus_name": "MODBUS-Main", "slave_id": 2}'),

-- Sample bus setting
INSERT INTO settings (category, name, description, data) VALUES
    ('bus', 'MODBUS-Main', 'Primary MODBUS bus', '{"connection_type": "MODBUS-RTU", "port": "/dev/ttyUSB1", "baud_rate": 9600, "data_bits": 8, "parity": "none", "stop_bits": 1, "platform_id": 1}');
