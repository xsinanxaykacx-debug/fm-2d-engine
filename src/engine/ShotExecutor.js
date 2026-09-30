// src/engine/ShotExecutor.js

import { SHOT_TYPES } from './ShotEngine.js';

export class ShotExecutor {

    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.shotEngine
     * @param {Object} dependencies.possessionStateTransition
     */
    constructor({
        shotEngine,
        possessionStateTransition
    } = {}) {

        if (
            !shotEngine ||
            typeof shotEngine.calculateIntent !== 'function'
        ) {
            throw new TypeError(
                'ShotExecutor: "shotEngine" with calculateIntent() is required.'
            );
        }

        if (
            !possessionStateTransition ||
            typeof possessionStateTransition.apply !== 'function'
        ) {
            throw new TypeError(
                'ShotExecutor: "possessionStateTransition" with apply() is required.'
            );
        }

        this.shotEngine = shotEngine;
        this.possessionStateTransition =
            possessionStateTransition;

        Object.freeze(this);
    }


    /**
     * SHOT kararlarını uygular.
     *
     * Öncelik:
     *
     * 1. Decision içindeki targetPosition
     * 2. options.targetPosition
     *
     * Böylece hem otomatik SHOT hem de dışarıdan verilen
     * manuel SHOT desteklenir.
     *
     * @param {Object} state
     * @param {Array} decisions
     * @param {Object} possessionSnapshot
     * @param {Object} [options={}]
     * @param {{x:number,y:number}} [options.targetPosition]
     * @returns {Object}
     */
    execute(
        state,
        decisions = [],
        possessionSnapshot = null,
        options = {}
    ) {

        // ------------------------------------------------
        // Guard 1: state
        // ------------------------------------------------

        if (!state || typeof state !== 'object') {
            throw new TypeError(
                'ShotExecutor.execute: Valid state is required.'
            );
        }

        if (!state.ball || typeof state.ball !== 'object') {
            throw new TypeError(
                'ShotExecutor.execute: state.ball is required.'
            );
        }

        if (typeof state.nextState !== 'function') {
            throw new TypeError(
                'ShotExecutor.execute: state.nextState() is required.'
            );
        }


        // ------------------------------------------------
        // Guard 2: decisions
        // ------------------------------------------------

        if (!Array.isArray(decisions)) {
            throw new TypeError(
                'ShotExecutor.execute: decisions must be an array.'
            );
        }


        // ------------------------------------------------
        // Guard 3: possession
        // ------------------------------------------------

        if (
            !possessionSnapshot ||
            typeof possessionSnapshot !== 'object'
        ) {
            throw new TypeError(
                'ShotExecutor.execute: Valid possessionSnapshot is required.'
            );
        }


        // ------------------------------------------------
        // SHOT kararını bul
        // ------------------------------------------------

        const shotDecisions =
            decisions.filter(
                decision => decision.action === 'SHOT'
            );


        // SHOT yoksa state değişmez
        if (shotDecisions.length === 0) {
            return state;
        }


        // Şimdilik ilk SHOT uygulanır
        const shotDecision =
            shotDecisions[0];


        // ------------------------------------------------
        // Shooter
        // ------------------------------------------------

        const shooterId =
            shotDecision.playerId;


        // ------------------------------------------------
        // Top sahibi kontrolü
        // ------------------------------------------------

        if (
            possessionSnapshot.ownerId !== shooterId
        ) {
            return state;
        }


        // ------------------------------------------------
        // TARGET POSITION
        //
        // Otomatik SHOT:
        //     decision.targetPosition
        //
        // Manuel SHOT:
        //     options.targetPosition
        //
        // options varsa onu öncelikli kullanıyoruz.
        // ------------------------------------------------

        const targetPosition =
            options &&
            options.targetPosition
                ? options.targetPosition
                : shotDecision.targetPosition;


        if (
            !targetPosition ||
            typeof targetPosition !== 'object' ||
            !Number.isFinite(targetPosition.x) ||
            !Number.isFinite(targetPosition.y)
        ) {
            throw new TypeError(
                'ShotExecutor.execute: targetPosition must be a valid {x, y} object.'
            );
        }


        // ------------------------------------------------
        // SHOT TYPE
        // ------------------------------------------------

        const shotType =
            shotDecision.shotType ??
            SHOT_TYPES.GROUND;


        // ------------------------------------------------
        // ShotEngine
        // ------------------------------------------------

        const shotIntent =
            this.shotEngine.calculateIntent(
                state,
                possessionSnapshot,
                shooterId,
                targetPosition,
                shotType
            );


        // ------------------------------------------------
        // Topu serbest bırak
        // ------------------------------------------------

        const nextBall =
            this.possessionStateTransition.apply(
                state.ball,
                possessionSnapshot,
                {
                    release: true,
                    releaseVelocity:
                        shotIntent.velocity
                }
            );


        // ------------------------------------------------
        // Yeni immutable state
        // ------------------------------------------------

        return state.nextState(
            state.players,
            nextBall
        );
    }
}