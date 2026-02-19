/**
 * API Client for backend communication
 * Handles all HTTP requests to the FastAPI server
 */
class API {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.isConnected = false;
        this.lastError = null;
        console.log(`📡 API Client initialized at: ${this.baseUrl}`);
    }

    /**
     * Make HTTP request
     */
    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
                throw new Error(error.detail || `HTTP ${response.status}`);
            }

            this.isConnected = true;
            this.updateConnectionStatus(true);
            return await response.json();
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            this.lastError = error.message;

            if (error.message.includes('Failed to fetch')) {
                this.isConnected = false;
                this.updateConnectionStatus(false);
            }

            throw error;
        }
    }

    /**
     * Update connection status in UI
     */
    updateConnectionStatus(connected) {
        const indicator = document.getElementById('api-status');
        const text = document.getElementById('api-status-text');

        if (connected) {
            indicator.classList.add('connected');
            indicator.classList.remove('error');
            text.textContent = 'Connected';
        } else {
            indicator.classList.remove('connected');
            indicator.classList.add('error');
            text.textContent = 'Disconnected';
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        return this.request('/health');
    }

    /**
     * Initialize simulation
     */
    async initializeSimulation(config) {
        return this.request('/simulation/initialize', {
            method: 'POST',
            body: JSON.stringify(config)
        });
    }

    /**
     * Evaluate sensor inputs through neural networks
     */
    async evaluate(sensorInputs) {
        return this.request('/simulation/evaluate', {
            method: 'POST',
            body: JSON.stringify({ inputs: sensorInputs })
        });
    }

    /**
     * Trigger evolution with fitness scores
     */
    async evolve(fitnessScores, triggerEvolution = true) {
        return this.request('/simulation/evolve', {
            method: 'POST',
            body: JSON.stringify({
                scores: fitnessScores,
                trigger_evolution: triggerEvolution
            })
        });
    }

    /**
     * Load a genome into the active simulation population.
     * @param {Object} genome - The genome data (layers, weights, biases)
     * @param {number} generation - The generation count to set
     */
    async loadPopulation(genome, generation) {
        return this.request('/simulation/load-population', {
            method: 'POST',
            body: JSON.stringify({
                genome: genome,
                generation: generation,
                test_mode: true // Force exact copy for testing/verification
            })
        });
    }

    /**
     * Get simulation status
     */
    async getStatus() {
        return this.request('/simulation/status');
    }

    /**
     * Get best genome
     */
    async getBestGenome() {
        return this.request('/simulation/best-genome');
    }

    /**
     * Reset simulation
     */
    async reset() {
        return this.request('/simulation/reset', {
            method: 'POST'
        });
    }

    /**
     * Save genome to database
     */
    async saveGenome(name, genome, fitness, generation, description = '') {
        console.log('API saveGenome called with:', { name, genome, fitness, generation, description });
        return this.request('/genomes/save', {
            method: 'POST',
            body: JSON.stringify({
                name,
                genome,
                fitness,
                generation,
                description
            })
        });
    }

    /**
     * Load genome from database
     */
    async loadGenome(name) {
        return this.request(`/genomes/load/${encodeURIComponent(name)}`);
    }

    /**
     * List all saved genomes
     */
    async listGenomes() {
        return this.request('/genomes/list');
    }

    /**
     * Delete genome
     */
    async deleteGenome(name) {
        return this.request(`/genomes/${encodeURIComponent(name)}`, {
            method: 'DELETE'
        });
    }

    /**
     * Get current analytics
     */
    async getAnalytics() {
        return this.request('/analytics/current');
    }
}

// Global API instance
const api = new API(CONFIG.API_BASE_URL);
