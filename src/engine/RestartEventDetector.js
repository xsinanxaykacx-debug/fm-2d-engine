// src/engine/RestartEventDetector.js

import { BOUNDARY_EDGES } from './BoundaryDetector.js';

export const RESTART_LINE_TYPES = Object.freeze({
    NONE: 'NONE',
    TOUCHLINE: 'TOUCHLINE',
    GOALLINE: 'GOALLINE'
});

export class RestartEventDetector {
    constructor() {
        Object.freeze(this);
    }

    /**
     * Evaluates the out-of-bounds state to classify the boundary restart event type.
     *
     * @param {Object} ball - Current Ball instance containing boundary flags
     * @param {Object} [lastTouchInfo={}] - Optional metadata regarding last touch
     * @returns {Object} Immutable RestartEventSnapshot
     */
    evaluate(ball, lastTouchInfo = {}) {
        if (!ball || typeof ball !== 'object') {
            throw new TypeError('RestartEventDetector.evaluate: Valid "ball" object is required.');
        }

        const isOutOfBounds = Boolean(ball.isOutOfBounds);
        const edge = ball.lastBoundaryEdge || BOUNDARY_EDGES.NONE;

        if (!isOutOfBounds || edge === BOUNDARY_EDGES.NONE) {
            return Object.freeze({
                hasEvent: false,
                lineType: RESTART_LINE_TYPES.NONE,
                edge: BOUNDARY_EDGES.NONE,
                exitPosition: null,
                lastTouchedBy: null,
                lastTouchTeamId: null,
                requiresTypeResolution: false
            });
        }

        let lineType = RESTART_LINE_TYPES.NONE;

        if (edge === BOUNDARY_EDGES.OUT_TOP || edge === BOUNDARY_EDGES.OUT_BOTTOM) {
            lineType = RESTART_LINE_TYPES.TOUCHLINE;
        } else if (edge === BOUNDARY_EDGES.OUT_LEFT || edge === BOUNDARY_EDGES.OUT_RIGHT) {
            lineType = RESTART_LINE_TYPES.GOALLINE;
        }

        return Object.freeze({
            hasEvent: true,
            lineType,
            edge,
            exitPosition: ball.exitPosition ? Object.freeze({ ...ball.exitPosition }) : null,
            lastTouchedBy: lastTouchInfo.playerId !== undefined ? lastTouchInfo.playerId : (ball.lastTouchedBy || null),
            lastTouchTeamId: lastTouchInfo.teamId !== undefined ? lastTouchInfo.teamId : (ball.lastTouchTeamId || null),
            requiresTypeResolution: true
        });
    }
}