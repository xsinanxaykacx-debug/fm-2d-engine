// src/engine/GoalDetector.js

export const GOAL_SIDES = Object.freeze({
    NONE: 'NONE',
    LEFT: 'LEFT',
    RIGHT: 'RIGHT'
});

export class GoalDetector {
    constructor() {
        Object.freeze(this);
    }

    /**
     * Detects if the ball has fully crossed either goal line within the goalpost frame.
     *
     * @param {Object} ball - Ball state object
     * @param {Object} ball.position - Ball coordinates { x: number, y: number }
     * @param {number} [ball.radius=0.11] - Ball radius in meters
     * @param {Object} pitchContext - Pitch orientation and dimension context
     * @param {number} pitchContext.width - Pitch width (e.g. 105)
     * @param {number} pitchContext.height - Pitch height (e.g. 68)
     * @param {string} pitchContext.homeTeamId - ID of Home team
     * @param {string} pitchContext.awayTeamId - ID of Away team
     * @param {'LEFT'|'RIGHT'} pitchContext.homeAttackingSide - Side Home team attacks
     * @param {number} [pitchContext.goalWidth=7.32] - Goalpost width in meters
     * @returns {Object} Immutable Goal Snapshot
     */
    detect(ball, pitchContext) {
        // Guard 1: Ball structure & Position validation
        if (!ball || typeof ball !== 'object' || !ball.position || typeof ball.position !== 'object' ||
            !Number.isFinite(ball.position.x) || !Number.isFinite(ball.position.y)) {
            throw new TypeError('GoalDetector.detect: Valid "ball" object with finite position {x, y} is required.');
        }

        // Guard 2: Ball Radius Strict Validation (undefined defaults to 0.11, invalid throws TypeError)
        const ballRadius = ball.radius === undefined ? 0.11 : ball.radius;
        if (!Number.isFinite(ballRadius) || ballRadius <= 0) {
            throw new TypeError('GoalDetector.detect: "ball.radius" must be finite and greater than zero.');
        }

        // Guard 3: pitchContext structure validation
        if (!pitchContext || typeof pitchContext !== 'object' ||
            !Number.isFinite(pitchContext.width) || pitchContext.width <= 0 ||
            !Number.isFinite(pitchContext.height) || pitchContext.height <= 0 ||
            !pitchContext.homeTeamId || !pitchContext.awayTeamId ||
            !['LEFT', 'RIGHT'].includes(pitchContext.homeAttackingSide)) {
            throw new TypeError('GoalDetector.detect: Valid "pitchContext" with width, height, homeTeamId, awayTeamId, and homeAttackingSide ("LEFT"|"RIGHT") is required.');
        }

        // Guard 4: Goal Width Strict Validation (undefined defaults to 7.32, invalid throws TypeError)
        const goalWidth = pitchContext.goalWidth === undefined ? 7.32 : pitchContext.goalWidth;
        if (!Number.isFinite(goalWidth) || goalWidth <= 0) {
            throw new TypeError('GoalDetector.detect: "goalWidth" must be finite and greater than zero.');
        }

        if (goalWidth >= pitchContext.height) {
            throw new TypeError('GoalDetector.detect: "goalWidth" must be smaller than pitch height.');
        }

        const { width, height, homeTeamId, awayTeamId, homeAttackingSide } = pitchContext;
        const { x, y } = ball.position;

        // Goalpost Boundaries (y-axis)
        const goalTop = (height / 2) - (goalWidth / 2);
        const goalBottom = (height / 2) + (goalWidth / 2);

        // Strict 2D Sphere Boundary Checks (< and > guarantees strict inside boundary requirement)
        const isWithinGoalHeight = (y - ballRadius > goalTop) && (y + ballRadius < goalBottom);
        const isFullyPastLeftGoalLine = (x + ballRadius) < 0;
        const isFullyPastRightGoalLine = (x - ballRadius) > width;

        let goalSide = GOAL_SIDES.NONE;

        if (isWithinGoalHeight) {
            if (isFullyPastLeftGoalLine) {
                goalSide = GOAL_SIDES.LEFT;
            } else if (isFullyPastRightGoalLine) {
                goalSide = GOAL_SIDES.RIGHT;
            }
        }

        // Early Exit: No Goal
        if (goalSide === GOAL_SIDES.NONE) {
            return Object.freeze({
                isGoal: false,
                scoringTeamId: null,
                concedingTeamId: null,
                goalSide: GOAL_SIDES.NONE,
                ballPosition: null
            });
        }

        // Determine Scoring and Conceding Teams based on homeAttackingSide mapping
        let scoringTeamId = null;
        let concedingTeamId = null;

        if (goalSide === GOAL_SIDES.LEFT) {
            scoringTeamId = homeAttackingSide === 'LEFT' ? homeTeamId : awayTeamId;
            concedingTeamId = scoringTeamId === homeTeamId ? awayTeamId : homeTeamId;
        } else if (goalSide === GOAL_SIDES.RIGHT) {
            scoringTeamId = homeAttackingSide === 'RIGHT' ? homeTeamId : awayTeamId;
            concedingTeamId = scoringTeamId === homeTeamId ? awayTeamId : homeTeamId;
        }

        return Object.freeze({
            isGoal: true,
            scoringTeamId,
            concedingTeamId,
            goalSide,
            ballPosition: Object.freeze({ x, y })
        });
    }
}