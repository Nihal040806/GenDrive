/**
 * Raycasting system for agent sensors
 * Uses line-line intersection for boundary detection
 */
class RayCaster {
    constructor(sensorCount, sensorLength, sensorSpread) {
        this.sensorCount = sensorCount;
        this.sensorLength = sensorLength;
        this.sensorSpread = sensorSpread;
        this.rays = [];
        this.readings = [];
    }

    /**
     * Cast rays from a given position and angle
     * @param {number} x - Origin X
     * @param {number} y - Origin Y
     * @param {number} angle - Direction angle
     * @param {Array} walls - Array of wall segments
     * @returns {Array} Normalized sensor readings (0-1, where 1 is far)
     */
    cast(x, y, angle, walls) {
        this.rays = [];
        this.readings = [];

        // Calculate angle step between sensors
        const angleStep = this.sensorSpread / (this.sensorCount - 1);
        const startAngle = angle - this.sensorSpread / 2;

        for (let i = 0; i < this.sensorCount; i++) {
            const rayAngle = startAngle + angleStep * i;

            // Calculate ray end point
            const endX = x + Math.cos(rayAngle) * this.sensorLength;
            const endY = y + Math.sin(rayAngle) * this.sensorLength;

            const ray = {
                x1: x,
                y1: y,
                x2: endX,
                y2: endY,
                angle: rayAngle
            };

            // Find closest intersection
            let closestDistance = this.sensorLength;
            let hitPoint = null;

            for (const wall of walls) {
                const intersection = this.lineLineIntersection(
                    ray.x1, ray.y1, ray.x2, ray.y2,
                    wall.x1, wall.y1, wall.x2, wall.y2
                );

                if (intersection) {
                    const dist = Utils.distance(x, y, intersection.x, intersection.y);
                    if (dist < closestDistance) {
                        closestDistance = dist;
                        hitPoint = intersection;
                    }
                }
            }

            // Update ray with hit information
            ray.hitDistance = closestDistance;
            ray.hitPoint = hitPoint;
            ray.hit = hitPoint !== null;

            this.rays.push(ray);

            // Normalize reading (0 = close/hit, 1 = far/no hit)
            const normalizedReading = closestDistance / this.sensorLength;
            this.readings.push(normalizedReading);
        }

        return this.readings;
    }

    /**
     * Line-line intersection using parametric form
     * @returns {Object|null} Intersection point or null if no intersection
     */
    lineLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
        // Line 1: P1 to P2
        // Line 2: P3 to P4

        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

        // Lines are parallel
        if (Math.abs(denom) < 0.0001) {
            return null;
        }

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        // Check if intersection is within both line segments
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: x1 + t * (x2 - x1),
                y: y1 + t * (y2 - y1)
            };
        }

        return null;
    }

    /**
     * Render rays for visualization
     */
    render(ctx, showHits = true) {
        for (const ray of this.rays) {
            // Draw ray line
            ctx.strokeStyle = ray.hit ? CONFIG.COLORS.SENSOR_HIT : CONFIG.COLORS.SENSOR_LINE;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ray.x1, ray.y1);

            if (ray.hitPoint) {
                ctx.lineTo(ray.hitPoint.x, ray.hitPoint.y);
            } else {
                ctx.lineTo(ray.x2, ray.y2);
            }
            ctx.stroke();

            // Draw hit point
            if (showHits && ray.hitPoint) {
                ctx.fillStyle = CONFIG.COLORS.SENSOR_HIT;
                ctx.beginPath();
                ctx.arc(ray.hitPoint.x, ray.hitPoint.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    /**
     * Get sensor readings as array
     */
    getReadings() {
        return [...this.readings];
    }
}
