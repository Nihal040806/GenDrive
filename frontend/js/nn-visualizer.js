/**
 * Neural Network Visualization
 * Renders the neural network architecture and activation levels
 */
class NNVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.genome = null;
        this.activations = null;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * Resize canvas to container
     */
    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 32; // Account for padding
        this.canvas.height = 150;
    }

    /**
     * Set the genome to visualize
     * @param {Object} genome - Neural network genome with layer_sizes, weights
     */
    setGenome(genome) {
        this.genome = genome;
        this.render();
    }

    /**
     * Update with activation values
     * @param {Array} inputs - Input layer activations
     * @param {Array} outputs - Output layer activations
     */
    setActivations(inputs, outputs) {
        this.activations = { inputs, outputs };
        this.render();
    }

    /**
     * Render the neural network visualization
     */
    render() {
        if (!this.genome) {
            this.renderPlaceholder();
            return;
        }

        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear canvas
        ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
        ctx.fillRect(0, 0, width, height);

        const layerSizes = this.genome.layer_sizes;
        const numLayers = layerSizes.length;
        const layerSpacing = width / (numLayers + 1);
        const padding = 20;

        // Calculate node positions
        const nodePositions = [];

        for (let l = 0; l < numLayers; l++) {
            const layerNodes = [];
            const numNodes = layerSizes[l];
            const nodeSpacing = (height - padding * 2) / (numNodes + 1);

            for (let n = 0; n < numNodes; n++) {
                layerNodes.push({
                    x: layerSpacing * (l + 1),
                    y: padding + nodeSpacing * (n + 1)
                });
            }
            nodePositions.push(layerNodes);
        }

        // Draw connections (weights)
        if (this.genome.weights) {
            for (let l = 0; l < this.genome.weights.length; l++) {
                const weightMatrix = this.genome.weights[l];

                for (let i = 0; i < weightMatrix.length; i++) {
                    for (let j = 0; j < weightMatrix[i].length; j++) {
                        const weight = weightMatrix[i][j];
                        const absWeight = Math.abs(weight);

                        const fromNode = nodePositions[l][i];
                        const toNode = nodePositions[l + 1][j];

                        if (fromNode && toNode) {
                            // Color based on weight sign
                            const alpha = Utils.clamp(absWeight * 0.5, 0.1, 0.8);
                            ctx.strokeStyle = weight >= 0
                                ? `rgba(0, 255, 136, ${alpha})`
                                : `rgba(255, 68, 68, ${alpha})`;
                            ctx.lineWidth = Utils.clamp(absWeight * 2, 0.5, 3);

                            ctx.beginPath();
                            ctx.moveTo(fromNode.x, fromNode.y);
                            ctx.lineTo(toNode.x, toNode.y);
                            ctx.stroke();
                        }
                    }
                }
            }
        }

        // Draw nodes
        for (let l = 0; l < numLayers; l++) {
            for (let n = 0; n < nodePositions[l].length; n++) {
                const node = nodePositions[l][n];
                let activation = 0.5;

                // Get activation if available
                if (this.activations) {
                    if (l === 0 && this.activations.inputs && this.activations.inputs[n] !== undefined) {
                        activation = this.activations.inputs[n];
                    } else if (l === numLayers - 1 && this.activations.outputs && this.activations.outputs[n] !== undefined) {
                        // Map outputs appropriately
                        if (n === 0) {
                            activation = (this.activations.outputs[0] + 1) / 2; // Steering: -1 to 1 -> 0 to 1
                        } else {
                            activation = this.activations.outputs[1] || 0.5;
                        }
                    }
                }

                const radius = l === 0 || l === numLayers - 1 ? 8 : 6;

                // Node glow based on activation
                if (activation > 0.6) {
                    ctx.shadowColor = CONFIG.COLORS.NN_NEURON;
                    ctx.shadowBlur = 10 * activation;
                } else {
                    ctx.shadowBlur = 0;
                }

                // Node fill based on activation
                const brightness = Utils.clamp(activation, 0.2, 1);
                ctx.fillStyle = Utils.lerpColor('#1a1a25', CONFIG.COLORS.NN_NEURON, brightness);

                ctx.beginPath();
                ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
                ctx.fill();

                // Node border
                ctx.strokeStyle = CONFIG.COLORS.NN_NEURON;
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.shadowBlur = 0;
            }
        }

        // Draw layer labels
        ctx.fillStyle = '#606070';
        ctx.font = '10px Rajdhani';
        ctx.textAlign = 'center';

        const labels = ['Input', ...Array(numLayers - 2).fill('Hidden'), 'Output'];
        for (let l = 0; l < numLayers; l++) {
            ctx.fillText(labels[Math.min(l, labels.length - 1)], layerSpacing * (l + 1), height - 5);
        }
    }

    /**
     * Render placeholder when no genome is set
     */
    renderPlaceholder() {
        const ctx = this.ctx;
        ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = '#606070';
        ctx.font = '14px Rajdhani';
        ctx.textAlign = 'center';
        ctx.fillText('Neural network will appear here', this.canvas.width / 2, this.canvas.height / 2);
    }
}
