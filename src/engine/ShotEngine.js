// src/engine/ShotEngine.js

export const SHOT_TYPES = Object.freeze({
    GROUND: 'GROUND',
    LOB: 'LOB'
});

export const SHOT_SPEEDS = Object.freeze({
    [SHOT_TYPES.GROUND]: 500,
    [SHOT_TYPES.LOB]: 600
});

export class ShotEngine {

    constructor() {
        Object.freeze(this);
    }

    /**
     * Şut niyetini hesaplar.
     *
     * Sorumluluk:
     *   Shooter konumu + hedef konum + şut tipi → velocity
     *
     * Sorumluluk DIŞI:
     *   - Kale bilgisi
     *   - Gol geometrisi
     *   - Possession state transition (ShotExecutor)
     *   - BallPhysics
     *   - Karar verme (DecisionEngine)
     *
     * @param {Object} state - MatchState (players, ball)
     * @param {Object} snapshot - PossessionSnapshot
     * @param {number|string} shooterId
     * @param {{x: number, y: number}} targetPosition
     * @param {string} [shotType=SHOT_TYPES.GROUND]
     * @returns {Object} Immutable ShotIntent
     */
    calculateIntent(
        state,
        snapshot,
        shooterId,
        targetPosition,
        shotType = SHOT_TYPES.GROUND
    ) {

        // Guard 1: state
        if (
            !state ||
            typeof state !== 'object' ||
            !Array.isArray(state.players)
        ) {
            throw new TypeError(
                'ShotEngine.calculateIntent: "state" must be a valid MatchState object with players array.'
            );
        }

        // Guard 2: snapshot
        if (!snapshot || typeof snapshot !== 'object') {
            throw new TypeError(
                'ShotEngine.calculateIntent: "snapshot" must be a valid PossessionSnapshot object.'
            );
        }

        // Guard 3: shooterId
        if (shooterId === undefined || shooterId === null) {
            throw new TypeError(
                'ShotEngine.calculateIntent: "shooterId" is required.'
            );
        }

        // Guard 4: targetPosition
        if (
            !targetPosition ||
            typeof targetPosition !== 'object' ||
            !Number.isFinite(targetPosition.x) ||
            !Number.isFinite(targetPosition.y)
        ) {
            throw new TypeError(
                'ShotEngine.calculateIntent: "targetPosition" must be a valid {x, y} object with finite coordinates.'
            );
        }

        // Rule: shotType validation
        if (!SHOT_SPEEDS[shotType]) {
            throw new Error(
                `ShotEngine.calculateIntent: Invalid shotType "${shotType}". Must be GROUND or LOB.`
            );
        }

        // Rule: Shooter must own the ball
        const currentOwnerId =
            snapshot.ownerId !== null
                ? snapshot.ownerId
                : (state.ball ? state.ball.ownerId : null);

        if (currentOwnerId !== shooterId) {
            throw new Error(
                `ShotEngine.calculateIntent: Player ${shooterId} does not have possession to make a shot.`
            );
        }

        const shooter = state.players.find(p => p.id === shooterId);

        if (!shooter) {
            throw new Error(
                `ShotEngine.calculateIntent: Shooter with ID ${shooterId} not found in state.`
            );
        }

        const dx = targetPosition.x - shooter.position.x;
        const dy = targetPosition.y - shooter.position.y;

        const distance = Math.hypot(dx, dy);

        if (distance === 0) {
            throw new Error(
                'ShotEngine.calculateIntent: Shooter and target are at the exact same position.'
            );
        }

        const dirX = dx / distance;
        const dirY = dy / distance;

        const speed = SHOT_SPEEDS[shotType];

        const velocity = {
            x: dirX * speed,
            y: dirY * speed
        };

        return Object.freeze({
            shooterId,

            targetPosition: Object.freeze({
                x: targetPosition.x,
                y: targetPosition.y
            }),

            velocity: Object.freeze(velocity),

            shotType
        });
    }
}