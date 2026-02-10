
let connectionsDefinitions: any[] = new Array();


// Load connections definitions
async function loadConnectionsDefinitions() {
    if (connectionsDefinitions.length > 0) {
        return connectionsDefinitions; // Already loaded
    }
    try {
        const response = await fetch('/api/connections');
        connectionsDefinitions = await response.json();
        return connectionsDefinitions;
    } catch (error) {
        console.error('Error loading connections:', error);
        return [];
    }
}

export{ loadConnectionsDefinitions, connectionsDefinitions };