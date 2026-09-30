// src/engine/RestartTypeResolver.js

import { BOUNDARY_EDGES } from './BoundaryDetector.js';
import { RESTART_LINE_TYPES } from './RestartEventDetector.js';

export const RESTART_TYPES = Object.freeze({
    NONE: 'NONE',
    THROW_IN: 'THROW_IN',
    CORNER_KICK: 'CORNER_KICK',
    GOAL_KICK: 'GOAL_KICK'
});

export class RestartTypeResolver {
    constructor() {
        Object.freeze(this);
    }

    /**
     * Resolves the restart type and executing team based on restart event and pitch context.
     *
     * @param {Object} restartEvent - Immutable snapshot from RestartEventDetector (V4.3)
     * @param {Object} pitchContext - Pitch orientation context
     * @param {string} pitchContext.homeTeamId - ID of Home team
     * @param {string} pitchContext.awayTeamId - ID of Away team
     * @param {'LEFT'|'RIGHT'} pitchContext.homeAttackingSide - Side Home team attacks
     * @returns {Object} Immutable Resolution Snapshot
     */
    resolve(restartEvent, pitchContext) {
        // Guard 1: Input Type Validations
        if (!restartEvent || typeof restartEvent !== 'object') {
            throw new TypeError('RestartTypeResolver.resolve: Valid "restartEvent" object is required.');
        }

        if (!pitchContext || typeof pitchContext !== 'object' ||
            !pitchContext.homeTeamId || !pitchContext.awayTeamId ||
            !['LEFT', 'RIGHT'].includes(pitchContext.homeAttackingSide)) {
            throw new TypeError('RestartTypeResolver.resolve: Valid "pitchContext" with homeTeamId, awayTeamId and homeAttackingSide ("LEFT"|"RIGHT") is required.');
        }

        const { hasEvent, lineType, edge, lastTouchTeamId } = restartEvent;
        const { homeTeamId, awayTeamId, homeAttackingSide } = pitchContext;

        // Early Exit: No event or missing team ownership metadata
        if (!hasEvent || lineType === RESTART_LINE_TYPES.NONE || !lastTouchTeamId) {
            return Object.freeze({
                type: RESTART_TYPES.NONE,
                executingTeamId: null,
                defendingTeamId: null,
                edge: edge || BOUNDARY_EDGES.NONE,
                requiresPlacement: false
            });
        }

        // Guard 2: Team ID Validity Check
        if (lastTouchTeamId !== homeTeamId && lastTouchTeamId !== awayTeamId) {
            throw new TypeError(`RestartTypeResolver.resolve: Unknown lastTouchTeamId "${lastTouchTeamId}". Must match homeTeamId or awayTeamId.`);
        }

        // Guard 3: Line Type and Edge Consistency Check
        if (lineType === RESTART_LINE_TYPES.TOUCHLINE && edge !== BOUNDARY_EDGES.OUT_TOP && edge !== BOUNDARY_EDGES.OUT_BOTTOM) {
            throw new TypeError(`RestartTypeResolver.resolve: Inconsistent TOUCHLINE event with edge "${edge}".`);
        }
        if (lineType === RESTART_LINE_TYPES.GOALLINE && edge !== BOUNDARY_EDGES.OUT_LEFT && edge !== BOUNDARY_EDGES.OUT_RIGHT) {
            throw new TypeError(`RestartTypeResolver.resolve: Inconsistent GOALLINE event with edge "${edge}".`);
        }

        // Case 1: TOUCHLINE -> THROW_IN
        if (lineType === RESTART_LINE_TYPES.TOUCHLINE) {
            const executingTeamId = lastTouchTeamId === homeTeamId ? awayTeamId : homeTeamId;
            const defendingTeamId = lastTouchTeamId;

            return Object.freeze({
                type: RESTART_TYPES.THROW_IN,
                executingTeamId,
                defendingTeamId,
                edge,
                requiresPlacement: true
            });
        }

        // Case 2: GOALLINE -> CORNER_KICK or GOAL_KICK
        if (lineType === RESTART_LINE_TYPES.GOALLINE) {
            // Determine which team's goal line this edge represents
            const isHomeGoalLine = (homeAttackingSide === 'RIGHT' && edge === BOUNDARY_EDGES.OUT_LEFT) ||
                                  (homeAttackingSide === 'LEFT' && edge === BOUNDARY_EDGES.OUT_RIGHT);

            const defendingTeamOnThisLine = isHomeGoalLine ? homeTeamId : awayTeamId;
            const attackingTeamOnThisLine = isHomeGoalLine ? awayTeamId : homeTeamId;

            let type = RESTART_TYPES.NONE;
            let executingTeamId = null;
            let defendingTeamId = null;

            if (lastTouchTeamId === defendingTeamOnThisLine) {
                // Defense touched last -> Attacking team gets Corner Kick
                type = RESTART_TYPES.CORNER_KICK;
                executingTeamId = attackingTeamOnThisLine;
                defendingTeamId = defendingTeamOnThisLine;
            } else {
                // Offense touched last -> Defending team gets Goal Kick
                type = RESTART_TYPES.GOAL_KICK;
                executingTeamId = defendingTeamOnThisLine;
                defendingTeamId = attackingTeamOnThisLine;
            }

            return Object.freeze({
                type,
                executingTeamId,
                defendingTeamId,
                edge,
                requiresPlacement: true
            });
        }

        return Object.freeze({
            type: RESTART_TYPES.NONE,
            executingTeamId: null,
            defendingTeamId: null,
            edge: BOUNDARY_EDGES.NONE,
            requiresPlacement: false
        });
    }
}