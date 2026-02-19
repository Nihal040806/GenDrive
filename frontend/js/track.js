/**
 * Track definitions and management
 * Defines the environment boundaries using polygons
 */
class Track {
    constructor(type = 'oval') {
        this.type = type;
        this.outerBoundary = [];
        this.innerBoundary = [];
        this.checkpoints = [];
        this.startPosition = { x: 0, y: 0, angle: 0 };
        this.walls = [];

        this.generate(type);
    }

    /**
     * Generate track based on type
     */
    generate(type) {
        const canvas = document.getElementById('simulation-canvas');
        const width = canvas.width || 800;
        const height = canvas.height || 600;

        switch (type) {
            case 'oval':
                this.generateOval(width, height);
                break;
            case 'figure8':
                this.generateFigure8(width, height);
                break;
            case 'complex':
                this.generateComplex(width, height);
                break;
            default:
                this.generateOval(width, height);
        }

        this.buildWalls();
    }

    /**
     * Generate oval track
     */
    generateOval(width, height) {
        const cx = width / 2;
        const cy = height / 2;
        const outerRadiusX = width * 0.4;
        const outerRadiusY = height * 0.35;
        const innerRadiusX = width * 0.25;
        const innerRadiusY = height * 0.2;
        const trackWidth = 60;

        // Generate outer boundary
        this.outerBoundary = this.generateEllipse(cx, cy, outerRadiusX, outerRadiusY, 60);

        // Generate inner boundary
        this.innerBoundary = this.generateEllipse(cx, cy, innerRadiusX, innerRadiusY, 60);

        // Start position
        this.startPosition = {
            x: cx + (outerRadiusX + innerRadiusX) / 2,
            y: cy,
            angle: -Math.PI / 2
        };

        // Generate checkpoints
        this.generateCheckpoints(cx, cy, outerRadiusX, outerRadiusY, innerRadiusX, innerRadiusY, 10);
    }

    /**
     * Generate figure-8 track
     */
    generateFigure8(width, height) {
        const cx = width / 2;
        const cy = height / 2;
        const radius = Math.min(width, height) * 0.18;
        const offset = radius * 1.5;
        const trackWidth = 50;

        // Left circle outer
        const leftOuterPoints = this.generateEllipse(cx - offset, cy, radius + trackWidth / 2, radius + trackWidth / 2, 30);

        // Right circle outer
        const rightOuterPoints = this.generateEllipse(cx + offset, cy, radius + trackWidth / 2, radius + trackWidth / 2, 30);

        // Combine into figure-8 outer boundary
        this.outerBoundary = this.combineFigure8(leftOuterPoints, rightOuterPoints, cx, cy, true);

        // Left circle inner
        const leftInnerPoints = this.generateEllipse(cx - offset, cy, radius - trackWidth / 2, radius - trackWidth / 2, 30);

        // Right circle inner  
        const rightInnerPoints = this.generateEllipse(cx + offset, cy, radius - trackWidth / 2, radius - trackWidth / 2, 30);

        // This track has separate inner boundaries for each loop
        this.innerBoundary = [];
        this.innerBoundaries = [leftInnerPoints, rightInnerPoints];

        // Start position
        this.startPosition = {
            x: cx,
            y: cy - trackWidth / 2,
            angle: 0
        };

        // Checkpoints
        this.checkpoints = [
            { x1: cx - offset - radius, y1: cy - trackWidth, x2: cx - offset - radius, y2: cy + trackWidth },
            { x1: cx - offset, y1: cy - radius - trackWidth, x2: cx - offset, y2: cy - radius + trackWidth },
            { x1: cx - offset + radius, y1: cy - trackWidth, x2: cx - offset + radius, y2: cy + trackWidth },
            { x1: cx + offset - radius, y1: cy - trackWidth, x2: cx + offset - radius, y2: cy + trackWidth },
            { x1: cx + offset, y1: cy + radius - trackWidth, x2: cx + offset, y2: cy + radius + trackWidth },
            { x1: cx + offset + radius, y1: cy - trackWidth, x2: cx + offset + radius, y2: cy + trackWidth },
        ];
    }

    /**
     * Generate complex course
     */
    generateComplex(width, height) {
        const margin = 50;
        const trackWidth = 60;

        // Define outer path points
        this.outerBoundary = [
            { x: margin, y: margin },
            { x: width - margin, y: margin },
            { x: width - margin, y: height * 0.3 },
            { x: width * 0.6, y: height * 0.3 },
            { x: width * 0.6, y: height * 0.5 },
            { x: width - margin, y: height * 0.5 },
            { x: width - margin, y: height - margin },
            { x: margin, y: height - margin },
            { x: margin, y: height * 0.7 },
            { x: width * 0.4, y: height * 0.7 },
            { x: width * 0.4, y: height * 0.5 },
            { x: margin, y: height * 0.5 },
        ];

        // Generate inner boundary by offsetting
        this.innerBoundary = this.offsetPath(this.outerBoundary, -trackWidth);

        // Start position
        this.startPosition = {
            x: margin + trackWidth / 2,
            y: margin + trackWidth / 2,
            angle: 0
        };

        // Checkpoints along the path
        this.checkpoints = [
            { x1: width * 0.3, y1: margin, x2: width * 0.3, y2: margin + trackWidth },
            { x1: width - margin - trackWidth, y1: height * 0.2, x2: width - margin, y2: height * 0.2 },
            { x1: width * 0.6, y1: height * 0.4, x2: width * 0.6 + trackWidth, y2: height * 0.4 },
            { x1: width * 0.7, y1: height - margin - trackWidth, x2: width * 0.7, y2: height - margin },
            { x1: margin, y1: height * 0.8, x2: margin + trackWidth, y2: height * 0.8 },
        ];
    }

    /**
     * Generate ellipse points
     */
    generateEllipse(cx, cy, radiusX, radiusY, segments) {
        const points = [];
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push({
                x: cx + Math.cos(angle) * radiusX,
                y: cy + Math.sin(angle) * radiusY
            });
        }
        return points;
    }

    /**
     * Offset a path inward or outward
     */
    offsetPath(path, offset) {
        const result = [];
        const n = path.length;

        for (let i = 0; i < n; i++) {
            const prev = path[(i - 1 + n) % n];
            const curr = path[i];
            const next = path[(i + 1) % n];

            // Calculate normals
            const dx1 = curr.x - prev.x;
            const dy1 = curr.y - prev.y;
            const dx2 = next.x - curr.x;
            const dy2 = next.y - curr.y;

            const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
            const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

            const nx1 = -dy1 / len1;
            const ny1 = dx1 / len1;
            const nx2 = -dy2 / len2;
            const ny2 = dx2 / len2;

            // Average normals
            const nx = (nx1 + nx2) / 2;
            const ny = (ny1 + ny2) / 2;
            const nlen = Math.sqrt(nx * nx + ny * ny);

            result.push({
                x: curr.x + (nx / nlen) * offset,
                y: curr.y + (ny / nlen) * offset
            });
        }

        return result;
    }

    /**
     * Combine two circles into figure-8
     */
    combineFigure8(left, right, cx, cy, isOuter) {
        // For simplicity, just return the outer boundary points
        // In a real implementation, this would properly blend the two circles
        return [...left, ...right];
    }

    /**
     * Generate checkpoints for oval track
     */
    generateCheckpoints(cx, cy, outerRx, outerRy, innerRx, innerRy, count) {
        this.checkpoints = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            this.checkpoints.push({
                x1: cx + Math.cos(angle) * innerRx,
                y1: cy + Math.sin(angle) * innerRy,
                x2: cx + Math.cos(angle) * outerRx,
                y2: cy + Math.sin(angle) * outerRy
            });
        }
    }

    /**
     * Build wall segments from boundaries
     */
    buildWalls() {
        this.walls = [];

        // Outer walls
        for (let i = 0; i < this.outerBoundary.length; i++) {
            const p1 = this.outerBoundary[i];
            const p2 = this.outerBoundary[(i + 1) % this.outerBoundary.length];
            this.walls.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
        }

        // Inner walls
        if (this.innerBoundary.length > 0) {
            for (let i = 0; i < this.innerBoundary.length; i++) {
                const p1 = this.innerBoundary[i];
                const p2 = this.innerBoundary[(i + 1) % this.innerBoundary.length];
                this.walls.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
            }
        }

        // Handle figure-8 inner boundaries
        if (this.innerBoundaries) {
            for (const boundary of this.innerBoundaries) {
                for (let i = 0; i < boundary.length; i++) {
                    const p1 = boundary[i];
                    const p2 = boundary[(i + 1) % boundary.length];
                    this.walls.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
                }
            }
        }
    }

    /**
     * Render the track
     */
    render(ctx) {
        // Draw track fill
        ctx.fillStyle = CONFIG.COLORS.TRACK_FILL;
        ctx.beginPath();
        if (this.outerBoundary.length > 0) {
            ctx.moveTo(this.outerBoundary[0].x, this.outerBoundary[0].y);
            for (let i = 1; i < this.outerBoundary.length; i++) {
                ctx.lineTo(this.outerBoundary[i].x, this.outerBoundary[i].y);
            }
            ctx.closePath();
        }
        ctx.fill();

        // Cut out inner area
        if (this.innerBoundary.length > 0) {
            ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
            ctx.beginPath();
            ctx.moveTo(this.innerBoundary[0].x, this.innerBoundary[0].y);
            for (let i = 1; i < this.innerBoundary.length; i++) {
                ctx.lineTo(this.innerBoundary[i].x, this.innerBoundary[i].y);
            }
            ctx.closePath();
            ctx.fill();
        }

        // Handle figure-8 inner boundaries
        if (this.innerBoundaries) {
            ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
            for (const boundary of this.innerBoundaries) {
                ctx.beginPath();
                ctx.moveTo(boundary[0].x, boundary[0].y);
                for (let i = 1; i < boundary.length; i++) {
                    ctx.lineTo(boundary[i].x, boundary[i].y);
                }
                ctx.closePath();
                ctx.fill();
            }
        }

        // Draw outer border
        ctx.strokeStyle = CONFIG.COLORS.TRACK_BORDER;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (this.outerBoundary.length > 0) {
            ctx.moveTo(this.outerBoundary[0].x, this.outerBoundary[0].y);
            for (let i = 1; i < this.outerBoundary.length; i++) {
                ctx.lineTo(this.outerBoundary[i].x, this.outerBoundary[i].y);
            }
            ctx.closePath();
        }
        ctx.stroke();

        // Draw inner border
        if (this.innerBoundary.length > 0) {
            ctx.beginPath();
            ctx.moveTo(this.innerBoundary[0].x, this.innerBoundary[0].y);
            for (let i = 1; i < this.innerBoundary.length; i++) {
                ctx.lineTo(this.innerBoundary[i].x, this.innerBoundary[i].y);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // Handle figure-8 inner boundaries
        if (this.innerBoundaries) {
            for (const boundary of this.innerBoundaries) {
                ctx.beginPath();
                ctx.moveTo(boundary[0].x, boundary[0].y);
                for (let i = 1; i < boundary.length; i++) {
                    ctx.lineTo(boundary[i].x, boundary[i].y);
                }
                ctx.closePath();
                ctx.stroke();
            }
        }

        // Draw checkpoints
        ctx.strokeStyle = CONFIG.COLORS.CHECKPOINT_LINE;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        for (const cp of this.checkpoints) {
            ctx.beginPath();
            ctx.moveTo(cp.x1, cp.y1);
            ctx.lineTo(cp.x2, cp.y2);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Draw start position
        ctx.fillStyle = CONFIG.COLORS.VEHICLE_BEST;
        ctx.beginPath();
        ctx.arc(this.startPosition.x, this.startPosition.y, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Get walls for collision detection
     */
    getWalls() {
        return this.walls;
    }

    /**
     * Get checkpoints
     */
    getCheckpoints() {
        return this.checkpoints;
    }
}
