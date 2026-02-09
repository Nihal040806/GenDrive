/**
 * Vehicle/Agent class
 * Represents an autonomous agent with physics and sensors
 */
class Vehicle {
    constructor(id, x, y, angle) {
        this.id = id;

        // Position and orientation
        this.x = x;
        this.y = y;
        this.angle = angle;

        // Velocity
        this.speed = 0;
        this.acceleration = 0;
        this.steering = 0;

        // Dimensions
        this.width = CONFIG.VEHICLE.WIDTH;
        this.height = CONFIG.VEHICLE.HEIGHT;

        // State
        this.alive = true;
        this.fitness = 0;
        this.distanceTraveled = 0;
        this.timeAlive = 0;
        this.checkpointsPassed = 0;
        this.lastCheckpoint = -1;

        // Previous position for checkpoint detection
        this.prevX = x;
        this.prevY = y;

        // Sensors
        this.rayCaster = new RayCaster(
            CONFIG.VEHICLE.SENSOR_COUNT,
            CONFIG.VEHICLE.SENSOR_LENGTH,
            CONFIG.VEHICLE.SENSOR_SPREAD
        );
        this.sensorReadings = [];

        // Neural network outputs (will be set by backend)
        this.outputs = { steering: 0, acceleration: 0 };

        // Visual  
        this.color = CONFIG.COLORS.VEHICLE_ALIVE;
        this.isBest = false;
    }

    /**
     * Update vehicle physics and state
     * @param {number} dt - Delta time
     * @param {Array} walls - Track walls for collision
     * @param {Array} checkpoints - Track checkpoints
     */
    update(dt, walls, checkpoints) {
        if (!this.alive) return;

        // Store previous position
        this.prevX = this.x;
        this.prevY = this.y;

        // Apply neural network outputs
        this.steering = this.outputs.steering * CONFIG.VEHICLE.TURN_SPEED;
        this.acceleration = this.outputs.acceleration * CONFIG.VEHICLE.ACCELERATION;

        // Update angle based on steering
        this.angle += this.steering * (this.speed / CONFIG.VEHICLE.MAX_SPEED + 0.1);

        // Update speed with acceleration and friction
        this.speed += this.acceleration;
        this.speed *= CONFIG.VEHICLE.FRICTION;
        this.speed = Utils.clamp(this.speed, 0, CONFIG.VEHICLE.MAX_SPEED);

        // Update position
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Update distance traveled
        const distMoved = Utils.distance(this.prevX, this.prevY, this.x, this.y);
        this.distanceTraveled += distMoved;

        // Update time alive
        this.timeAlive += dt;

        // Check checkpoint crossings
        this.checkCheckpoints(checkpoints);

        // Check collision with walls
        if (CollisionDetector.checkVehicleCollision({
            x: this.x,
            y: this.y,
            angle: this.angle,
            width: this.width,
            height: this.height
        }, walls)) {
            this.die();
        }

        // Update fitness
        this.updateFitness();
    }

    /**
     * Cast sensor rays and get readings
     * @param {Array} walls - Track walls
     * @returns {Array} Normalized sensor readings
     */
    sense(walls) {
        if (!this.alive) {
            // Return max distance readings for dead vehicles
            return Array(CONFIG.VEHICLE.SENSOR_COUNT).fill(1);
        }

        this.sensorReadings = this.rayCaster.cast(
            this.x, this.y, this.angle, walls
        );

        return this.sensorReadings;
    }

    /**
     * Set motor outputs from neural network
     * @param {number} steering - Steering value (-1 to 1)
     * @param {number} acceleration - Acceleration value (0 to 1)
     */
    setOutputs(steering, acceleration) {
        this.outputs.steering = steering;
        this.outputs.acceleration = acceleration;
    }

    /**
     * Check and update checkpoint progress
     */
    checkCheckpoints(checkpoints) {
        for (let i = 0; i < checkpoints.length; i++) {
            const cp = checkpoints[i];

            // Only check next checkpoint (or allow any for more flexibility)
            if (CollisionDetector.checkCheckpointCrossing(
                this.prevX, this.prevY, this.x, this.y, cp
            )) {
                // Prevent backwards counting
                const nextExpected = (this.lastCheckpoint + 1) % checkpoints.length;
                if (i === nextExpected || this.lastCheckpoint === -1) {
                    this.lastCheckpoint = i;
                    this.checkpointsPassed++;
                }
            }
        }
    }

    /**
     * Calculate and update fitness score
     */
    updateFitness() {
        // Fitness components:
        // 1. Distance traveled (encourages movement)
        // 2. Checkpoints passed (major reward for progress)
        // 3. Time alive (minor bonus for survival)
        // 4. Speed bonus (reward for going fast)

        this.fitness =
            this.distanceTraveled * 0.1 +
            this.checkpointsPassed * 1000 +
            this.timeAlive * 0.01 +
            this.speed * 10;
    }

    /**
     * Mark vehicle as dead
     */
    die() {
        this.alive = false;
        this.color = CONFIG.COLORS.VEHICLE_DEAD;
    }

    /**
     * Reset vehicle to starting position
     */
    reset(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 0;
        this.acceleration = 0;
        this.steering = 0;
        this.alive = true;
        this.fitness = 0;
        this.distanceTraveled = 0;
        this.timeAlive = 0;
        this.checkpointsPassed = 0;
        this.lastCheckpoint = -1;
        this.prevX = x;
        this.prevY = y;
        this.color = CONFIG.COLORS.VEHICLE_ALIVE;
        this.outputs = { steering: 0, acceleration: 0 };
    }

    /**
     * Mark as best performing vehicle
     */
    setBest(isBest) {
        this.isBest = isBest;
        if (isBest && this.alive) {
            this.color = CONFIG.COLORS.VEHICLE_BEST;
        }
    }

    /**
     * Render the vehicle
     */
    render(ctx, showSensors = false) {
        // Render sensors first (behind vehicle)
        if (showSensors && this.alive && (this.isBest)) {
            this.rayCaster.render(ctx, true);
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Vehicle body
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.alive ? '#ffffff' : 'transparent';
        ctx.lineWidth = 1;

        // Draw as triangle/arrow shape
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 0);  // Nose
        ctx.lineTo(-this.width / 2, -this.height / 2);  // Back left
        ctx.lineTo(-this.width / 3, 0);  // Back indent
        ctx.lineTo(-this.width / 2, this.height / 2);  // Back right
        ctx.closePath();
        ctx.fill();

        if (this.alive) {
            ctx.stroke();
        }

        // Highlight best vehicle
        if (this.isBest && this.alive) {
            ctx.shadowColor = CONFIG.COLORS.VEHICLE_BEST;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = CONFIG.COLORS.VEHICLE_BEST;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.width / 1.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    /**
     * Get fitness data for evolution
     */
    getFitnessData() {
        return {
            agent_id: this.id,
            fitness: this.fitness,
            distance_traveled: this.distanceTraveled,
            time_alive: this.timeAlive,
            checkpoints_passed: this.checkpointsPassed
        };
    }
}
