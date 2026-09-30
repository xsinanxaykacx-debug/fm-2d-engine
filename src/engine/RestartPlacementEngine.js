// src/engine/RestartPlacementEngine.js

import { BOUNDARY_EDGES } from './BoundaryDetector.js';
import { RESTART_TYPES } from './RestartTypeResolver.js';

export class RestartPlacementEngine {
    constructor() {
        Object.freeze(this);
    }

    /**
     * Calculates the exact physical restart coordinates based on V4.4 resolution.
     *
     * @param {Object} restartEvent - Snapshot from RestartEventDetector (V4.3)
     * @param {Object} restartResolution - Snapshot from RestartTypeResolver (V4.4)
     * @param {Object} pitchContext - Pitch dimensions context
     * @param {number} pitchContext.width - Pitch width (e.g. 105)
     * @param {number} pitchContext.height - Pitch height (e.g. 68)
     * @param {number} [pitchContext.goalAreaWidth=5.5] - Six-yard box width
     * @returns {Object} Immutable Placement Snapshot
     */
    calculate(restartEvent, restartResolution, pitchContext) {
        // Guard 1: Input Type & Pitch Validations
        if (!restartEvent || typeof restartEvent !== 'object') {
            throw new TypeError('RestartPlacementEngine.calculate: Valid "restartEvent" object is required.');
        }

        if (!restartResolution || typeof restartResolution !== 'object') {
            throw new TypeError('RestartPlacementEngine.calculate: Valid "restartResolution" object is required.');
        }

        if (!pitchContext || typeof pitchContext !== 'object' ||
            !Number.isFinite(pitchContext.width) || pitchContext.width <= 0 ||
            !Number.isFinite(pitchContext.height) || pitchContext.height <= 0) {
            throw new TypeError('RestartPlacementEngine.calculate: Valid "pitchContext" with finite positive width and height is required.');
        }

        const goalAreaWidth = pitchContext.goalAreaWidth ?? 5.5;
        if (!Number.isFinite(goalAreaWidth) || goalAreaWidth <= 0 || goalAreaWidth > pitchContext.width / 2) {
            throw new TypeError('RestartPlacementEngine.calculate: "goalAreaWidth" must be finite, positive and no greater than half the pitch width.');
        }

        const { type: restartType, requiresPlacement, edge } = restartResolution;

        // Early Exit: If no placement is required
        if (!requiresPlacement || restartType === RESTART_TYPES.NONE) {
            return Object.freeze({
                position: null,
                restartType: RESTART_TYPES.NONE,
                edge: edge || BOUNDARY_EDGES.NONE,
                isPlaced: false
            });
        }

        // Guard 2: Strict Geometrical Consistency Validations between restartType and edge
        if (restartType === RESTART_TYPES.THROW_IN && edge !== BOUNDARY_EDGES.OUT_TOP && edge !== BOUNDARY_EDGES.OUT_BOTTOM) {
            throw new TypeError(`RestartPlacementEngine.calculate: THROW_IN requires OUT_TOP or OUT_BOTTOM, received "${edge}".`);
        }

        if ((restartType === RESTART_TYPES.CORNER_KICK || restartType === RESTART_TYPES.GOAL_KICK) &&
            edge !== BOUNDARY_EDGES.OUT_LEFT && edge !== BOUNDARY_EDGES.OUT_RIGHT) {
            throw new TypeError(`RestartPlacementEngine.calculate: ${restartType} requires OUT_LEFT or OUT_RIGHT, received "${edge}".`);
        }

        // Guard 3: Strict Exit Position Validation when placement is required
        const exitPosition = restartEvent.exitPosition;
        if (!exitPosition || typeof exitPosition !== 'object' ||
            !Number.isFinite(exitPosition.x) || !Number.isFinite(exitPosition.y)) {
            throw new TypeError('RestartPlacementEngine.calculate: Valid finite "exitPosition" ({x, y}) is required when placement is required.');
        }

        const { width, height } = pitchContext;
        let x = 0;
        let y = 0;

        // Case 1: THROW_IN Placement
        if (restartType === RESTART_TYPES.THROW_IN) {
            x = Math.max(0, Math.min(width, exitPosition.x));
            y = edge === BOUNDARY_EDGES.OUT_TOP ? 0 : height;
        }
        // Case 2: CORNER_KICK Placement
        else if (restartType === RESTART_TYPES.CORNER_KICK) {
            x = edge === BOUNDARY_EDGES.OUT_LEFT ? 0 : width;
            y = exitPosition.y < height / 2 ? 0 : height;
        }
        // Case 3: GOAL_KICK Placement
        else if (restartType === RESTART_TYPES.GOAL_KICK) {
            x = edge === BOUNDARY_EDGES.OUT_LEFT ? goalAreaWidth : (width - goalAreaWidth);
            y = height / 2;
        }
        else {
            return Object.freeze({
                position: null,
                restartType: RESTART_TYPES.NONE,
                edge: BOUNDARY_EDGES.NONE,
                isPlaced: false
            });
        }

        return Object.freeze({
            position: Object.freeze({ x, y }),
            restartType,
            edge,
            isPlaced: true
        });
    }
}