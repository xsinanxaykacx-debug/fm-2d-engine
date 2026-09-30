// src/engine/InterceptionDetector.js

export const INTERCEPTION_RADIUS = 15; // In pixels

export class InterceptionDetector {
    constructor() {
        Object.freeze(this);
    }

    /**
     * Evaluates potential interception candidates along the ball's travel trajectory.
     *
     * @param {Object} state - Current MatchState object
     * @param {number|string} passerTeamId - Team ID of the passing team (opponents will be checked)
     * @returns {Object} Immutable InterceptionSnapshot
     */
    evaluate(state, passerTeamId) {
        // Strict Guardrails - Fail Fast on missing mandatory inputs
        if (!state || typeof state !== 'object' || !state.ball || !Array.isArray(state.players)) {
            throw new TypeError('InterceptionDetector.evaluate: "state" must be a valid MatchState object with ball and players.');
        }

        if (passerTeamId === undefined || passerTeamId === null) {
            throw new TypeError('InterceptionDetector.evaluate: "passerTeamId" is required.');
        }

        const { ball, players } = state;

        // Rule: If ball is owned or stationary, no interception candidate exists
        const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
        if (ball.ownerId !== null || speed === 0) {
            return Object.freeze({
                hasCandidate: false,
                interceptorId: null,
                distanceToTrajectory: null,
                interceptionPoint: null,
                timeToPoint: null
            });
        }

        const ballX = ball.position.x;
        const ballY = ball.position.y;
        const dirX = ball.velocity.x / speed;
        const dirY = ball.velocity.y / speed;

        let bestCandidate = null;

        // Filter for opponent players only
        const opponents = players.filter(p => p.teamId !== passerTeamId);

        for (const opponent of opponents) {
            const px = opponent.position.x;
            const py = opponent.position.y;

            // Vector from ball to opponent position
            const relX = px - ballX;
            const relY = py - ballY;

            // Scalar projection along the ball's ray trajectory (t > 0 means ahead of ball)
            const rayProj = relX * dirX + relY * dirY;

            // Must be ahead of the ball (projection > 0)
            if (rayProj <= 0) {
                continue;
            }

            // Closest point on the trajectory ray to the opponent
            const closestX = ballX + dirX * rayProj;
            const closestY = ballY + dirY * rayProj;

            // Perpendicular distance (d_perp) from opponent to closest point on ray
            const dPerp = Math.hypot(px - closestX, py - closestY);

            // Must be within interception radius (15 px)
            if (dPerp <= INTERCEPTION_RADIUS) {
                const distanceToPoint = rayProj; // Distance ball travels along ray to point
                const timeToPoint = distanceToPoint / speed;

                const candidate = {
                    interceptorId: opponent.id,
                    distanceToTrajectory: dPerp,
                    interceptionPoint: Object.freeze({ x: closestX, y: closestY }),
                    timeToPoint
                };

                // Selection logic: Smallest timeToPoint -> Tie-breaker: Smallest interceptorId
                if (!bestCandidate) {
                    bestCandidate = candidate;
                } else if (timeToPoint < bestCandidate.timeToPoint) {
                    bestCandidate = candidate;
                } else if (Math.abs(timeToPoint - bestCandidate.timeToPoint) < 1e-9) {
                    if (opponent.id < bestCandidate.interceptorId) {
                        bestCandidate = candidate;
                    }
                }
            }
        }

        if (!bestCandidate) {
            return Object.freeze({
                hasCandidate: false,
                interceptorId: null,
                distanceToTrajectory: null,
                interceptionPoint: null,
                timeToPoint: null
            });
        }

        return Object.freeze({
            hasCandidate: true,
            interceptorId: bestCandidate.interceptorId,
            distanceToTrajectory: bestCandidate.distanceToTrajectory,
            interceptionPoint: bestCandidate.interceptionPoint,
            timeToPoint: bestCandidate.timeToPoint
        });
    }
}