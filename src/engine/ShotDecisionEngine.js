// src/engine/ShotDecisionEngine.js

import { SHOT_TYPES } from './ShotEngine.js';

export const DEFAULT_SHOOT_RANGE = 30;
export const DEFAULT_PRESSURE_THRESHOLD = 30;

export class ShotDecisionEngine {
    constructor({
        pitchContext,
        shootRange = DEFAULT_SHOOT_RANGE,
        pressureThreshold = DEFAULT_PRESSURE_THRESHOLD
    } = {}) {

        if (
            !pitchContext ||
            typeof pitchContext !== 'object'
        ) {
            throw new TypeError(
                'ShotDecisionEngine: pitchContext is required.'
            );
        }

        if (
            !Number.isFinite(shootRange) ||
            shootRange <= 0
        ) {
            throw new TypeError(
                'ShotDecisionEngine: shootRange must be positive.'
            );
        }

        if (
            !Number.isFinite(pressureThreshold) ||
            pressureThreshold < 0
        ) {
            throw new TypeError(
                'ShotDecisionEngine: pressureThreshold must be non-negative.'
            );
        }

        this.pitchContext = pitchContext;
        this.shootRange = shootRange;
        this.pressureThreshold = pressureThreshold;

        Object.freeze(this);
    }

    evaluate(state, possessionSnapshot) {
        if (
            !state ||
            typeof state !== 'object'
        ) {
            throw new TypeError(
                'ShotDecisionEngine.evaluate: Valid state is required.'
            );
        }

        if (!Array.isArray(state.players)) {
            throw new TypeError(
                'ShotDecisionEngine.evaluate: state.players must be an array.'
            );
        }

        if (
            !possessionSnapshot ||
            typeof possessionSnapshot !== 'object'
        ) {
            throw new TypeError(
                'ShotDecisionEngine.evaluate: Valid possessionSnapshot is required.'
            );
        }

        if (
            possessionSnapshot.ownerId === undefined
        ) {
            throw new TypeError(
                'ShotDecisionEngine.evaluate: possessionSnapshot.ownerId is required.'
            );
        }

        return Object.freeze(
            state.players.map(player => {

                if (
                    !player ||
                    typeof player !== 'object'
                ) {
                    throw new TypeError(
                        'ShotDecisionEngine.evaluate: Invalid player.'
                    );
                }

                if (
                    player.id === undefined ||
                    player.id === null
                ) {
                    throw new TypeError(
                        'ShotDecisionEngine.evaluate: Player id is required.'
                    );
                }

                if (
                    !player.position ||
                    !Number.isFinite(player.position.x) ||
                    !Number.isFinite(player.position.y)
                ) {
                    throw new TypeError(
                        `ShotDecisionEngine.evaluate: Player ${player.id} has invalid position.`
                    );
                }

                const isOwner =
                    possessionSnapshot.ownerId === player.id;

                if (!isOwner) {
                    return Object.freeze({
                        playerId: player.id,
                        canShoot: false,
                        reason: 'NOT_OWNER'
                    });
                }

                if (
                    player.teamId === undefined ||
                    player.teamId === null
                ) {
                    throw new TypeError(
                        `ShotDecisionEngine.evaluate: Player ${player.id} teamId is required.`
                    );
                }

                const goalCenter =
                    this.pitchContext.getAttackingGoalCenter(
                        player.teamId
                    );

                const distanceToGoal =
                    Math.hypot(
                        player.position.x - goalCenter.x,
                        player.position.y - goalCenter.y
                    );

                if (
                    distanceToGoal >=
                    this.shootRange
                ) {
                    return Object.freeze({
                        playerId: player.id,
                        canShoot: false,
                        reason: 'TOO_FAR',
                        distanceToGoal
                    });
                }

                const nearestOpponentDistance =
                    possessionSnapshot.nearestOpponentDistance ??
                    Infinity;

                if (
                    !Number.isFinite(nearestOpponentDistance) &&
                    nearestOpponentDistance !== Infinity
                ) {
                    throw new TypeError(
                        'ShotDecisionEngine.evaluate: nearestOpponentDistance must be finite or Infinity.'
                    );
                }

                if (
                    nearestOpponentDistance <
                    this.pressureThreshold
                ) {
                    return Object.freeze({
                        playerId: player.id,
                        canShoot: false,
                        reason: 'OPPONENT_PRESSURE',
                        distanceToGoal,
                        nearestOpponentDistance
                    });
                }

                const targetPosition =
                    this.pitchContext.getShotTarget(
                        player.teamId
                    );

                return Object.freeze({
                    playerId: player.id,
                    canShoot: true,
                    targetPosition,
                    shotType: SHOT_TYPES.GROUND,
                    distanceToGoal,
                    nearestOpponentDistance
                });
            })
        );
    }
}