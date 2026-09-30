// src/engine/PassEngine.js

export const PASS_TYPES = Object.freeze({
    GROUND: 'GROUND',
    LOB: 'LOB'
});

export const PASS_SPEEDS = Object.freeze({
    [PASS_TYPES.GROUND]: 300,
    [PASS_TYPES.LOB]: 420
});

export class PassEngine {
    constructor() {
        Object.freeze(this);
    }

    /**
     * Calculates a pass intent based on current state, snapshot, and pass attributes.
     *
     * @param {Object} state - Current MatchState
     * @param {Object} snapshot - PossessionSnapshot from PossessionEngine
     * @param {number|string} passerId - ID of the player attempting the pass
     * @param {number|string} receiverId - ID of the target player receiving the pass
     * @param {string} [passType=PASS_TYPES.GROUND] - Pass type ('GROUND' or 'LOB')
     * @returns {Object} Immutable PassIntent object
     */
    calculateIntent(state, snapshot, passerId, receiverId, passType = PASS_TYPES.GROUND) {
        // Guardrails - fail fast on missing mandatory inputs
        if (!state || typeof state !== 'object' || !Array.isArray(state.players)) {
            throw new TypeError('PassEngine.calculateIntent: "state" must be a valid MatchState object with players array.');
        }

        if (!snapshot || typeof snapshot !== 'object') {
            throw new TypeError('PassEngine.calculateIntent: "snapshot" must be a valid PossessionSnapshot object.');
        }

        if (passerId === undefined || passerId === null) {
            throw new TypeError('PassEngine.calculateIntent: "passerId" is required.');
        }

        if (receiverId === undefined || receiverId === null) {
            throw new TypeError('PassEngine.calculateIntent: "receiverId" is required.');
        }

        // Rule: Self-pass is forbidden
        if (passerId === receiverId) {
            throw new Error('PassEngine.calculateIntent: Self-pass is forbidden (passerId cannot equal receiverId).');
        }

        // Rule: Pass type validation
        if (!PASS_SPEEDS[passType]) {
            throw new Error(`PassEngine.calculateIntent: Invalid passType "${passType}". Must be GROUND or LOB.`);
        }

        // Rule: Passer must currently own the ball according to snapshot or ball
        const currentOwnerId = snapshot.ownerId !== null ? snapshot.ownerId : (state.ball ? state.ball.ownerId : null);
        if (currentOwnerId !== passerId) {
            throw new Error(`PassEngine.calculateIntent: Player ${passerId} does not have possession to make a pass.`);
        }

        const passer = state.players.find(p => p.id === passerId);
        const receiver = state.players.find(p => p.id === receiverId);

        if (!passer) {
            throw new Error(`PassEngine.calculateIntent: Passer with ID ${passerId} not found in state.`);
        }

        if (!receiver) {
            throw new Error(`PassEngine.calculateIntent: Receiver with ID ${receiverId} not found in state.`);
        }

        // Distance & Direction calculations
        const dx = receiver.position.x - passer.position.x;
        const dy = receiver.position.y - passer.position.y;
        const distance = Math.hypot(dx, dy);

        if (distance === 0) {
            throw new Error('PassEngine.calculateIntent: Passer and Receiver are at the exact same position.');
        }

        const dirX = dx / distance;
        const dirY = dy / distance;

        const speed = PASS_SPEEDS[passType];
        const velocity = {
            x: dirX * speed,
            y: dirY * speed
        };

        const targetPosition = {
            x: receiver.position.x,
            y: receiver.position.y
        };

        return Object.freeze({
            passerId,
            receiverId,
            targetPosition: Object.freeze(targetPosition),
            velocity: Object.freeze(velocity),
            passType
        });
    }
}