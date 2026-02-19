/**
 * Dashboard management
 * Handles metrics display and fitness chart
 */
class Dashboard {
    constructor() {
        // Stats elements
        this.elements = {
            generation: document.getElementById('stat-generation'),
            alive: document.getElementById('stat-alive'),
            bestFitness: document.getElementById('stat-best-fitness'),
            avgFitness: document.getElementById('stat-avg-fitness'),
            mutation: document.getElementById('stat-mutation'),
            population: document.getElementById('stat-population'),
            fpsCounter: document.getElementById('fps-counter'),
            simTime: document.getElementById('sim-time'),
            // Analysis page elements
            analysisGeneration: document.getElementById('analysis-generation'),
            analysisBest: document.getElementById('analysis-best'),
            analysisRate: document.getElementById('analysis-rate')
        };

        // Fitness charts
        this.chartCanvas = document.getElementById('fitness-chart');
        if (this.chartCanvas) {
            this.chartCtx = this.chartCanvas.getContext('2d');
        }

        this.analysisCanvas = document.getElementById('fitness-chart-analysis');
        if (this.analysisCanvas) {
            this.analysisCtx = this.analysisCanvas.getContext('2d');
        }

        this.fitnessHistory = {
            best: [],
            average: []
        };

        // Configuration elements
        this.configElements = {
            population: document.getElementById('config-population'),
            mutation: document.getElementById('config-mutation'),
            mutationValue: document.getElementById('config-mutation-value'),
            crossover: document.getElementById('config-crossover'),
            crossoverValue: document.getElementById('config-crossover-value'),
            elitism: document.getElementById('config-elitism'),
            elitismValue: document.getElementById('config-elitism-value')
        };

        this.setupConfigListeners();
        this.resizeChart();
        window.addEventListener('resize', () => this.resizeChart());
    }

    /**
     * Setup configuration input listeners
     */
    setupConfigListeners() {
        // Toggle config panel - Removed for unified scrollable dashboard

        // Range input listeners with null checks
        if (this.configElements.mutation && this.configElements.mutationValue) {
            this.configElements.mutation.addEventListener('input', (e) => {
                this.configElements.mutationValue.textContent = Math.round(e.target.value * 100) + '%';
            });
        }

        if (this.configElements.crossover && this.configElements.crossoverValue) {
            this.configElements.crossover.addEventListener('input', (e) => {
                this.configElements.crossoverValue.textContent = Math.round(e.target.value * 100) + '%';
            });
        }

        if (this.configElements.elitism && this.configElements.elitismValue) {
            this.configElements.elitism.addEventListener('input', (e) => {
                this.configElements.elitismValue.textContent = Math.round(e.target.value * 100) + '%';
            });
        }

        // Live Population Sync
        if (this.configElements.population) {
            this.configElements.population.addEventListener('input', (e) => {
                const val = e.target.value || 0;

                // 1. Update Overlay Text
                const overlay = document.getElementById('overlay-agent-count');
                if (overlay) overlay.textContent = val + ' Agents';

                // 2. Update Sidebar Stat
                if (this.elements.population) {
                    this.elements.population.textContent = val;
                }

                console.log(`Live sync: population set to ${val}`);
            });
        }
    }

    /**
     * Resize chart canvas
     */
    resizeChart() {
        if (this.chartCanvas) {
            const rect = this.chartCanvas.parentElement.getBoundingClientRect();
            this.chartCanvas.width = rect.width - 32;
            this.chartCanvas.height = 120;
        }

        if (this.analysisCanvas) {
            const analysisRect = this.analysisCanvas.parentElement.getBoundingClientRect();
            this.analysisCanvas.width = analysisRect.width - 48;
            this.analysisCanvas.height = analysisRect.height - 48;
        }

        this.renderChart();
    }

    /**
     * Update displayed statistics
     */
    updateStats(stats) {
        if (stats.generation !== undefined) {
            if (this.elements.generation) this.elements.generation.textContent = stats.generation;
            if (this.elements.analysisGeneration) this.elements.analysisGeneration.textContent = stats.generation;
        }
        if (stats.alive !== undefined && this.elements.alive) {
            this.elements.alive.textContent = stats.alive;
        }
        if (stats.bestFitness !== undefined) {
            const val = Utils.formatNumber(stats.bestFitness, 1);
            if (this.elements.bestFitness) this.elements.bestFitness.textContent = val;
            if (this.elements.analysisBest) this.elements.analysisBest.textContent = val;
        }
        if (stats.avgFitness !== undefined && this.elements.avgFitness) {
            this.elements.avgFitness.textContent = Utils.formatNumber(stats.avgFitness, 1);
        }
        if (stats.mutationRate !== undefined && this.elements.mutation) {
            this.elements.mutation.textContent = (stats.mutationRate * 100).toFixed(1) + '%';
        }
        if (stats.population !== undefined && this.elements.population) {
            this.elements.population.textContent = stats.population;
        }

        // Update analysis rate (example logic)
        if (this.elements.analysisRate && this.fitnessHistory.best.length > 5) {
            const recent = this.fitnessHistory.best.slice(-5);
            const growth = recent[recent.length - 1] - recent[0];
            this.elements.analysisRate.textContent = growth > 0 ? 'Improving' : 'Stagnant';
            this.elements.analysisRate.style.color = growth > 0 ? 'var(--accent-success)' : 'var(--text-muted)';
        }
    }

    /**
     * Update FPS counter
     */
    updateFPS(fps) {
        if (this.elements.fpsCounter) {
            this.elements.fpsCounter.textContent = Math.round(fps);
        }
    }

    /**
     * Update simulation time
     */
    updateTime(ms) {
        if (this.elements.simTime) {
            this.elements.simTime.textContent = Utils.formatTime(ms);
        }
    }

    /**
     * Add fitness values to history
     */
    addFitnessData(bestFitness, avgFitness) {
        this.fitnessHistory.best.push(bestFitness);
        this.fitnessHistory.average.push(avgFitness);

        // Keep only last 50 generations
        if (this.fitnessHistory.best.length > 50) {
            this.fitnessHistory.best.shift();
            this.fitnessHistory.average.shift();
        }

        this.renderChart();
    }

    /**
     * Render fitness chart
     */
    renderChart() {
        if (this.chartCtx && this.chartCanvas) {
            this._drawOnCanvas(this.chartCtx, this.chartCanvas, 120);
        }
        if (this.analysisCtx && this.analysisCanvas) {
            this._drawOnCanvas(this.analysisCtx, this.analysisCanvas, this.analysisCanvas.height);
        }
    }

    /**
     * Private draw helper
     */
    _drawOnCanvas(ctx, canvas, height) {
        const width = canvas.width;
        const padding = { top: 20, right: 20, bottom: 30, left: 50 };

        // Clear
        ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
        ctx.fillRect(0, 0, width, height);

        if (this.fitnessHistory.best.length < 2) {
            ctx.fillStyle = '#606070';
            ctx.font = '12px Rajdhani';
            ctx.textAlign = 'center';
            ctx.fillText('Chart data will appear after generation 1', width / 2, height / 2);
            return;
        }

        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Calculate scales
        const maxFitness = Math.max(...this.fitnessHistory.best, ...this.fitnessHistory.average) * 1.1;
        const minFitness = 0;
        const numPoints = this.fitnessHistory.best.length;

        const xScale = chartWidth / (numPoints - 1);
        const yScale = chartHeight / (maxFitness - minFitness);

        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        // Horizontal grid lines
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            // Y axis labels
            const value = maxFitness - (maxFitness / 4) * i;
            ctx.fillStyle = '#606070';
            ctx.font = '10px Rajdhani';
            ctx.textAlign = 'right';
            ctx.fillText(Utils.formatNumber(value, 0), padding.left - 5, y + 3);
        }

        // Draw average fitness line
        ctx.strokeStyle = 'rgba(123, 44, 191, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < numPoints; i++) {
            const x = padding.left + i * xScale;
            const y = padding.top + chartHeight - (this.fitnessHistory.average[i] - minFitness) * yScale;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Draw best fitness line
        ctx.strokeStyle = CONFIG.COLORS.NN_NEURON;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < numPoints; i++) {
            const x = padding.left + i * xScale;
            const y = padding.top + chartHeight - (this.fitnessHistory.best[i] - minFitness) * yScale;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Add glow to best fitness line
        ctx.shadowColor = CONFIG.COLORS.NN_NEURON;
        ctx.shadowBlur = 5;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Legend
        ctx.font = '10px Rajdhani';
        ctx.textAlign = 'left';

        ctx.fillStyle = CONFIG.COLORS.NN_NEURON;
        ctx.fillRect(width - 80, 5, 10, 10);
        ctx.fillStyle = '#a0a0b0';
        ctx.fillText('Best', width - 65, 13);

        ctx.fillStyle = 'rgba(123, 44, 191, 0.8)';
        ctx.fillRect(width - 80, 20, 10, 10);
        ctx.fillStyle = '#a0a0b0';
        ctx.fillText('Avg', width - 65, 28);
    }

    /**
     * Get current configuration values
     */
    getConfig() {
        return {
            population_size: this.configElements.population ? parseInt(this.configElements.population.value) : CONFIG.POPULATION_SIZE,
            mutation_rate: this.configElements.mutation ? parseFloat(this.configElements.mutation.value) : CONFIG.MUTATION_RATE,
            crossover_rate: this.configElements.crossover ? parseFloat(this.configElements.crossover.value) : (CONFIG.CROSSOVER_RATE || 0.7),
            elitism_rate: this.configElements.elitism ? parseFloat(this.configElements.elitism.value) : (CONFIG.ELITISM_RATE || 0.1),
            layer_sizes: CONFIG.LAYER_SIZES,
            mutation_strength: CONFIG.MUTATION_STRENGTH,
            tournament_size: CONFIG.TOURNAMENT_SIZE
        };
    }

    /**
     * Reset dashboard
     */
    reset() {
        this.fitnessHistory = { best: [], average: [] };
        this.updateStats({
            generation: 0,
            alive: 0,
            bestFitness: 0,
            avgFitness: 0,
            mutationRate: CONFIG.MUTATION_RATE,
            population: this.configElements.population ? parseInt(this.configElements.population.value) : CONFIG.POPULATION_SIZE
        });
        this.updateTime(0);
        this.renderChart();
    }
}
