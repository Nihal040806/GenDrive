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
            simTime: document.getElementById('sim-time')
        };

        // Fitness chart
        this.chartCanvas = document.getElementById('fitness-chart');
        this.chartCtx = this.chartCanvas.getContext('2d');
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
        // Toggle config panel
        const configToggle = document.getElementById('config-toggle');
        const configCard = configToggle.closest('.config-card');
        configToggle.addEventListener('click', () => {
            configCard.classList.toggle('collapsed');
        });

        // Range input listeners
        this.configElements.mutation.addEventListener('input', (e) => {
            this.configElements.mutationValue.textContent = Math.round(e.target.value * 100) + '%';
        });

        this.configElements.crossover.addEventListener('input', (e) => {
            this.configElements.crossoverValue.textContent = Math.round(e.target.value * 100) + '%';
        });

        this.configElements.elitism.addEventListener('input', (e) => {
            this.configElements.elitismValue.textContent = Math.round(e.target.value * 100) + '%';
        });
    }

    /**
     * Resize chart canvas
     */
    resizeChart() {
        const rect = this.chartCanvas.parentElement.getBoundingClientRect();
        this.chartCanvas.width = rect.width - 32;
        this.chartCanvas.height = 120;
        this.renderChart();
    }

    /**
     * Update displayed statistics
     */
    updateStats(stats) {
        if (stats.generation !== undefined) {
            this.elements.generation.textContent = stats.generation;
        }
        if (stats.alive !== undefined) {
            this.elements.alive.textContent = stats.alive;
        }
        if (stats.bestFitness !== undefined) {
            this.elements.bestFitness.textContent = Utils.formatNumber(stats.bestFitness, 1);
        }
        if (stats.avgFitness !== undefined) {
            this.elements.avgFitness.textContent = Utils.formatNumber(stats.avgFitness, 1);
        }
        if (stats.mutationRate !== undefined) {
            this.elements.mutation.textContent = (stats.mutationRate * 100).toFixed(1) + '%';
        }
        if (stats.population !== undefined) {
            this.elements.population.textContent = stats.population;
        }
    }

    /**
     * Update FPS counter
     */
    updateFPS(fps) {
        this.elements.fpsCounter.textContent = Math.round(fps);
    }

    /**
     * Update simulation time
     */
    updateTime(ms) {
        this.elements.simTime.textContent = Utils.formatTime(ms);
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
        const ctx = this.chartCtx;
        const width = this.chartCanvas.width;
        const height = this.chartCanvas.height;
        const padding = { top: 10, right: 10, bottom: 20, left: 40 };

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
            population_size: parseInt(this.configElements.population.value),
            mutation_rate: parseFloat(this.configElements.mutation.value),
            crossover_rate: parseFloat(this.configElements.crossover.value),
            elitism_rate: parseFloat(this.configElements.elitism.value),
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
            population: CONFIG.POPULATION_SIZE
        });
        this.updateTime(0);
        this.renderChart();
    }
}
