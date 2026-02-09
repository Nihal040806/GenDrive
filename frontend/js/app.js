/**
 * Main Application Controller
 * Manages simulation loop, vehicles, and coordination
 */
class SimulationApp {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('simulation-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Components
        this.track = null;
        this.vehicles = [];
        this.dashboard = null;
        this.nnVisualizer = null;

        // State
        this.isRunning = false;
        this.isPaused = false;
        this.generation = 0;
        this.generationTime = 0;
        this.totalTime = 0;
        this.speed = 1.0;

        // FPS tracking
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.fps = 0;

        // Animation
        this.lastFrameTime = 0;
        this.animationId = null;
        this.isUpdating = false;

        // Initialize
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Neuro-Evolution Simulation...');

        // Setup canvas
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Initialize components
        this.dashboard = new Dashboard();
        this.nnVisualizer = new NNVisualizer('nn-canvas');

        // Setup track
        this.track = new Track('oval');

        // Setup event listeners
        this.setupEventListeners();

        // Check API connection
        await this.checkConnection();

        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('app').classList.remove('hidden');
        }, 2500);

        // Initial render
        this.render();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;

        // Regenerate track for new size
        if (this.track) {
            this.track.generate(this.track.type);
        }
    }

    setupEventListeners() {
        // Start button
        document.getElementById('btn-start').addEventListener('click', () => this.start());

        // Pause button
        document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());

        // Reset button
        document.getElementById('btn-reset').addEventListener('click', () => this.reset());

        // Speed slider
        document.getElementById('speed-slider').addEventListener('input', (e) => {
            this.speed = parseFloat(e.target.value);
            document.getElementById('speed-value').textContent = this.speed.toFixed(1) + 'x';
        });

        // Track selector
        document.getElementById('track-select').addEventListener('change', (e) => {
            this.track = new Track(e.target.value);
            this.resetVehicles();
            this.render();
        });

        // Save button
        document.getElementById('btn-save').addEventListener('click', () => this.showSaveModal());

        // Load button
        document.getElementById('btn-load').addEventListener('click', () => this.showLoadModal());

        // Apply config button
        document.getElementById('btn-apply-config').addEventListener('click', () => this.applyConfig());

        // Modal close
        document.getElementById('modal-close').addEventListener('click', () => this.hideModal());
        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target.id === 'modal') this.hideModal();
        });
    }

    async checkConnection() {
        try {
            await api.healthCheck();
            console.log('✅ Connected to API');
        } catch (error) {
            console.error('❌ API not available:', error);
        }
    }

    async start() {
        if (this.isRunning) return;

        console.log('▶️ Starting simulation...');

        // Fix for potential layout timing issues
        this.resizeCanvas();

        // Hide overlay
        document.getElementById('canvas-overlay').classList.add('hidden');

        // Update buttons
        document.getElementById('btn-start').disabled = true;
        document.getElementById('btn-pause').disabled = false;

        try {
            // Initialize backend
            const config = this.dashboard.getConfig();
            const response = await api.initializeSimulation(config);
            console.log('📊 Simulation initialized:', response);

            // Create vehicles
            this.createVehicles(config.population_size);

            // Update dashboard
            this.dashboard.updateStats({
                generation: 0,
                alive: config.population_size,
                population: config.population_size,
                mutationRate: config.mutation_rate
            });

            // Start simulation loop
            this.isRunning = true;
            this.isPaused = false;
            this.generation = 0;
            this.generationTime = 0;
            this.totalTime = 0;
            this.lastFrameTime = performance.now();

            this.loop();

        } catch (error) {
            console.error('Failed to start simulation:', error);
            alert('Failed to connect to backend. Make sure the server is running.');
            document.getElementById('btn-start').disabled = false;
        }
    }

    createVehicles(count) {
        this.vehicles = [];
        const startPos = this.track.startPosition;

        for (let i = 0; i < count; i++) {
            const vehicle = new Vehicle(
                i,
                startPos.x + Utils.random(-5, 5),
                startPos.y + Utils.random(-5, 5),
                startPos.angle
            );
            this.vehicles.push(vehicle);
        }
    }

    resetVehicles() {
        const startPos = this.track.startPosition;

        for (const vehicle of this.vehicles) {
            vehicle.reset(
                startPos.x + Utils.random(-5, 5),
                startPos.y + Utils.random(-5, 5),
                startPos.angle
            );
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('btn-pause').querySelector('span').textContent =
            this.isPaused ? 'Resume' : 'Pause';

        if (!this.isPaused) {
            this.lastFrameTime = performance.now();
            this.loop();
        }
    }

    async reset() {
        this.isRunning = false;
        this.isPaused = false;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        await api.reset().catch(() => { });

        this.vehicles = [];
        this.generation = 0;
        this.generationTime = 0;
        this.totalTime = 0;

        this.dashboard.reset();
        this.nnVisualizer.setGenome(null);

        document.getElementById('btn-start').disabled = false;
        document.getElementById('btn-pause').disabled = true;
        document.getElementById('btn-pause').querySelector('span').textContent = 'Pause';
        document.getElementById('canvas-overlay').classList.remove('hidden');

        this.render();
    }

    loop() {
        if (!this.isRunning || this.isPaused) return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastFrameTime) * this.speed;
        this.lastFrameTime = currentTime;

        // Update simulation
        if (!this.isUpdating) {
            this.isUpdating = true;
            this.update(deltaTime).finally(() => {
                this.isUpdating = false;
            });
        }

        // Render
        this.render();

        // Track FPS
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate > 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
            this.dashboard.updateFPS(this.fps);
        }

        // Continue loop targeting 60 FPS
        this.animationId = requestAnimationFrame(() => this.loop());
    }

    async update(dt) {
        this.generationTime += dt;
        this.totalTime += dt;
        this.dashboard.updateTime(this.totalTime);

        const walls = this.track.getWalls();
        const checkpoints = this.track.getCheckpoints();

        // Gather sensor readings
        const sensorInputs = [];
        for (const vehicle of this.vehicles) {
            const readings = vehicle.sense(walls);
            sensorInputs.push({
                agent_id: vehicle.id,
                sensors: readings
            });
        }

        // Get neural network outputs from backend
        try {
            const response = await api.evaluate(sensorInputs);

            // Apply outputs to vehicles
            for (const output of response.outputs) {
                const vehicle = this.vehicles[output.agent_id];
                if (vehicle) {
                    vehicle.setOutputs(output.steering, output.acceleration);
                }
            }
        } catch (error) {
            // If API fails, use random outputs
            for (const vehicle of this.vehicles) {
                vehicle.setOutputs(Utils.random(-1, 1), Utils.random(0, 1));
            }
        }

        // Update vehicles
        for (const vehicle of this.vehicles) {
            vehicle.update(dt / 1000, walls, checkpoints);
        }

        // Find and mark best vehicle
        let bestVehicle = null;
        let bestFitness = -Infinity;
        let aliveCount = 0;
        let totalFitness = 0;

        for (const vehicle of this.vehicles) {
            vehicle.setBest(false);
            if (vehicle.alive) {
                aliveCount++;
                if (vehicle.fitness > bestFitness) {
                    bestFitness = vehicle.fitness;
                    bestVehicle = vehicle;
                }
            }
            totalFitness += vehicle.fitness;
        }

        if (bestVehicle) {
            bestVehicle.setBest(true);

            // Update NN visualizer with best vehicle's data
            this.nnVisualizer.setActivations(
                bestVehicle.sensorReadings,
                [bestVehicle.outputs.steering, bestVehicle.outputs.acceleration]
            );
        }

        // Update dashboard
        this.dashboard.updateStats({
            alive: aliveCount,
            bestFitness: bestFitness,
            avgFitness: totalFitness / this.vehicles.length
        });

        // Check if generation should end
        if (aliveCount === 0 || this.generationTime > CONFIG.GENERATION_TIME) {
            await this.endGeneration();
        }
    }

    async endGeneration() {
        console.log(`📊 Generation ${this.generation} ended`);

        // Collect fitness scores
        const fitnessData = this.vehicles.map(v => v.getFitnessData());

        try {
            // Send to backend for evolution
            const result = await api.evolve(fitnessData, true);

            this.generation = result.generation;

            // Update dashboard
            this.dashboard.updateStats({
                generation: this.generation,
                bestFitness: result.best_fitness,
                avgFitness: result.average_fitness,
                mutationRate: result.mutation_rate
            });

            this.dashboard.addFitnessData(result.best_fitness, result.average_fitness);

            // Update NN visualizer with best genome
            const bestGenome = await api.getBestGenome();
            this.nnVisualizer.setGenome(bestGenome);

        } catch (error) {
            console.error('Evolution failed:', error);
        }

        // Reset vehicles for next generation
        this.resetVehicles();
        this.generationTime = 0;
    }

    render() {
        const ctx = this.ctx;

        // Clear canvas
        ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw track
        this.track.render(ctx);

        // Draw vehicles (dead first, then alive, best last)
        const deadVehicles = this.vehicles.filter(v => !v.alive);
        const aliveVehicles = this.vehicles.filter(v => v.alive && !v.isBest);
        const bestVehicle = this.vehicles.find(v => v.isBest);

        for (const vehicle of deadVehicles) {
            vehicle.render(ctx, false);
        }

        for (const vehicle of aliveVehicles) {
            vehicle.render(ctx, false);
        }

        if (bestVehicle) {
            bestVehicle.render(ctx, true);
        }
    }

    // Modal functions
    showSaveModal() {
        const modal = document.getElementById('modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');

        title.textContent = 'Save Best Genome';
        body.innerHTML = `
            <div class="config-group">
                <label for="save-name">Name</label>
                <input type="text" id="save-name" placeholder="Enter a name for this genome">
            </div>
            <div class="config-group">
                <label for="save-desc">Description (optional)</label>
                <input type="text" id="save-desc" placeholder="Optional description">
            </div>
            <button class="config-btn" id="save-confirm" style="margin-top: 16px; width: 100%;">Save Genome</button>
            <p id="save-status" style="margin-top: 8px; text-align: center; color: var(--text-muted);"></p>
        `;

        document.getElementById('save-confirm').addEventListener('click', async () => {
            const name = document.getElementById('save-name').value.trim();
            const desc = document.getElementById('save-desc').value.trim();
            const status = document.getElementById('save-status');

            if (!name) {
                status.textContent = 'Please enter a name';
                status.style.color = 'var(--accent-danger)';
                return;
            }

            try {
                const genome = await api.getBestGenome();
                const bestVehicle = this.vehicles.reduce((a, b) => a.fitness > b.fitness ? a : b);

                await api.saveGenome(name, genome, bestVehicle.fitness, this.generation, desc);

                status.textContent = 'Genome saved successfully!';
                status.style.color = 'var(--accent-success)';

                setTimeout(() => this.hideModal(), 1500);
            } catch (error) {
                status.textContent = 'Error: ' + error.message;
                status.style.color = 'var(--accent-danger)';
            }
        });

        modal.classList.remove('hidden');
    }

    async showLoadModal() {
        const modal = document.getElementById('modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');

        title.textContent = 'Load Genome';
        body.innerHTML = '<p style="text-align: center;">Loading saved genomes...</p>';
        modal.classList.remove('hidden');

        try {
            const genomes = await api.listGenomes();

            if (genomes.length === 0) {
                body.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No saved genomes found</p>';
                return;
            }

            body.innerHTML = `
                <div class="genome-list" style="max-height: 300px; overflow-y: auto;">
                    ${genomes.map(g => `
                        <div class="genome-item" data-name="${g.name}" style="
                            padding: 12px;
                            background: var(--bg-tertiary);
                            border-radius: 8px;
                            margin-bottom: 8px;
                            cursor: pointer;
                            transition: all 0.15s ease;
                        ">
                            <div style="font-weight: 600; color: var(--accent-primary);">${g.name}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">
                                Fitness: ${Utils.formatNumber(g.fitness, 1)} | Gen: ${g.generation}
                            </div>
                            ${g.description ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">${g.description}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
                <p id="load-status" style="margin-top: 8px; text-align: center; color: var(--text-muted);"></p>
            `;

            // Add hover effects
            body.querySelectorAll('.genome-item').forEach(item => {
                item.addEventListener('mouseenter', () => {
                    item.style.borderColor = 'var(--accent-primary)';
                    item.style.border = '1px solid var(--accent-primary)';
                });
                item.addEventListener('mouseleave', () => {
                    item.style.border = 'none';
                });
                item.addEventListener('click', async () => {
                    const name = item.dataset.name;
                    const status = document.getElementById('load-status');

                    try {
                        status.textContent = 'Loading...';
                        const data = await api.loadGenome(name);
                        this.nnVisualizer.setGenome(data.genome);

                        status.textContent = `Loaded "${name}" successfully!`;
                        status.style.color = 'var(--accent-success)';

                        setTimeout(() => this.hideModal(), 1500);
                    } catch (error) {
                        status.textContent = 'Error: ' + error.message;
                        status.style.color = 'var(--accent-danger)';
                    }
                });
            });

        } catch (error) {
            body.innerHTML = `<p style="text-align: center; color: var(--accent-danger);">Error loading genomes: ${error.message}</p>`;
        }
    }

    hideModal() {
        document.getElementById('modal').classList.add('hidden');
    }

    async applyConfig() {
        await this.reset();
        await this.start();
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SimulationApp();
});
