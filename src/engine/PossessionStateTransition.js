// src/engine/PossessionStateTransition.js

export class PossessionStateTransition {
    constructor() {
        Object.freeze(this);
    }

    /**
     * State transition evaluation based on current ball state, possession snapshot, and optional release commands.
     *
     * @param {Object} ball - Current Ball immutable object
     * @param {Object} snapshot - PossessionSnapshot object from PossessionEngine
     * @param {Object} [options] - Optional execution parameters
     * @param {boolean} [options.release=false] - Explicit release trigger (e.g., pass/shot)
     * @param {{x: number, y: number}} [options.releaseVelocity=null] - Optional velocity to assign on release
     * @returns {Object} New immutable Ball instance (via cloneWith or constructor pattern)
     */
    apply(ball, snapshot, { release = false, releaseVelocity = null } = {}) {
        // Strict guardrails - fail fast on invalid mandatory parameters
        if (!ball || typeof ball !== 'object') {
            throw new TypeError('PossessionStateTransition.apply: "ball" must be a valid object.');
        }

        if (!snapshot || typeof snapshot !== 'object') {
            throw new TypeError('PossessionStateTransition.apply: "snapshot" must be a valid object.');
        }

        const currentOwnerId = ball.ownerId;
        let nextOwnerId = currentOwnerId;
        let nextVelocity = ball.velocity ? { ...ball.velocity } : { x: 0, y: 0 };

        // 1. Explicit Release Command (Pass / Shot)
        if (release) {
            nextOwnerId = null;
            if (releaseVelocity && typeof releaseVelocity.x === 'number' && typeof releaseVelocity.y === 'number') {
                nextVelocity = { x: releaseVelocity.x, y: releaseVelocity.y };
            }
        } 
        // 2. State Machine Transitions (No Explicit Release)
        else {
            if (currentOwnerId === null) {
                // FREE -> CONTROLLED (Only when snapshot is CONTROLLED and has a valid ownerId)
                if (snapshot.state === 'CONTROLLED' && snapshot.ownerId !== null) {
                    nextOwnerId = snapshot.ownerId;
                    nextVelocity = { x: 0, y: 0 }; // Velocity zeroed upon gaining control
                }
            } else {
                // CONTROLLED -> FREE (Control lost according to snapshot)
                if (snapshot.state === 'FREE') {
                    nextOwnerId = null;
                }
                // CONTROLLED(A) + CONTROLLED(B) -> Ownership remains A (No transfer in V3.4)
            }
        }

        // Return a cloned immutable Ball object
        if (typeof ball.cloneWith === 'function') {
            return ball.cloneWith({
                ownerId: nextOwnerId,
                velocity: nextVelocity
            });
        }

        // Fallback for mock/plain immutable ball structures
        return Object.freeze({
            ...ball,
            ownerId: nextOwnerId,
            velocity: Object.freeze({ ...nextVelocity }),
            position: Object.freeze({ ...ball.position })
        });
    }
}