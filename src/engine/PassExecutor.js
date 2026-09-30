// src/engine/PassExecutor.js

import { PASS_TYPES } from './PassEngine.js';

export class PassExecutor {

    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.passEngine - PassEngine instance
     * @param {Object} dependencies.possessionStateTransition - PossessionStateTransition instance
     */
    constructor({
        passEngine,
        possessionStateTransition
    } = {}) {

        if (!passEngine || typeof passEngine.calculateIntent !== 'function') {
            throw new TypeError(
                'PassExecutor: "passEngine" with calculateIntent() is required.'
            );
        }

        if (
            !possessionStateTransition ||
            typeof possessionStateTransition.apply !== 'function'
        ) {
            throw new TypeError(
                'PassExecutor: "possessionStateTransition" with apply() is required.'
            );
        }

        this.passEngine = passEngine;
        this.possessionStateTransition = possessionStateTransition;

        Object.freeze(this);
    }


    /**
     * Verilen decision listesindeki PASS kararlarını uygular.
     *
     * İlk sürümde:
     *   - Sadece ilk PASS decision'ı işlenir (tek pas / tick).
     *   - passType GROUND kullanılır.
     *   - Sadece top sahipliği değişir (release + velocity).
     *   - Oyuncu pozisyonu / BallPhysics / Interception DEĞİŞMEZ.
     *
     * @param {Object} state - MatchState
     * @param {Array} decisions - DecisionEngine çıktısı
     * @param {Object} possessionSnapshot - PossessionEngine çıktısı
     * @returns {Object} Yeni MatchState (veya değişmemiş state)
     */
    execute(state, decisions = [], possessionSnapshot = null) {

        // Guard 1: state validation
        if (!state || typeof state !== 'object') {
            throw new TypeError(
                'PassExecutor.execute: Valid state is required.'
            );
        }

        if (!state.ball || typeof state.ball !== 'object') {
            throw new TypeError(
                'PassExecutor.execute: state.ball is required.'
            );
        }

        if (typeof state.nextState !== 'function') {
            throw new TypeError(
                'PassExecutor.execute: state.nextState() is required.'
            );
        }

        // Guard 2: decisions validation
        if (!Array.isArray(decisions)) {
            throw new TypeError(
                'PassExecutor.execute: decisions must be an array.'
            );
        }

        // Guard 3: possessionSnapshot validation
        if (!possessionSnapshot || typeof possessionSnapshot !== 'object') {
            throw new TypeError(
                'PassExecutor.execute: Valid possessionSnapshot is required.'
            );
        }

        // PASS decision'larını bul
        const passDecisions = decisions.filter(
            d => d.action === 'PASS'
        );

        // PASS yoksa state aynen döner
        if (passDecisions.length === 0) {
            return state;
        }

        // İlk PASS decision'ı al
        const passDecision = passDecisions[0];

        // Guard 4: receiverId zorunlu
        if (
            passDecision.receiverId === undefined ||
            passDecision.receiverId === null
        ) {
            throw new Error(
                'PassExecutor.execute: PASS decision requires receiverId.'
            );
        }

        const passerId = passDecision.playerId;
        const receiverId = passDecision.receiverId;

        // Guard 5: Top sahibi kontrolü
        // PassEngine zaten bunu yapıyor ama burada da kontrol edelim,
        // çünkü Executor state'i değiştirmeye çalışmadan önce durmalı.
        if (possessionSnapshot.ownerId !== passerId) {
            return state;   // top sahibi değilse pas uygulanmaz
        }

        // PassEngine ile intent hesapla
        const passIntent = this.passEngine.calculateIntent(
            state,
            possessionSnapshot,
            passerId,
            receiverId,
            PASS_TYPES.GROUND
        );

        // PossessionStateTransition ile topu serbest bırak
        const nextBall = this.possessionStateTransition.apply(
            state.ball,
            possessionSnapshot,
            {
                release: true,
                releaseVelocity: passIntent.velocity
            }
        );

        // Yeni state üret
        return state.nextState(state.players, nextBall);
    }
}