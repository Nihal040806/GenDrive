/**
 * Collision detection system
 * Uses polygon intersection for vehicle-boundary collision
 */
class CollisionDetector {
    /**
     * Check if a point is inside a polygon
     * Uses ray casting algorithm
     */
    static pointInPolygon(x, y, polygon) {
        let inside = false;
        const n = polygon.length;

        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = polygon[i].x;
            const yi = polygon[i].y;
            const xj = polygon[j].x;
            const yj = polygon[j].y;

            if (((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }

        return inside;
    }

    /**
     * Check if a line segment intersects with a polygon
     */
    static linePolygonIntersection(x1, y1, x2, y2, polygon) {
        const n = polygon.length;

        for (let i = 0; i < n; i++) {
            const p1 = polygon[i];
            const p2 = polygon[(i + 1) % n];

            if (this.lineLineIntersection(x1, y1, x2, y2, p1.x, p1.y, p2.x, p2.y)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check line-line intersection
     */
    static lineLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

        if (Math.abs(denom) < 0.0001) {
            return false;
        }

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }

    /**
     * Check if vehicle (represented as rectangle) collides with walls
     * @param {Object} vehicle - Vehicle with x, y, angle, width, height
     * @param {Array} walls - Array of wall segments
     * @returns {boolean} True if collision detected
     */
    static checkVehicleCollision(vehicle, walls) {
        // Get vehicle corners
        const corners = this.getVehicleCorners(vehicle);

        // Check each edge of vehicle against each wall
        for (let i = 0; i < corners.length; i++) {
            const c1 = corners[i];
            const c2 = corners[(i + 1) % corners.length];

            for (const wall of walls) {
                if (this.lineLineIntersection(
                    c1.x, c1.y, c2.x, c2.y,
                    wall.x1, wall.y1, wall.x2, wall.y2
                )) {
                    return true;
                }
            }
        }

        // Also check center point against walls
        // (in case vehicle spawned inside a wall)
        for (const corner of corners) {
            for (let i = 0; i < walls.length - 1; i++) {
                const wall = walls[i];
                const nextWall = walls[i + 1];
                // Simple proximity check
                const dist = this.pointToLineDistance(
                    corner.x, corner.y,
                    wall.x1, wall.y1, wall.x2, wall.y2
                );
                if (dist < 2) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Get vehicle corner points based on position and rotation
     */
    static getVehicleCorners(vehicle) {
        const { x, y, angle, width, height } = vehicle;
        const hw = width / 2;
        const hh = height / 2;

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Calculate corners relative to center, then rotate
        const corners = [
            { rx: hw, ry: -hh },   // Front right
            { rx: hw, ry: hh },    // Front left
            { rx: -hw, ry: hh },   // Back left
            { rx: -hw, ry: -hh }   // Back right
        ];

        return corners.map(c => ({
            x: x + c.rx * cos - c.ry * sin,
            y: y + c.rx * sin + c.ry * cos
        }));
    }

    /**
     * Calculate distance from point to line segment
     */
    static pointToLineDistance(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;

        if (lengthSquared === 0) {
            return Utils.distance(px, py, x1, y1);
        }

        let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
        t = Utils.clamp(t, 0, 1);

        const projX = x1 + t * dx;
        const projY = y1 + t * dy;

        return Utils.distance(px, py, projX, projY);
    }

    /**
     * Check if vehicle crossed a checkpoint
     * @param {Object} vehicle - Vehicle with previous and current position
     * @param {Object} checkpoint - Checkpoint with x1, y1, x2, y2
     * @returns {boolean} True if checkpoint was crossed
     */
    static checkCheckpointCrossing(prevX, prevY, currX, currY, checkpoint) {
        return this.lineLineIntersection(
            prevX, prevY, currX, currY,
            checkpoint.x1, checkpoint.y1, checkpoint.x2, checkpoint.y2
        );
    }
}
