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

        // Animate loading progress bar
        const progressFill = document.querySelector('.progress-fill');
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }
            if (progressFill) progressFill.style.width = progress + '%';
        }, 150);

        // Initialize components
        try {
            this.dashboard = new Dashboard();
            // Point the primary visualizer to the analysis canvas since sidebar ones are removed
            this.nnVisualizer = new NNVisualizer('nn-canvas-analysis');
            this.track = new Track('oval');
            this.setupEventListeners();
        } catch (e) {
            console.error('Initialization error:', e);
        }

        // Show landing page - Guarantee it shows within 2 seconds
        const showUI = () => {
            const loader = document.getElementById('loading-screen');
            const landing = document.getElementById('landing-page');
            if (loader) loader.classList.add('hidden');
            if (landing) landing.classList.remove('hidden');
            this.render();
            clearInterval(interval);
        };

        // Don't block UI on connection
        this.checkConnection().finally(() => {
            setTimeout(showUI, 1000); // Small buffer for effect
        });

        // Backup safety timeout
        setTimeout(showUI, 3000);
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
        const safeListen = (id, event, cb) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(event, cb);
        };

        // Core Control Buttons
        safeListen('btn-start', 'click', () => this.start());
        safeListen('btn-pause', 'click', () => this.togglePause());
        safeListen('btn-reset', 'click', () => this.reset());

        // Data & Config Buttons
        safeListen('btn-save', 'click', () => this.showSaveModal());
        safeListen('btn-load', 'click', () => this.showLoadModal());
        safeListen('btn-apply-config', 'click', () => this.applyConfig());

        // Navigation Buttons
        safeListen('btn-launch', 'click', () => this.launchSimulation());
        safeListen('btn-back', 'click', () => this.showLandingPage());
        safeListen('btn-show-analysis', 'click', () => this.showAnalysisView());
        safeListen('btn-close-analysis', 'click', () => this.hideAnalysisView());

        // Modal UI
        safeListen('modal-close', 'click', () => this.hideModal());
        safeListen('modal', 'click', (e) => {
            if (e.target.id === 'modal') this.hideModal();
        });



        // Track Selector (Optional)
        const trackSelect = document.getElementById('track-select');
        if (trackSelect) {
            trackSelect.addEventListener('change', (e) => {
                this.track = new Track(e.target.value);
                this.resetVehicles();
                this.render();
            });
        }
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

        await api.reset().catch(err => console.warn('API reset failed:', err));

        this.vehicles = [];
        this.generation = 0;
        this.generationTime = 0;
        this.totalTime = 0;

        if (this.dashboard) this.dashboard.reset();
        if (this.nnVisualizer) this.nnVisualizer.setGenome(null);

        const btnStart = document.getElementById('btn-start');
        const btnPause = document.getElementById('btn-pause');
        const overlay = document.getElementById('canvas-overlay');

        if (btnStart) btnStart.disabled = false;
        if (btnPause) {
            btnPause.disabled = true;
            const span = btnPause.querySelector('span');
            if (span) span.textContent = 'Pause';
        }
        if (overlay) overlay.classList.remove('hidden');

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
                <input type="text" id="save-name" placeholder="Enter a name for this genome" class="form-control bg-dark text-light border-secondary">
            </div>
            <div class="config-group mt-3">
                <label for="save-desc">Description (optional)</label>
                <input type="text" id="save-desc" placeholder="Optional description" class="form-control bg-dark text-light border-secondary">
            </div>
            <button class="btn btn-primary mt-4 w-100" id="save-btn-action">Save Genome</button>
            <p id="save-status" class="mt-2 text-center small text-muted"></p>
        `;

        // Re-attach listener since we replaced innerHTML (which removed the old one if it was inside)
        // Wait, best practice is to NOT replace innerHTML of the button if we can avoid it, 
        // OR delegating the event.
        // But since I moved the listener to setupEventListeners, I need to make sure the ID exists.
        // Index.html doesn't have the button, it's created dynamically here.
        // So my previous move was wrong if the button is dynamic.

        // Let's attach the listener HERE, but ensuring we don't duplicate.
        // Better: Use a static modal structure in HTML and only update values.
        // But assuming current structure:
        // Let's attach the listener HERE, but ensuring we don't duplicate.
        // Better: Use a static modal structure in HTML and only update values.
        // But assuming current structure:
        document.getElementById('save-btn-action').addEventListener('click', () => this.handleSaveGenome());

        modal.classList.remove('hidden');
    }

    async handleSaveGenome() {
        const nameInput = document.getElementById('save-name');
        const descInput = document.getElementById('save-desc');
        const status = document.getElementById('save-status');

        if (!nameInput || !descInput || !status) return;

        const name = nameInput.value.trim();
        const desc = descInput.value.trim();

        if (!name) {
            status.textContent = 'Please enter a name';
            status.style.color = '#ff4444';
            return;
        }

        if (this.vehicles.length === 0) {
            status.textContent = 'No vehicles available. Please start the simulation first.';
            status.style.color = '#ff4444';
            return;
        }

        try {
            status.textContent = 'Saving...';
            status.style.color = '#ffffff';

            const genome = await api.getBestGenome();
            const bestVehicle = this.vehicles.reduce((a, b) => a.fitness > b.fitness ? a : b);

            const result = await api.saveGenome(name, genome, bestVehicle.fitness, this.generation, desc);
            console.log("Save result:", result);

            status.textContent = `Genome saved! (ID: ${result.id})`;
            status.style.color = '#00ff88';

            setTimeout(() => this.hideModal(), 1500);
        } catch (error) {
            console.error('Save failed:', error);
            status.textContent = 'Error: ' + error.message;
            status.style.color = '#ff4444';
        }
    }

    async showLoadModal() {
        const modal = document.getElementById('modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');

        title.textContent = 'Load Genome';
        body.innerHTML = '<p style="text-align: center;">Loading saved genomes...</p>';
        modal.classList.remove('hidden');

        try {
            console.log("Fetching genome list from:", api.baseUrl || CONFIG.API_BASE_URL);
            const genomes = await api.listGenomes();
            console.log("Fetched genomes:", genomes);

            if (!genomes || genomes.length === 0) {
                console.log("No genomes found, showing empty state.");
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

                        // Update visualizer
                        this.nnVisualizer.setGenome(data.genome);

                        // Update backend simulation state
                        await api.loadPopulation(data.genome, data.generation);

                        // Update local state
                        this.generation = data.generation;
                        this.dashboard.updateStats({ generation: this.generation });

                        // Reset vehicles for fresh start with new brain
                        this.resetVehicles();

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
            console.error("Error in showLoadModal:", error);
            alert(`Failed to load genomes:\n${error.message}\n\nCheck console for details.`);
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

    launchSimulation() {
        console.log('🚀 Launching Simulation...');

        const landingPage = document.getElementById('landing-page');
        const appElement = document.getElementById('app');

        // Transition animation
        landingPage.classList.add('fade-out');

        setTimeout(() => {
            landingPage.classList.add('hidden');
            appElement.classList.remove('hidden');

            // Force canvas resize and initial render
            this.resizeCanvas();
            this.render();
        }, 500);
    }

    async showLandingPage() {
        console.log('🔙 Returning to Landing Page...');

        // Start transition immediately for better UX
        const landingPage = document.getElementById('landing-page');
        const appElement = document.getElementById('app');

        if (appElement) appElement.style.opacity = '0';

        // Stop and reset simulation in background
        this.reset().catch(err => console.error('Reset error during navigation:', err));

        setTimeout(() => {
            if (appElement) {
                appElement.classList.add('hidden');
                appElement.style.opacity = '';
            }
            if (landingPage) {
                landingPage.classList.remove('hidden', 'fade-out');
            }
        }, 300);
    }

    showAnalysisView() {
        console.log('🔍 Opening Analysis View...');
        const analysisView = document.getElementById('analysis-view');
        if (analysisView) {
            analysisView.classList.remove('hidden');
            // Force redraw of canvases
            if (this.nnVisualizer) this.nnVisualizer.resize();
            if (this.dashboard) this.dashboard.resizeChart();

            // Log entry
            this.addLogEntry('System switched to high-resolution analysis mode');
        }
    }

    hideAnalysisView() {
        console.log('🔒 Closing Analysis View...');
        const analysisView = document.getElementById('analysis-view');
        if (analysisView) {
            analysisView.classList.add('hidden');
        }
    }

    addLogEntry(msg) {
        const log = document.getElementById('analysis-log');
        const container = log ? log.parentElement : null;
        if (log) {
            const time = new Date().toLocaleTimeString();
            const newEntry = `> [${time}] ${msg}<br>`;

            // Keep up to 50 recent entries
            log.innerHTML = newEntry + log.innerHTML.split('<br>').slice(0, 50).join('<br>');

            // Note: Since we are prepending (newest at top), we don't need to scroll down.
            // If we wanted oldest at bottom, we would append and scroll.
            // Keeping newest at top is better for immediate visibility.
        }
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SimulationApp();
});
