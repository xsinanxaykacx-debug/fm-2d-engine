// src/engine/ReceiverDetector.js

export const CONTROL_RADIUS = 12;

export class ReceiverDetector {

    constructor() {
        Object.freeze(this);
    }

    /**
     * Determines whether a teammate can receive the free ball.
     *
     * If targetReceiverId is supplied, ONLY that player can receive.
     * If the target player is not within CONTROL_RADIUS, nobody receives.
     *
     * If targetReceiverId is not supplied, the closest teammate inside
     * CONTROL_RADIUS may receive.
     */
    evaluate(
        state,
        teamId,
        targetReceiverId = null
    ) {

        if (
            !state ||
            typeof state !== 'object' ||
            !state.ball ||
            !Array.isArray(state.players)
        ) {
            throw new TypeError(
                'ReceiverDetector.evaluate: "state" must be a valid MatchState object with ball and players.'
            );
        }

        if (teamId === undefined || teamId === null) {
            throw new TypeError(
                'ReceiverDetector.evaluate: "teamId" is required.'
            );
        }

        const { ball, players } = state;

        const speed = Math.hypot(
            ball.velocity.x,
            ball.velocity.y
        );

        // Ball must be free and moving.
        if (
            ball.ownerId !== null ||
            speed === 0
        ) {
            return Object.freeze({
                hasReceiver: false,
                receiverId: null,
                distanceToBall: null
            });
        }

        const ballX = ball.position.x;
        const ballY = ball.position.y;

        const teammates =
            players.filter(
                player => player.teamId === teamId
            );

        // ========================================================
        // TARGETED PASS
        // ========================================================

        if (
            targetReceiverId !== null &&
            targetReceiverId !== undefined
        ) {

            const targetPlayer =
                teammates.find(
                    player => player.id === targetReceiverId
                );

            // Target player does not exist.
            if (!targetPlayer) {
                return Object.freeze({
                    hasReceiver: false,
                    receiverId: null,
                    distanceToBall: null
                });
            }

            const distance =
                Math.hypot(
                    targetPlayer.position.x - ballX,
                    targetPlayer.position.y - ballY
                );

            // Target is close enough -> receive.
            if (distance <= CONTROL_RADIUS) {
                return Object.freeze({
                    hasReceiver: true,
                    receiverId: targetPlayer.id,
                    distanceToBall: distance
                });
            }

            // IMPORTANT:
            // A targeted pass must NOT fall back to another teammate.
            return Object.freeze({
                hasReceiver: false,
                receiverId: null,
                distanceToBall: null
            });
        }

        // ========================================================
        // UNTARGETED BALL
        // ========================================================

        let bestCandidate = null;

        for (const teammate of teammates) {

            const distance =
                Math.hypot(
                    teammate.position.x - ballX,
                    teammate.position.y - ballY
                );

            if (distance > CONTROL_RADIUS) {
                continue;
            }

            if (!bestCandidate) {

                bestCandidate = {
                    id: teammate.id,
                    dist: distance
                };

                continue;
            }

            if (distance < bestCandidate.dist) {

                bestCandidate = {
                    id: teammate.id,
                    dist: distance
                };

                continue;
            }

            if (
                Math.abs(distance - bestCandidate.dist) < 1e-9 &&
                teammate.id < bestCandidate.id
            ) {

                bestCandidate = {
                    id: teammate.id,
                    dist: distance
                };
            }
        }

        if (!bestCandidate) {
            return Object.freeze({
                hasReceiver: false,
                receiverId: null,
                distanceToBall: null
            });
        }

        return Object.freeze({
            hasReceiver: true,
            receiverId: bestCandidate.id,
            distanceToBall: bestCandidate.dist
        });
    }
}