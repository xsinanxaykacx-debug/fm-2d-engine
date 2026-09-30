// tests/passExecutor.test.js

import { describe, it, expect, vi, afterEach } from 'vitest';

import { PassExecutor } from '../src/engine/PassExecutor.js';
import { PassEngine } from '../src/engine/PassEngine.js';
import { PossessionStateTransition } from '../src/engine/PossessionStateTransition.js';


describe('PassExecutor', () => {

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
        role = 'CM',
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


    function createPassDecision({
        playerId = 7,
        receiverId = 10
    } = {}) {

        return {
            playerId,
            action: 'PASS',
            duty: 'HOLD_POSITION',
            behavior: 'SUPPORT',
            target: { x: 0, y: 0 },
            receiverId
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
        return new PassExecutor({
            passEngine: new PassEngine(),
            possessionStateTransition: new PossessionStateTransition()
        });
    }


    // ------------------------------------------------------------
    // 1 — EXECUTOR OLUŞTURMA
    // ------------------------------------------------------------

    it('executor oluşturulabilmeli', () => {

        const executor = createExecutor();

        expect(executor)
            .toBeInstanceOf(PassExecutor);
    });


    // ------------------------------------------------------------
    // 2 — EKSİK DEPENDENCY → TypeError
    // ------------------------------------------------------------

    it('eksik passEngine → TypeError', () => {

        expect(() => new PassExecutor({
            passEngine: null,
            possessionStateTransition: new PossessionStateTransition()
        })).toThrow(TypeError);
    });


    it('eksik possessionStateTransition → TypeError', () => {

        expect(() => new PassExecutor({
            passEngine: new PassEngine(),
            possessionStateTransition: null
        })).toThrow(TypeError);
    });


    // ------------------------------------------------------------
    // 3 — PASS DECISION → PassEngine ÇAĞRILMALI
    // ------------------------------------------------------------

    it('PASS decision varsa PassEngine.calculateIntent çağrılmalı', () => {

        const spy = vi.spyOn(
            PassEngine.prototype,
            'calculateIntent'
        );

        const executor = new PassExecutor({
            passEngine: new PassEngine(),
            possessionStateTransition: new PossessionStateTransition()
        });

        const players = [
            createPlayer({ id: 7, x: 100, y: 100 }),
            createPlayer({ id: 10, x: 400, y: 100 })
        ];

        const ball = createBall({ ownerId: 7 });
        const state = createState({ players, ball });

        const possession = createPossessionSnapshot({ ownerId: 7 });
        const decisions = [createPassDecision({ playerId: 7, receiverId: 10 })];

        executor.execute(state, decisions, possession);

        expect(spy).toHaveBeenCalledTimes(1);
    });


    // ------------------------------------------------------------
    // 4 — DOĞRU passerId, receiverId KULLANILMALI
    // ------------------------------------------------------------

    it('doğru passerId ve receiverId ile calculateIntent çağrılmalı', () => {

        const spy = vi.spyOn(
            PassEngine.prototype,
            'calculateIntent'
        );

        const executor = new PassExecutor({
            passEngine: new PassEngine(),
            possessionStateTransition: new PossessionStateTransition()
        });

        const players = [
            createPlayer({ id: 7, x: 100, y: 100 }),
            createPlayer({ id: 10, x: 400, y: 100 })
        ];

        const ball = createBall({ ownerId: 7 });
        const state = createState({ players, ball });

        const possession = createPossessionSnapshot({ ownerId: 7 });
        const decisions = [createPassDecision({ playerId: 7, receiverId: 10 })];

        executor.execute(state, decisions, possession);

        expect(spy).toHaveBeenCalledWith(
            expect.any(Object),
            possession,
            7,
            10,
            'GROUND'
        );
    });


    // ------------------------------------------------------------
    // 5 — BALL.OWNERID → null
    // ------------------------------------------------------------

    it('PASS sonrası Ball.ownerId null olmalı', () => {

        const executor = createExecutor();

        const players = [
            createPlayer({ id: 7, x: 100, y: 100 }),
            createPlayer({ id: 10, x: 400, y: 100 })
        ];

        const ball = createBall({ ownerId: 7 });
        const state = createState({ players, ball });

        const possession = createPossessionSnapshot({ ownerId: 7 });
        const decisions = [createPassDecision({ playerId: 7, receiverId: 10 })];

        const newState = executor.execute(state, decisions, possession);

        expect(newState.ball.ownerId).toBeNull();
    });


    // ------------------------------------------------------------
    // 6 — BALL.VELOCITY → PassIntent.velocity
    // ------------------------------------------------------------

    it('PASS sonrası Ball.velocity PassIntent.velocity olmalı', () => {

        const executor = createExecutor();

        const players = [
            createPlayer({ id: 7, x: 100, y: 100 }),
            createPlayer({ id: 10, x: 400, y: 100 })
        ];

        const ball = createBall({ ownerId: 7 });
        const state = createState({ players, ball });

        const possession = createPossessionSnapshot({ ownerId: 7 });
        const decisions = [createPassDecision({ playerId: 7, receiverId: 10 })];

        const newState = executor.execute(state, decisions, possession);

        // Direction (1, 0), speed 300
        expect(newState.ball.velocity).toEqual({ x: 300, y: 0 });
    });


    // ------------------------------------------------------------
    // 7 — ORİJİNAL STATE MUTATE EDİLMEZ
    // ------------------------------------------------------------

    it('orijinal state mutate edilmemeli', () => {

        const executor = createExecutor();

        const players = [
            createPlayer({ id: 7, x: 100, y: 100 }),
            createPlayer({ id: 10, x: 400, y: 100 })
        ];

        const ball = createBall({ ownerId: 7 });
        const state = createState({ players, ball });

        const possession = createPossessionSnapshot({ ownerId: 7 });
        const decisions = [createPassDecision({ playerId: 7, receiverId: 10 })];

        const originalBall = { ...state.ball };

        executor.execute(state, decisions, possession);

        expect(state.ball.ownerId).toBe(originalBall.ownerId);
        expect(state.ball.velocity).toEqual(originalBall.velocity);
    });


    // ------------------------------------------------------------
    // 8 — PASS OLMAYAN DECISION → STATE DEĞİŞMEZ
    // ------------------------------------------------------------

    it('PASS olmayan decision state\'i değiştirmemeli', () => {

        const executor = createExecutor();

        const players = [
            createPlayer({ id: 7, x: 100, y: 100 })
        ];

        const ball = createBall({ ownerId: 7 });
        const state = createState({ players, ball });

        const possession = createPossessionSnapshot({ ownerId: 7 });
        const decisions = [createMoveDecision({ playerId: 7 })];

        const newState = executor.execute(state, decisions, possession);

        expect(newState).toBe(state);
    });


    // ------------------------------------------------------------
    // 9 — receiverId YOKSA HATA
    // ------------------------------------------------------------

    it('receiverId yoksa hata fırlatmalı', () => {

        const executor = createExecutor();

        const players = [
            createPlayer({ id: 7, x: 100, y: 100 }),
            createPlayer({ id: 10, x: 400, y: 100 })
        ];

        const ball = createBall({ ownerId: 7 });
        const state = createState({ players, ball });

        const possession = createPossessionSnapshot({ ownerId: 7 });

        const decisions = [{
            playerId: 7,
            action: 'PASS',
            duty: 'HOLD_POSITION',
            behavior: 'SUPPORT',
            target: { x: 0, y: 0 }
            // receiverId YOK
        }];

        expect(() => {
            executor.execute(state, decisions, possession);
        }).toThrow(Error);
    });


    // ------------------------------------------------------------
    // 10 — TOP SAHİBİ OLMAYAN OYUNCUNUN PASS'İ UYGULANMAZ
    // ------------------------------------------------------------

    it('top sahibi olmayan oyuncunun PASS\'i uygulanmamalı', () => {

        const executor = createExecutor();

        const players = [
            createPlayer({ id: 7, x: 100, y: 100 }),
            createPlayer({ id: 10, x: 400, y: 100 })
        ];

        const ball = createBall({ ownerId: 7 });
        const state = createState({ players, ball });

        // Snapshot'ta top sahibi 99 (başka oyuncu)
        const possession = createPossessionSnapshot({ ownerId: 99 });

        const decisions = [createPassDecision({ playerId: 7, receiverId: 10 })];

        const newState = executor.execute(state, decisions, possession);

        expect(newState).toBe(state);
    });


    // ------------------------------------------------------------
    // 11 — PASS DECISION YOKSA STATE AYNEN DÖNER
    // ------------------------------------------------------------

    it('PASS decision yoksa state aynen dönmeli', () => {

        const executor = createExecutor();

        const players = [
            createPlayer({ id: 7, x: 100, y: 100 })
        ];

        const ball = createBall({ ownerId: 7 });
        const state = createState({ players, ball });

        const possession = createPossessionSnapshot({ ownerId: 7 });

        const newState = executor.execute(state, [], possession);

        expect(newState).toBe(state);
    });


    // ------------------------------------------------------------
    // 12 — DETERMİNİSTİK
    // ------------------------------------------------------------

    it('aynı input deterministik sonuç üretmeli', () => {

        const executor = createExecutor();

        const players = [
            createPlayer({ id: 7, x: 100, y: 100 }),
            createPlayer({ id: 10, x: 400, y: 100 })
        ];

        const ball = createBall({ ownerId: 7 });
        const state = createState({ players, ball });

        const possession = createPossessionSnapshot({ ownerId: 7 });
        const decisions = [createPassDecision({ playerId: 7, receiverId: 10 })];

        const resultA = executor.execute(state, decisions, possession);
        const resultB = executor.execute(state, decisions, possession);

        expect(resultA.ball.ownerId).toBe(resultB.ball.ownerId);
        expect(resultA.ball.velocity).toEqual(resultB.ball.velocity);
    });

});