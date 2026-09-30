// src/engine/BoundaryStateTransition.js

export class BoundaryStateTransition {
    constructor() {
        Object.freeze(this);
    }

    /**
     * Applies a BoundarySnapshot onto the MatchState, producing a new state if out of bounds.
     *
     * @param {Object} state - Current MatchState[t]
     * @param {Object} snapshot - Immutable BoundarySnapshot from BoundaryDetector
     * @returns {Object} Next immutable MatchState[t+1] or unchanged state
     */
    apply(state, snapshot) {
        // Guard 1: Fail-fast input validations
        if (!state || typeof state !== 'object' || !state.ball || typeof state.nextState !== 'function') {
            throw new TypeError('BoundaryStateTransition.apply: Valid "state" object with ball and nextState() is required.');
        }

        if (!snapshot || typeof snapshot !== 'object' || typeof snapshot.isOutOfBounds !== 'boolean') {
            throw new TypeError('BoundaryStateTransition.apply: Valid "snapshot" object with isOutOfBounds boolean is required.');
        }

        // NO-OP: If top sahadaysa durum değiştirilmez, mevcut state aynen döndürülür
        if (!snapshot.isOutOfBounds) {
            return state;
        }

        const { ball } = state;

        // Ball.cloneWith kullanarak topun fizik / durumunu donduruyoruz
        if (typeof ball.cloneWith !== 'function') {
            throw new TypeError('BoundaryStateTransition.apply: Ball object must implement cloneWith() method.');
        }

        const updatedBall = ball.cloneWith({
            ownerId: null,
            velocity: { x: 0, y: 0 },
            isOutOfBounds: true,
            lastBoundaryEdge: snapshot.edge,
            exitPosition: snapshot.exitPosition ? { ...snapshot.exitPosition } : null
        });

        return state.nextState(state.players, updatedBall);
    }
}