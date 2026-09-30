// src/engine/ReceiverDetector.js

export const CONTROL_RADIUS = 22;

export class ReceiverDetector {
    constructor() {
        Object.freeze(this);
    }

    evaluate(state, teamId, targetReceiverId = null) {
        if (!state || typeof state !== 'object' || !state.ball || !Array.isArray(state.players)) {
            throw new TypeError('ReceiverDetector.evaluate: "state" must be a valid MatchState object with ball and players.');
        }

        if (teamId === undefined || teamId === null) {
            throw new TypeError('ReceiverDetector.evaluate: "teamId" is required.');
        }

        const { ball, players } = state;
        const speed = Math.hypot(ball.velocity.x, ball.velocity.y);

        if (ball.ownerId !== null || speed === 0) {
            return Object.freeze({ hasReceiver: false, receiverId: null, distanceToBall: null });
        }

        const ballX = ball.position.x;
        const ballY = ball.position.y;
        const teammates = players.filter(player => player.teamId === teamId);

        if (targetReceiverId !== null && targetReceiverId !== undefined) {
            const targetPlayer = teammates.find(player => player.id === targetReceiverId);

            if (!targetPlayer) {
                return Object.freeze({ hasReceiver: false, receiverId: null, distanceToBall: null });
            }

            const distance = Math.hypot(
                targetPlayer.position.x - ballX,
                targetPlayer.position.y - ballY
            );

            if (distance <= CONTROL_RADIUS) {
                return Object.freeze({
                    hasReceiver: true,
                    receiverId: targetPlayer.id,
                    distanceToBall: distance
                });
            }

            return Object.freeze({ hasReceiver: false, receiverId: null, distanceToBall: null });
        }

        let bestCandidate = null;

        for (const teammate of teammates) {
            const distance = Math.hypot(
                teammate.position.x - ballX,
                teammate.position.y - ballY
            );

            if (distance > CONTROL_RADIUS) continue;

            if (
                !bestCandidate ||
                distance < bestCandidate.dist ||
                (Math.abs(distance - bestCandidate.dist) < 1e-9 && teammate.id < bestCandidate.id)
            ) {
                bestCandidate = { id: teammate.id, dist: distance };
            }
        }

        if (!bestCandidate) {
            return Object.freeze({ hasReceiver: false, receiverId: null, distanceToBall: null });
        }

        return Object.freeze({
            hasReceiver: true,
            receiverId: bestCandidate.id,
            distanceToBall: bestCandidate.dist
        });
    }
}
