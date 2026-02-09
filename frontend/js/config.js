/**
 * Configuration constants for the simulation
 */
const CONFIG = {
    // API Configuration
    API_BASE_URL: window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
        ? `${window.location.origin}/api`
        : 'http://localhost:8000/api',

    // Simulation Settings
    POPULATION_SIZE: 100,
    LAYER_SIZES: [5, 6, 4, 2], // Input: 5 sensors, Hidden: 6, 4, Output: steering + acceleration

    // Genetic Algorithm Parameters
    MUTATION_RATE: 0.05,
    MUTATION_STRENGTH: 0.3,
    CROSSOVER_RATE: 0.7,
    ELITISM_RATE: 0.05,
    TOURNAMENT_SIZE: 5,

    // Vehicle Physics
    VEHICLE: {
        WIDTH: 20,
        HEIGHT: 10,
        MAX_SPEED: 5,
        ACCELERATION: 0.2,
        FRICTION: 0.98,
        TURN_SPEED: 0.05,
        SENSOR_COUNT: 5,
        SENSOR_LENGTH: 150,
        SENSOR_SPREAD: Math.PI / 2 // 90 degrees spread
    },

    // Simulation Settings
    GENERATION_TIME: 15000, // ms per generation
    TARGET_FPS: 60,

    // Colors (matching CSS theme)
    COLORS: {
        BACKGROUND: '#0a0a0f',
        TRACK_FILL: '#1a1a25',
        TRACK_BORDER: '#00f5ff',
        CHECKPOINT: 'rgba(0, 255, 136, 0.3)',
        CHECKPOINT_LINE: '#00ff88',

        VEHICLE_ALIVE: '#00f5ff',
        VEHICLE_BEST: '#ff006e',
        VEHICLE_DEAD: 'rgba(255, 68, 68, 0.3)',

        SENSOR_LINE: 'rgba(0, 245, 255, 0.3)',
        SENSOR_HIT: 'rgba(255, 68, 68, 0.5)',

        NN_POSITIVE: '#00ff88',
        NN_NEGATIVE: '#ff4444',
        NN_NEURON: '#00f5ff',
        NN_ACTIVE: '#ffffff'
    }
};

// Freeze config to prevent accidental modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.VEHICLE);
Object.freeze(CONFIG.COLORS);
