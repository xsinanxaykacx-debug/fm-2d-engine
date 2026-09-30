// tests/shotEngine.test.js

import { describe, it, expect } from 'vitest';

import {
    ShotEngine,
    SHOT_TYPES,
    SHOT_SPEEDS
} from '../src/engine/ShotEngine.js';


describe('ShotEngine', () => {

    // ------------------------------------------------------------
    // YARDIMCI FONKSİYONLAR
    // ------------------------------------------------------------

    function createState({
        shooterPosition = { x: 100, y: 100 },
        ballOwnerId = 7
    } = {}) {

        return {
            players: [
                {
                    id: 7,
                    teamId: 'A',
                    role: 'ST',
                    position: { x: shooterPosition.x, y: shooterPosition.y },
                    basePosition: { x: shooterPosition.x, y: shooterPosition.y }
                }
            ],
            ball: {
                ownerId: ballOwnerId,
                position: { x: shooterPosition.x, y: shooterPosition.y },
                velocity: { x: 0, y: 0 }
            }
        };
    }


    function createPossessionSnapshot({
        ownerId = 7
    } = {}) {

        return {
            state: ownerId !== null ? 'CONTROLLED' : 'FREE',
            ownerId,
            nearestPlayerId: ownerId,
            distance: 0,
            nearestOpponentId: null,
            nearestOpponentDistance: Infinity
        };
    }


    // ------------------------------------------------------------
    // 1 — MOTOR OLUŞTURMA
    // ------------------------------------------------------------

    it('motor oluşturulabilmeli', () => {

        const engine = new ShotEngine();

        expect(engine)
            .toBeInstanceOf(ShotEngine);
    });


    // ------------------------------------------------------------
    // 2 — GROUND DOĞRU VELOCITY
    // ------------------------------------------------------------

    it('GROUND şut doğru velocity üretmeli', () => {

        const engine = new ShotEngine();

        const state = createState({
            shooterPosition: { x: 0, y: 0 }
        });

        const snapshot = createPossessionSnapshot({ ownerId: 7 });

        const targetPosition = { x: 100, y: 0 };

        const intent = engine.calculateIntent(
            state,
            snapshot,
            7,
            targetPosition,
            SHOT_TYPES.GROUND
        );

        expect(intent.shooterId).toBe(7);
        expect(intent.shotType).toBe('GROUND');
        expect(intent.targetPosition).toEqual({ x: 100, y: 0 });
        expect(intent.velocity).toEqual({ x: 500, y: 0 });
    });


    // ------------------------------------------------------------
    // 3 — LOB DOĞRU VELOCITY
    // ------------------------------------------------------------

    it('LOB şut doğru velocity üretmeli', () => {

        const engine = new ShotEngine();

        const state = createState({
            shooterPosition: { x: 0, y: 0 }
        });

        const snapshot = createPossessionSnapshot({ ownerId: 7 });

        const targetPosition = { x: 100, y: 0 };

        const intent = engine.calculateIntent(
            state,
            snapshot,
            7,
            targetPosition,
            SHOT_TYPES.LOB
        );

        expect(intent.shotType).toBe('LOB');
        expect(intent.velocity).toEqual({ x: 600, y: 0 });
    });


    // ------------------------------------------------------------
    // 4 — SAHİBİ OLMAYAN OYUNCU ŞUT ATAMAZ
    // ------------------------------------------------------------

    it('top sahibi olmayan oyuncu şut atamamalı', () => {

        const engine = new ShotEngine();

        const state = createState({ ballOwnerId: 99 });

        const snapshot = createPossessionSnapshot({ ownerId: 99 });

        expect(() =>
            engine.calculateIntent(
                state,
                snapshot,
                7,
                { x: 100, y: 0 }
            )
        ).toThrow('Player 7 does not have possession');
    });


    // ------------------------------------------------------------
    // 5 — GEÇERSİZ SHOT TYPE
    // ------------------------------------------------------------

    it('geçersiz shotType hata fırlatmalı', () => {

        const engine = new ShotEngine();

        const state = createState();
        const snapshot = createPossessionSnapshot({ ownerId: 7 });

        expect(() =>
            engine.calculateIntent(
                state,
                snapshot,
                7,
                { x: 100, y: 0 },
                'CROSS'
            )
        ).toThrow('Invalid shotType "CROSS"');
    });


    // ------------------------------------------------------------
    // 6 — EKSİK INPUT
    // ------------------------------------------------------------

    it('eksik input TypeError fırlatmalı', () => {

        const engine = new ShotEngine();

        const state = createState();
        const snapshot = createPossessionSnapshot({ ownerId: 7 });

        expect(() =>
            engine.calculateIntent(null, snapshot, 7, { x: 100, y: 0 })
        ).toThrow(TypeError);

        expect(() =>
            engine.calculateIntent(state, null, 7, { x: 100, y: 0 })
        ).toThrow(TypeError);

        expect(() =>
            engine.calculateIntent(state, snapshot, null, { x: 100, y: 0 })
        ).toThrow(TypeError);

        expect(() =>
            engine.calculateIntent(state, snapshot, 7, null)
        ).toThrow(TypeError);
    });


    // ------------------------------------------------------------
    // 7 — STATE / BALL MUTATE EDİLMEZ
    // ------------------------------------------------------------

    it('state ve ball mutate edilmemeli', () => {

        const engine = new ShotEngine();

        const state = createState();
        const snapshot = createPossessionSnapshot({ ownerId: 7 });

        const stateBefore = JSON.stringify(state);
        const snapshotBefore = JSON.stringify(snapshot);

        engine.calculateIntent(
            state,
            snapshot,
            7,
            { x: 100, y: 0 }
        );

        expect(JSON.stringify(state)).toBe(stateBefore);
        expect(JSON.stringify(snapshot)).toBe(snapshotBefore);
    });


    // ------------------------------------------------------------
    // 8 — SHOTINTENT IMMUTABLE
    // ------------------------------------------------------------

    it('ShotIntent immutable olmalı', () => {

        const engine = new ShotEngine();

        const state = createState();
        const snapshot = createPossessionSnapshot({ ownerId: 7 });

        const intent = engine.calculateIntent(
            state,
            snapshot,
            7,
            { x: 100, y: 0 }
        );

        expect(Object.isFrozen(intent)).toBe(true);
        expect(Object.isFrozen(intent.targetPosition)).toBe(true);
        expect(Object.isFrozen(intent.velocity)).toBe(true);
    });


    // ------------------------------------------------------------
    // 9 — DETERMİNİZM
    // ------------------------------------------------------------

    it('aynı input deterministik sonuç üretmeli', () => {

        const engine = new ShotEngine();

        const state = createState();
        const snapshot = createPossessionSnapshot({ ownerId: 7 });

        const intentA = engine.calculateIntent(
            state, snapshot, 7, { x: 100, y: 0 }, SHOT_TYPES.GROUND
        );

        const intentB = engine.calculateIntent(
            state, snapshot, 7, { x: 100, y: 0 }, SHOT_TYPES.GROUND
        );

        expect(intentA).not.toBe(intentB);
        expect(intentA).toEqual(intentB);
    });


    // ------------------------------------------------------------
    // 10 — GEÇERSİZ TARGETPOSITION
    // ------------------------------------------------------------

    it('geçersiz targetPosition TypeError fırlatmalı', () => {

        const engine = new ShotEngine();

        const state = createState();
        const snapshot = createPossessionSnapshot({ ownerId: 7 });

        expect(() =>
            engine.calculateIntent(state, snapshot, 7, { x: NaN, y: 0 })
        ).toThrow(TypeError);

        expect(() =>
            engine.calculateIntent(state, snapshot, 7, { x: 0, y: Infinity })
        ).toThrow(TypeError);

        expect(() =>
            engine.calculateIntent(state, snapshot, 7, { x: 0 })
        ).toThrow(TypeError);

        expect(() =>
            engine.calculateIntent(state, snapshot, 7, 'invalid')
        ).toThrow(TypeError);
    });


    // ------------------------------------------------------------
    // 11 — SHOOTER BULUNAMAZSA
    // ------------------------------------------------------------

    it('shooter state içinde yoksa hata fırlatmalı', () => {

        const engine = new ShotEngine();

        const state = createState({ ballOwnerId: 7 });

        const snapshot = createPossessionSnapshot({ ownerId: 42 });

        expect(() =>
            engine.calculateIntent(
                state,
                snapshot,
                42,
                { x: 100, y: 0 }
            )
        ).toThrow('Shooter with ID 42 not found in state.');
    });


    // ------------------------------------------------------------
    // 12 — GEÇERLİ INTENT TAM YAPISI
    // ------------------------------------------------------------

    it('geçerli ShotIntent tam yapıda olmalı', () => {

        const engine = new ShotEngine();

        const state = createState({
            shooterPosition: { x: 50, y: 50 }
        });

        const snapshot = createPossessionSnapshot({ ownerId: 7 });

        const intent = engine.calculateIntent(
            state,
            snapshot,
            7,
            { x: 150, y: 50 },
            SHOT_TYPES.GROUND
        );

        expect(Object.keys(intent).sort()).toEqual([
            'shooterId',
            'shotType',
            'targetPosition',
            'velocity'
        ]);

        expect(intent.shooterId).toBe(7);
        expect(intent.shotType).toBe('GROUND');
        expect(intent.targetPosition).toEqual({ x: 150, y: 50 });
        expect(intent.velocity).toEqual({ x: 500, y: 0 });
    });

});