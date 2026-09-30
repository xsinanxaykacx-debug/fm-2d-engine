// src/engine/PlayerBehaviorEngine.js

export const BEHAVIORS = Object.freeze({
    HOLD_POSITION: 'HOLD_POSITION',
    MOVE_TO_BALL: 'MOVE_TO_BALL',
    SUPPORT: 'SUPPORT',
    PRESS: 'PRESS',
    RECOVER_POSITION: 'RECOVER_POSITION',
    RUN_FORWARD: 'RUN_FORWARD'
});

export class PlayerBehaviorEngine {

    constructor({
        supportDistance = 180,
        pressDistance = 180,
        ballInfluenceDistance = 260,
        forwardRunDistance = 120
    } = {}) {

        if (!Number.isFinite(supportDistance) || supportDistance <= 0) {
            throw new TypeError(
                'PlayerBehaviorEngine: supportDistance must be positive.'
            );
        }

        if (!Number.isFinite(pressDistance) || pressDistance <= 0) {
            throw new TypeError(
                'PlayerBehaviorEngine: pressDistance must be positive.'
            );
        }

        if (!Number.isFinite(ballInfluenceDistance) || ballInfluenceDistance <= 0) {
            throw new TypeError(
                'PlayerBehaviorEngine: ballInfluenceDistance must be positive.'
            );
        }

        if (!Number.isFinite(forwardRunDistance) || forwardRunDistance <= 0) {
            throw new TypeError(
                'PlayerBehaviorEngine: forwardRunDistance must be positive.'
            );
        }

        this.config = Object.freeze({
            supportDistance,
            pressDistance,
            ballInfluenceDistance,
            forwardRunDistance
        });

        Object.freeze(this);
    }

    evaluate(state, tacticalSnapshots = []) {

        if (!state || typeof state !== 'object') {
            throw new TypeError(
                'PlayerBehaviorEngine.evaluate: Valid state is required.'
            );
        }

        if (!Array.isArray(state.players)) {
            throw new TypeError(
                'PlayerBehaviorEngine.evaluate: state.players must be an array.'
            );
        }

        if (!state.ball || !state.ball.position) {
            throw new TypeError(
                'PlayerBehaviorEngine.evaluate: state.ball is required.'
            );
        }

        if (!Array.isArray(tacticalSnapshots)) {
            throw new TypeError(
                'PlayerBehaviorEngine.evaluate: tacticalSnapshots must be an array.'
            );
        }

        const tacticalMap = new Map(
            tacticalSnapshots.map(snapshot => [
                snapshot.playerId,
                snapshot
            ])
        );

        const ballPosition = state.ball.position;

        return state.players.map(player => {

            const tactical = tacticalMap.get(player.id);

            if (!tactical) {
                throw new TypeError(
                    `PlayerBehaviorEngine.evaluate: Missing tactical snapshot for player ${player.id}.`
                );
            }

            const distanceToBall = Math.hypot(
                player.position.x - ballPosition.x,
                player.position.y - ballPosition.y
            );

            const opponent = this.findNearestOpponent(
                player,
                state.players
            );

            const distanceToOpponent = opponent
                ? Math.hypot(
                    player.position.x - opponent.position.x,
                    player.position.y - opponent.position.y
                )
                : Infinity;

            const behavior = this.resolveBehavior({
                player,
                distanceToBall,
                distanceToOpponent
            });

            const target = this.calculateTarget({
                player,
                behavior,
                tacticalTarget: tactical.tacticalTarget,
                ballPosition
            });

            return Object.freeze({
                playerId: player.id,
                teamId: player.teamId,
                behavior,
                target: Object.freeze({
                    x: target.x,
                    y: target.y
                }),
                distanceToBall,
                distanceToOpponent
            });
        });
    }

    resolveBehavior({
        player,
        distanceToBall,
        distanceToOpponent
    }) {

        if (player.role === 'GK') {
            return BEHAVIORS.HOLD_POSITION;
        }

        if (distanceToBall > this.config.ballInfluenceDistance) {
            return BEHAVIORS.RECOVER_POSITION;
        }

        if (distanceToBall <= this.config.pressDistance) {

            if (distanceToOpponent <= this.config.pressDistance) {
                return BEHAVIORS.PRESS;
            }

            return BEHAVIORS.MOVE_TO_BALL;
        }

        if (['LW', 'RW', 'ST'].includes(player.role)) {
            return BEHAVIORS.RUN_FORWARD;
        }

        return BEHAVIORS.SUPPORT;
    }

    calculateTarget({
        player,
        behavior,
        tacticalTarget,
        ballPosition
    }) {

        switch (behavior) {

            case BEHAVIORS.MOVE_TO_BALL:
                return this.moveTowardBall(
                    player,
                    ballPosition,
                    55
                );

            case BEHAVIORS.PRESS:
                return this.moveTowardBall(
                    player,
                    ballPosition,
                    35
                );

            case BEHAVIORS.SUPPORT:
                return this.calculateSupportPosition(
                    player,
                    ballPosition,
                    tacticalTarget
                );

            case BEHAVIORS.RUN_FORWARD:
                return this.calculateForwardRun(
                    player,
                    tacticalTarget
                );

            case BEHAVIORS.RECOVER_POSITION:
            case BEHAVIORS.HOLD_POSITION:
            default:
                return {
                    x: tacticalTarget.x,
                    y: tacticalTarget.y
                };
        }
    }

    moveTowardBall(player, ballPosition, distanceFromBall) {

        const dx = ballPosition.x - player.position.x;
        const dy = ballPosition.y - player.position.y;

        const distance = Math.hypot(dx, dy);

        if (distance === 0) {
            return {
                x: player.position.x,
                y: player.position.y
            };
        }

        return {
            x: ballPosition.x - (dx / distance) * distanceFromBall,
            y: ballPosition.y - (dy / distance) * distanceFromBall
        };
    }

    calculateSupportPosition(
        player,
        ballPosition,
        tacticalTarget
    ) {

        return {
            x: tacticalTarget.x +
                (ballPosition.x - player.position.x) * 0.25,

            y: tacticalTarget.y +
                (ballPosition.y - player.position.y) * 0.25
        };
    }

    /**
     * Takımın hücum yönüne göre ileri koşu hedefi hesaplar.
     *
     * Desteklenen takım ID'leri:
     *   - 'HOME' / 'A'  → sağa doğru hücum (+x)
     *   - 'AWAY' / 'B'  → sola doğru hücum (-x)
     *
     * Bilinmeyen takım ID'leri için TypeError fırlatılır.
     * Örtülü fallback YOKTUR — determinizm ve güvenlik için.
     */
    calculateForwardRun(
        player,
        tacticalTarget
    ) {

        let direction;

        if (
            player.teamId === 'HOME' ||
            player.teamId === 'A'
        ) {
            direction = 1;
        } else if (
            player.teamId === 'AWAY' ||
            player.teamId === 'B'
        ) {
            direction = -1;
        } else {
            throw new TypeError(
                `PlayerBehaviorEngine.calculateForwardRun: Unsupported teamId "${player.teamId}".`
            );
        }

        return {
            x: tacticalTarget.x +
                direction * this.config.forwardRunDistance,

            y: tacticalTarget.y
        };
    }

    findNearestOpponent(player, players) {

        let nearest = null;
        let nearestDistance = Infinity;

        for (const candidate of players) {

            if (candidate.teamId === player.teamId) {
                continue;
            }

            const distance = Math.hypot(
                player.position.x - candidate.position.x,
                player.position.y - candidate.position.y
            );

            /*
             * Tie-breaker: Eşit mesafede küçük ID kazanır.
             *
             * Determinizm için kritik:
             * Aynı input için her zaman aynı rakip seçilmelidir.
             */
            if (
                distance < nearestDistance ||
                (
                    nearest !== null &&
                    Math.abs(distance - nearestDistance) < 1e-9 &&
                    candidate.id < nearest.id
                )
            ) {
                nearestDistance = distance;
                nearest = candidate;
            }
        }

        return nearest;
    }
}