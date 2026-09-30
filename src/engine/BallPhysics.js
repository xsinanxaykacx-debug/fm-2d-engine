// src/engine/BallPhysics.js

export class BallPhysics {

    /**
     * @param {Object} [options]
     * @param {number} [options.minSpeed=0] - Bu hızın altındaki toplar durur
     * @param {number} [options.friction=0.98] - Sahipsiz topun her tick'te hız çarpanı
     */
    constructor({
        minSpeed = 0,
        friction = 0.98
    } = {}) {

        if (
            !Number.isFinite(minSpeed) ||
            minSpeed < 0
        ) {
            throw new TypeError(
                'BallPhysics: minSpeed must be non-negative.'
            );
        }

        if (
            !Number.isFinite(friction) ||
            friction <= 0 ||
            friction > 1
        ) {
            throw new TypeError(
                'BallPhysics: friction must be in (0, 1].'
            );
        }

        this.config = Object.freeze({
            minSpeed,
            friction
        });

        Object.freeze(this);
    }


    /**
     * Topun fiziksel hareketini hesaplar.
     *
     * Sorumluluk:
     *   - Sahipsiz topun pozisyonunu velocity * timeStep kadar ilerletir.
     *   - Sahipsiz topun hızını friction kadar azaltır.
     *
     * Sorumluluk DIŞI:
     *   - Possession
     *   - Interception
     *   - Receiver
     *   - Boundary
     *   - Collision
     *   - Pass kararı
     *   - Oyuncu hareketi
     *
     * @param {Object} ball - { ownerId, position, velocity }
     * @param {number} timeStep
     * @returns {Object} Yeni immutable ball
     */
    step(ball, timeStep) {

        // Guard 1: ball validation
        if (
            !ball ||
            typeof ball !== 'object' ||
            !ball.position ||
            typeof ball.position.x !== 'number' ||
            typeof ball.position.y !== 'number' ||
            !ball.velocity ||
            typeof ball.velocity.x !== 'number' ||
            typeof ball.velocity.y !== 'number'
        ) {
            throw new TypeError(
                'BallPhysics.step: Valid ball with position and velocity is required.'
            );
        }

        // Guard 2: timeStep validation
        if (
            !Number.isFinite(timeStep) ||
            timeStep <= 0
        ) {
            throw new TypeError(
                'BallPhysics.step: timeStep must be positive.'
            );
        }

        const { ownerId, position, velocity } = ball;

        // Kural: Top sahipli ise hareket etmez, friction uygulanmaz
        if (ownerId !== null && ownerId !== undefined) {
            return this.cloneBall(ball, {
                position: { x: position.x, y: position.y },
                velocity: { x: velocity.x, y: velocity.y }
            });
        }

        // Sahipsiz top: ÖNCE pozisyon (mevcut velocity ile)
        const nextX =
            position.x + velocity.x * timeStep;

        const nextY =
            position.y + velocity.y * timeStep;

        // SONRA velocity friction ile azaltılır
        const friction =
            this.config.friction;

        const nextVelocityX =
            velocity.x * friction;

        const nextVelocityY =
            velocity.y * friction;

        return this.cloneBall(ball, {
            position: { x: nextX, y: nextY },
            velocity: { x: nextVelocityX, y: nextVelocityY }
        });
    }


    /**
     * Ball'u klonlar. cloneWith varsa onu kullanır,
     * yoksa yeni immutable obje üretir.
     */
    cloneBall(ball, changes) {

        if (typeof ball.cloneWith === 'function') {
            return ball.cloneWith(changes);
        }

        return Object.freeze({
            ...ball,
            position: Object.freeze({
                x: changes.position.x,
                y: changes.position.y
            }),
            velocity: Object.freeze({
                x: changes.velocity.x,
                y: changes.velocity.y
            })
        });
    }
}