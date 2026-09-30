// tests/shotExecutor.test.js

import { describe, it, expect, vi, afterEach } from 'vitest';

import { ShotExecutor } from '../src/engine/ShotExecutor.js';
import { ShotEngine } from '../src/engine/ShotEngine.js';
import { PossessionStateTransition } from '../src/engine/PossessionStateTransition.js';


describe('ShotExecutor', () => {

    afterEach(() => {
        vi.restoreAllMocks();
    });


    // ------------------------------------------------------------
    // YARDIMCI FONKSİYONLAR
    // ------------------------------------------------------------

    function createBall({
        ownerId = 7,
        velocity = { x: 0, y: 0 },
        position = { x: 100, y: 100 }
    } = {}) {

        const ball = {
            ownerId,
            velocity: { ...velocity },
            position: { ...position },
            cloneWith(changes = {}) {
                return createBall({
                    ownerId: changes.ownerId !== undefined
                        ? changes.ownerId
                        : this.ownerId,
                    velocity: changes.velocity !== undefined
                        ? changes.velocity
                        : this.velocity,
                    position: changes.position !== undefined
                        ? changes.position
                        : this.position
                });
            }
        };

        return Object.freeze(ball);
    }


    function createState({
        players = [],
        ball = createBall()
    } = {}) {

        return {
            players,
            ball,
            nextState(nextPlayers, nextBall) {
                return createState({
                    players: nextPlayers,
                    ball: nextBall
                });
            }
        };
    }


    function createPlayer({
        id,
        teamId = 'A',
        role = 'ST',
        x = 0,
        y = 0
    } = {}) {

        return {
            id,
            teamId,
            role,
            position: { x, y },
            basePosition: { x, y }
        };
    }


    function createPossessionSnapshot({
        ownerId = null,
        nearestOpponentId = null,
        nearestOpponentDistance = Infinity
    } = {}) {

        return {
            state: ownerId !== null ? 'CONTROLLED' : 'FREE',
            ownerId,
            nearestPlayerId: ownerId,
            distance: 0,
            nearestOpponentId,
            nearestOpponentDistance
        };
    }


    function createShotDecision({
        playerId = 7,
        shotType = 'GROUND'
    } = {}) {

        return {
            playerId,
            action: 'SHOT',
            duty: 'HOLD_POSITION',
            behavior: 'SUPPORT',
            target: { x: 0, y: 0 },
            shotType
        };
    }


    function createMoveDecision({
        playerId = 7
    } = {}) {

        return {
            playerId,
            action: 'MOVE',
            duty: 'HOLD_POSITION',
            behavior: 'SUPPORT',
            target: { x: 200, y: 100 }
        };
    }


    function createExecutor() {
        return new ShotExecutor({
            shotEngine: new ShotEngine(),
            possessionStateTransition: new PossessionStateTransition()
        });
    }


    // ------------------------------------------------------------
    // 1 — EXECUTOR OLUŞTURMA
    // ------------------------------------------------------------

    it('executor oluşturulabilmeli', () => {

        const executor = createExecutor();

        expect(executor)
            .toBeInstanceOf(ShotExecutor);
    });


    // ------------------------------------------------------------
    // 2 — EKSİK DEPENDENCY → TypeError
    // ------------------------------------------------------------

    it('eksik shotEngine → TypeError', () => {

        expect(() => new ShotExecutor({
            shotEngine: null,
            possessionStateTransition: new PossessionStateTransition()
        })).toThrow(TypeError);
    });


    it('eksik possessionStateTransition → TypeError', () => {

        expect(() => new ShotExecutor({
            shotEngine: new ShotEngine(),
            possessionStateTransition: null
        })).toThrow(TypeError);
    });


    // ------------------------------------------------------------
    // 3 — SHOT DECISION → ShotEngine ÇAĞRILMALI
    // ------------------------------------------------------------

    it('SHOT decision varsa ShotEngine.calculateIntent çağrılmalı', () => {

        const spy = vi.spyOn(
            ShotEngine.prototype,
            'calculateIntent'
        );

        const executor = new ShotExecutor({
            shotEngine: new ShotEngine(),
            possessionStateTransition: new PossessionStateTransition()
        });

        const players = [
            createPlayer({ id: 7, x: 100, y: 100 })
        ];

        const ball = createBall({ ownerId: 7 });
        const state = createState({ players, ball });

        const possession = createPossessionSnapshot({ ownerId: 7 });
        const decisions = [createShotDecision({ playerId: 7 })];

        executor.execute(
            state,
            decisions,
            possession,
            { targetPosition: { x: 1000, y: 100 } }
        );

        expect(spy).toHaveBeenCalledTimes(1);
    });


    // ------------------------------------------------------------
    // 4 — DOĞRU ARGÜMANLAR İLE ÇAĞRILMALI
    // ------------------------------------------------------------

    it('doğru shooterId, targetPosition ve shotType iletilmeli', () => {

        const spy = vi.spyOn(
            ShotEngine.prototype,
            'calculateIntent'
        );

        const executor = new ShotExecutor({
            shotEngine: new ShotEngine(),
            possessionStateTransition: new PossessionStateTransition()
        });

        const players = [
            createPlayer({ id: 7, x: 100, y: 100 })
        ];

        const ball = createBall({ ownerId: 7 });
        const state = createState({ players, ball });

        const possession = createPossessionSnapshot({ ownerId: 7 });

        const decisions = [createShotDecision({
            playerId: 7,
            shotType: 'LOB'
        })];

        executor.execute(
            state,
            decisions,
            possession,
            { targetPosition: { x: 1000, y: 100 } }
        );

        expect(spy).toHaveBeenCalledWith(
            expect.any(Object),
            possession,
            7,
            { x: 1000, y: 100 },
            'LOB'
        );
    });


    // ------------------------------------------------------------
    // 5 — BALL.OWNERID → null
    // ------------------------------------------------------------

    it('SHOT sonrası Ball.ownerId null olmalı', () => {

        const executor = createExecutor();

        const players = [
            createPlayer({ id: 7, x: 100, y: 100 })
        ];

        const ball = createBall({ ownerId: 7 });
        const state = createState({ players, ball });

        const possession = createPossessionSnapshot({ ownerId: 7 });
        const decisions = [createShotDecision({ playerId: 7 })];

        const newState = executor.execute(
            state,
            decisions,
            possession,
            { targetPosition: { x: 1000, y: 100 } }
        );

        expect(newState.ball.ownerId).toBeNull();
    });


    // ------------------------------------------------------------
    // 6 — BALL.VELOCITY → SHOTINTENT.VELOCITY
    // ------------------------------------------------------------

    it('SHOT sonrası Ball.velocity ShotIntent.velocity olmalı', () => {

        const executor = createExecutor();

        const players = [
            createPlayer({ id: 7, x: 100, y: 100 })
        ];

        const ball = createBall({ ownerId: 7 });
        const state = createState({ players, ball });

        const possession = createPossessionSnapshot({ ownerId: 7 });
        const decisions = [createShotDecision({ playerId: 7 })];

        const newState = executor.execute(
            state,
            decisions,
            possession,
            { targetPosition: { x: 1000, y: 100 } }
        );

        // Direction (1, 0), GROUND speed 500
        expect(newState.ball.velocity).toEqual({ x: 500, y: 0 });
    });


    // ------------------------------------------------------------
    // 7 — ORİJİNAL STATE MUTATE EDİLMEZ
    // ------------------------------------------------------------

    it('orijinal state mutate edilmemeli', () => {

        const executor = createExecutor();

        const players = [
            createPlayer({ id: 7, x: 100, y: 100 })
        ];

        const ball = createBall({ ownerId: 7 });
        const state = createState({ players, ball });

        const possession = createPossessionSnapshot({ ownerId: 7 });
        const decisions = [createShotDecision({ playerId: 7 })];

        const originalBall = { ...state.ball };

        executor.execute(
            state,
            decisions,
            possession,
            { targetPosition: { x: 1000, y: 100 } }
        );

        expect(state.ball.ownerId).toBe(originalBall.ownerId);
        expect(state.ball.velocity).toEqual(originalBall.velocity);
    });


    // ------------------------------------------------------------
    // 8 — SHOT OLMAYAN DECISION → STATE AYNEN
    // ------------------------------------------------------------

    it('SHOT olmayan decision state\'i değiştirmemeli', () => {

        const executor = createExecutor();

        const players = [
            createPlayer({ id: 7, x: 100, y: 100 })
        ];

        const ball = createBall({ ownerId: 7 });
        const state = createState({ players, ball });

        const possession = createPossessionSnapshot({ ownerId: 7 });
        const decisions = [createMoveDecision({ playerId: 7 })];

        const newState = executor.execute(
            state,
            decisions,
            possession,
            { targetPosition: { x: 1000, y: 100 } }
        );

        expect(newState).toBe(state);
    });


    // ------------------------------------------------------------
    // 9 — TARGETPOSITION YOKSA HATA
    // ------------------------------------------------------------

    it('targetPosition yoksa hata fırlatmalı', () => {

        const executor = createExecutor();

        const players = [
            createPlayer({ id: 7, x: 100, y: 100 })
        ];

        const ball = createBall({ ownerId: 7 });
        const state = createState({ players, ball });

        const possession = createPossessionSnapshot({ ownerId: 7 });
        const decisions = [createShotDecision({ playerId: 7 })];

        expect(() => {
            executor.execute(state, decisions, possession);
        }).toThrow(TypeError);
    });


    // ------------------------------------------------------------
    // 10 — TOP SAHİBİ OLMAYAN OYUNCUNUN SHOT'U UYGULANMAZ
    // ------------------------------------------------------------

    it('top sahibi olmayan oyuncunun SHOT\'u uygulanmamalı', () => {

        const executor = createExecutor();

        const players = [
            createPlayer({ id: 7, x: 100, y: 100 })
        ];

        const ball = createBall({ ownerId: 7 });
        const state = createState({ players, ball });

        // Snapshot'ta top sahibi 99
        const possession = createPossessionSnapshot({ ownerId: 99 });

        const decisions = [createShotDecision({ playerId: 7 })];

        const newState = executor.execute(
            state,
            decisions,
            possession,
            { targetPosition: { x: 1000, y: 100 } }
        );

        expect(newState).toBe(state);
    });


    // ------------------------------------------------------------
    // 11 — SHOT DECISION YOKSA STATE AYNEN DÖNER
    // ------------------------------------------------------------

    it('SHOT decision yoksa state aynen dönmeli', () => {

        const executor = createExecutor();

        const players = [
            createPlayer({ id: 7, x: 100, y: 100 })
        ];

        const ball = createBall({ ownerId: 7 });
        const state = createState({ players, ball });

        const possession = createPossessionSnapshot({ ownerId: 7 });

        const newState = executor.execute(
            state,
            [],
            possession,
            { targetPosition: { x: 1000, y: 100 } }
        );

        expect(newState).toBe(state);
    });


    // ------------------------------------------------------------
    // 12 — DETERMİNİSTİK
    // ------------------------------------------------------------

    it('aynı input deterministik sonuç üretmeli', () => {

        const executor = createExecutor();

        const players = [
            createPlayer({ id: 7, x: 100, y: 100 })
        ];

        const ball = createBall({ ownerId: 7 });
        const state = createState({ players, ball });

        const possession = createPossessionSnapshot({ ownerId: 7 });
        const decisions = [createShotDecision({ playerId: 7 })];

        const resultA = executor.execute(
            state,
            decisions,
            possession,
            { targetPosition: { x: 1000, y: 100 } }
        );

        const resultB = executor.execute(
            state,
            decisions,
            possession,
            { targetPosition: { x: 1000, y: 100 } }
        );

        expect(resultA.ball.ownerId).toBe(resultB.ball.ownerId);
        expect(resultA.ball.velocity).toEqual(resultB.ball.velocity);
    });

});