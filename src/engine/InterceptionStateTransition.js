// src/engine/InterceptionStateTransition.js

export class InterceptionStateTransition {
    constructor() {
        Object.freeze(this);
    }

    /**
     * Applies an InterceptionSnapshot to a Ball entity.
     * Transfers ownership, zeroes velocity, and updates position
     * if an interception candidate exists.
     *
     * Supports both:
     * - Ball entities with cloneWith()
     * - Plain ball objects used by MatchState
     *
     * @param {Object} ball - Ball entity
     * @param {Object} snapshot - InterceptionSnapshot from InterceptionDetector
     * @returns {Object} Unmodified or new Ball entity
     */
    apply(ball, snapshot) {
        // Guard 1: Ball object check
        if (!ball || typeof ball !== 'object') {
            throw new TypeError(
                'InterceptionStateTransition.apply: "ball" must be a valid object.'
            );
        }

        // Guard 2: Snapshot type check
        if (!snapshot || typeof snapshot !== 'object') {
            throw new TypeError(
                'InterceptionStateTransition.apply: "snapshot" must be a valid InterceptionSnapshot object.'
            );
        }

        // No candidate -> exact same reference
        if (!snapshot.hasCandidate) {
            return ball;
        }

        // Integrity check: interceptorId
        if (
            snapshot.interceptorId === null ||
            snapshot.interceptorId === undefined
        ) {
            throw new Error(
                'InterceptionStateTransition.apply: "interceptorId" cannot be null or undefined when hasCandidate is true.'
            );
        }

        // Integrity check: interceptionPoint
        if (
            !snapshot.interceptionPoint ||
            typeof snapshot.interceptionPoint !== 'object' ||
            !Number.isFinite(snapshot.interceptionPoint.x) ||
            !Number.isFinite(snapshot.interceptionPoint.y)
        ) {
            throw new Error(
                'InterceptionStateTransition.apply: Valid finite "interceptionPoint" (x, y) is required when hasCandidate is true.'
            );
        }

        const ballChanges = {
            ownerId: snapshot.interceptorId,

            velocity: {
                x: 0,
                y: 0
            },

            position: {
                x: snapshot.interceptionPoint.x,
                y: snapshot.interceptionPoint.y
            }
        };

        // Preferred path: real Ball entity
        if (typeof ball.cloneWith === 'function') {
            return ball.cloneWith(ballChanges);
        }

        // MatchState plain-object fallback
        return Object.freeze({
            ...ball,

            ownerId: ballChanges.ownerId,

            velocity: Object.freeze({
                ...ballChanges.velocity
            }),

            position: Object.freeze({
                ...ballChanges.position
            })
        });
    }
}