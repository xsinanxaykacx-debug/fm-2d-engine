// src/engine/DecisionEngine.js

import { Actions, Duties } from '../core/types.js';

export const PASS_PRESSURE_DISTANCE = 50;

export class DecisionEngine {

    constructor() {
        Object.freeze(this);
    }

    evaluate(
        state,
        tacticalSnapshots = [],
        behaviorSnapshots = [],
        possessionSnapshot = null,
        passTargets = [],
        shotDecisions = []
    ) {

        // Guard 1: state validation
        if (!state || typeof state !== 'object' || !Array.isArray(state.players)) {
            throw new TypeError(
                'DecisionEngine.evaluate: Valid state with players array is required.'
            );
        }

        // Guard 2: passTargets validation
        if (!Array.isArray(passTargets)) {
            throw new TypeError(
                'DecisionEngine.evaluate: passTargets must be an array.'
            );
        }

        // Guard 3: shotDecisions validation
        if (!Array.isArray(shotDecisions)) {
            throw new TypeError(
                'DecisionEngine.evaluate: shotDecisions must be an array.'
            );
        }

        const tacticalMap = new Map(
            tacticalSnapshots.map(snapshot => [
                snapshot.playerId,
                snapshot.tacticalTarget
            ])
        );

        const behaviorMap = new Map(
            behaviorSnapshots.map(snapshot => [
                snapshot.playerId,
                snapshot
            ])
        );

        const shotDecisionMap = new Map(
            shotDecisions.map(decision => [
                decision.playerId,
                decision
            ])
        );

        return state.players.map(player => {

            const tacticalTarget =
                tacticalMap.get(player.id) ||
                player.basePosition;

            const behavior =
                behaviorMap.get(player.id);

            const target =
                behavior?.target ||
                tacticalTarget;

            const dx =
                target.x - player.position.x;

            const dy =
                target.y - player.position.y;

            const distance =
                Math.hypot(dx, dy);

            // ------------------------------------------------
            // PASS kararı
            // ------------------------------------------------

            const isOwner =
                possessionSnapshot !== null &&
                state.ball !== null &&
                state.ball !== undefined &&
                state.ball.ownerId === player.id;

            const hasPassTarget =
                passTargets.length > 0;

            const opponentIsClose =
                possessionSnapshot !== null &&
                possessionSnapshot.nearestOpponentId !== null &&
                Number.isFinite(possessionSnapshot.nearestOpponentDistance) &&
                possessionSnapshot.nearestOpponentDistance <
                    PASS_PRESSURE_DISTANCE;

            const shouldPass =
                isOwner &&
                hasPassTarget &&
                opponentIsClose;

            // ------------------------------------------------
            // SHOT kararı (öncelikli)
            // ------------------------------------------------

            const shotDecision =
                shotDecisionMap.get(player.id);

            const canShoot =
                shotDecision !== undefined &&
                shotDecision.canShoot === true;

            // ------------------------------------------------
            // Action kararı
            // ------------------------------------------------

            let action;
            let receiverId;
            let targetPosition;
            let shotType;

            if (canShoot) {

                action = Actions.SHOT;
                targetPosition = shotDecision.targetPosition;
                shotType = shotDecision.shotType;

            } else if (shouldPass) {

                action = Actions.PASS;
                receiverId = passTargets[0].receiverId;

            } else {

                action =
                    distance > 0.1
                        ? Actions.MOVE
                        : Actions.NONE;
            }

            // ------------------------------------------------
            // Decision çıktısı
            // ------------------------------------------------

            if (canShoot) {
                return Object.freeze({
                    playerId: player.id,
                    duty: Duties.HOLD_POSITION,
                    action,
                    behavior: behavior?.behavior || 'HOLD_POSITION',
                    target: Object.freeze({
                        x: target.x,
                        y: target.y
                    }),
                    targetPosition,
                    shotType
                });
            }

            if (shouldPass) {
                return Object.freeze({
                    playerId: player.id,
                    duty: Duties.HOLD_POSITION,
                    action,
                    behavior: behavior?.behavior || 'HOLD_POSITION',
                    target: Object.freeze({
                        x: target.x,
                        y: target.y
                    }),
                    receiverId
                });
            }

            return Object.freeze({
                playerId: player.id,
                duty: Duties.HOLD_POSITION,
                action,
                behavior: behavior?.behavior || 'HOLD_POSITION',
                target: Object.freeze({
                    x: target.x,
                    y: target.y
                })
            });
        });
    }
}