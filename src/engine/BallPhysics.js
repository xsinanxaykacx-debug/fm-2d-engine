// src/engine/BallPhysics.js

export class BallPhysics {
    constructor({ minSpeed = 0, friction = 0.98 } = {}) {
        if (!Number.isFinite(minSpeed) || minSpeed < 0) throw new TypeError('BallPhysics: minSpeed must be non-negative.');
        if (!Number.isFinite(friction) || friction <= 0 || friction > 1) throw new TypeError('BallPhysics: friction must be in (0, 1].');
        this.config = Object.freeze({ minSpeed, friction });
        Object.freeze(this);
    }

    step(ball, timeStep, players = []) {
        if (!ball || typeof ball !== 'object' || !ball.position || typeof ball.position.x !== 'number' || typeof ball.position.y !== 'number' || !ball.velocity || typeof ball.velocity.x !== 'number' || typeof ball.velocity.y !== 'number') {
            throw new TypeError('BallPhysics.step: Valid ball with position and velocity is required.');
        }
        if (!Number.isFinite(timeStep) || timeStep <= 0) throw new TypeError('BallPhysics.step: timeStep must be positive.');
        if (!Array.isArray(players)) throw new TypeError('BallPhysics.step: players must be an array.');

        const { ownerId, position, velocity } = ball;

        if (ownerId !== null && ownerId !== undefined) {
            const owner = players.find(player => player.id === ownerId);
            if (owner && owner.position) {
                return this.cloneBall(ball, {
                    position: { x: owner.position.x, y: owner.position.y },
                    velocity: { x: 0, y: 0 }
                });
            }
            return this.cloneBall(ball, {
                position: { x: position.x, y: position.y },
                velocity: { x: 0, y: 0 }
            });
        }

        const nextX = position.x + velocity.x * timeStep;
        const nextY = position.y + velocity.y * timeStep;
        const nextVelocityX = velocity.x * this.config.friction;
        const nextVelocityY = velocity.y * this.config.friction;
        const nextSpeed = Math.hypot(nextVelocityX, nextVelocityY);

        return this.cloneBall(ball, {
            position: { x: nextX, y: nextY },
            velocity: nextSpeed < this.config.minSpeed ? { x: 0, y: 0 } : { x: nextVelocityX, y: nextVelocityY }
        });
    }

    cloneBall(ball, changes) {
        if (typeof ball.cloneWith === 'function') return ball.cloneWith(changes);
        return Object.freeze({
            ...ball,
            position: Object.freeze({ x: changes.position.x, y: changes.position.y }),
            velocity: Object.freeze({ x: changes.velocity.x, y: changes.velocity.y })
        });
    }
}
