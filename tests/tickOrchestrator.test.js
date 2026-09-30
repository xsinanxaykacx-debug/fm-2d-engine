// tests/tickOrchestrator.test.js

import { describe, expect, test, vi } from 'vitest';
import { TickOrchestrator } from '../src/engine/TickOrchestrator.js';

describe('V4.0 — Tick Orchestrator / Pipeline Engine', () => {

    // Standardized mock class for Ball
    class MockBall {
        constructor(ownerId = null, velocity = { x: 100, y: 0 }, position = { x: 100, y: 100 }) {
            this.ownerId = ownerId;
            this.position = { ...position };
            this.velocity = { ...velocity };
        }

        cloneWith(changes = {}) {
            return new MockBall(
                changes.ownerId !== undefined ? changes.ownerId : this.ownerId,
                changes.velocity !== undefined ? changes.velocity : this.velocity,
                changes.position !== undefined ? changes.position : this.position
            );
        }
    }

    const createMockBall = (ownerId = null, velocity = { x: 100, y: 0 }, position = { x: 100, y: 100 }) =>
        new MockBall(ownerId, velocity, position);

    const createMockState = (ball, players = []) => ({
        ball,
        players,
        nextState: vi.fn((nextPlayers, nextBall) => createMockState(nextBall, nextPlayers))
    });

    const createMocks = () => ({
        interceptionDetector: { evaluate: vi.fn() },
        interceptionStateTransition: { apply: vi.fn() },
        receiverDetector: { evaluate: vi.fn() },
        receiverStateTransition: { apply: vi.fn() }
    });

    test('1. Interception Priority: Interception cancels Receiver Evaluation', () => {
        const mocks = createMocks();
        const orchestrator = new TickOrchestrator(mocks);

        const ball = createMockBall(null, { x: 50, y: 0 }, { x: 100, y: 100 });
        const state = createMockState(ball, []);

        const interceptSnap = { hasCandidate: true, interceptorId: 99, interceptionPoint: { x: 110, y: 100 } };
        const interceptedBall = createMockBall(99, { x: 0, y: 0 }, { x: 110, y: 100 });

        mocks.interceptionDetector.evaluate.mockReturnValue(interceptSnap);
        mocks.interceptionStateTransition.apply.mockReturnValue(interceptedBall);

        const nextState = orchestrator.tick(state, { receivingTeamId: 'HOME' });

        expect(mocks.interceptionDetector.evaluate).toHaveBeenCalledOnce();
        expect(mocks.interceptionStateTransition.apply).toHaveBeenCalledWith(ball, interceptSnap);

        // CRITICAL: ReceiverDetector MUST NOT BE CALLED
        expect(mocks.receiverDetector.evaluate).not.toHaveBeenCalled();
        expect(mocks.receiverStateTransition.apply).not.toHaveBeenCalled();

        expect(nextState.ball.ownerId).toBe(99);
    });

    test('2. Receiver Control: Executes when no interception occurs', () => {
        const mocks = createMocks();
        const orchestrator = new TickOrchestrator(mocks);

        const ball = createMockBall(null, { x: 50, y: 0 }, { x: 100, y: 100 });
        const state = createMockState(ball, [{ id: 7, teamId: 'HOME', position: { x: 105, y: 100 } }]);

        mocks.interceptionDetector.evaluate.mockReturnValue({ hasCandidate: false });

        const receiverSnap = { hasReceiver: true, receiverId: 7, distanceToBall: 5 };
        mocks.receiverDetector.evaluate.mockReturnValue(receiverSnap);

        const controlledState = createMockState(createMockBall(7, { x: 0, y: 0 }, { x: 105, y: 100 }), state.players);
        mocks.receiverStateTransition.apply.mockReturnValue(controlledState);

        const nextState = orchestrator.tick(state, { receivingTeamId: 'HOME', targetReceiverId: 7 });

        expect(mocks.interceptionDetector.evaluate).toHaveBeenCalledOnce();
        expect(mocks.receiverDetector.evaluate).toHaveBeenCalledWith(state, 'HOME', 7);
        expect(mocks.receiverStateTransition.apply).toHaveBeenCalledWith(state, receiverSnap);

        expect(nextState.ball.ownerId).toBe(7);
    });

    test('3. No Event: Returns state unchanged when neither interception nor receiver triggers', () => {
        const mocks = createMocks();
        const orchestrator = new TickOrchestrator(mocks);

        const ball = createMockBall(null, { x: 100, y: 0 }, { x: 50, y: 50 });
        const state = createMockState(ball, []);

        mocks.interceptionDetector.evaluate.mockReturnValue({ hasCandidate: false });
        mocks.receiverDetector.evaluate.mockReturnValue({ hasReceiver: false });

        const nextState = orchestrator.tick(state, { receivingTeamId: 'HOME' });

        expect(mocks.interceptionDetector.evaluate).toHaveBeenCalledOnce();
        expect(mocks.receiverDetector.evaluate).toHaveBeenCalledOnce();

        // CRITICAL: State aynen dönmeli (aynı referans)
        expect(nextState).toBe(state);
    });

    test('4. Owned Ball Guard: Skips Interception and Receiver evaluation entirely if ball is already owned', () => {
        const mocks = createMocks();
        const orchestrator = new TickOrchestrator(mocks);

        const ownedBall = createMockBall(10, { x: 0, y: 0 }, { x: 200, y: 200 });
        const state = createMockState(ownedBall, []);

        const nextState = orchestrator.tick(state, { receivingTeamId: 'HOME' });

        expect(mocks.interceptionDetector.evaluate).not.toHaveBeenCalled();
        expect(mocks.receiverDetector.evaluate).not.toHaveBeenCalled();

        // Owned ball ise state aynen döner
        expect(nextState).toBe(state);
    });

    test('5. Simultaneous Interception + Receiver Candidate: Interception STRICTLY wins', () => {
        const mocks = createMocks();
        const orchestrator = new TickOrchestrator(mocks);

        const ball = createMockBall(null, { x: 10, y: 0 }, { x: 100, y: 100 });
        const state = createMockState(ball, []);

        mocks.interceptionDetector.evaluate.mockReturnValue({ hasCandidate: true, interceptorId: 99, interceptionPoint: { x: 100, y: 100 } });
        mocks.interceptionStateTransition.apply.mockReturnValue(createMockBall(99, { x: 0, y: 0 }));

        orchestrator.tick(state, { receivingTeamId: 'HOME' });

        expect(mocks.interceptionDetector.evaluate).toHaveBeenCalled();
        expect(mocks.receiverDetector.evaluate).not.toHaveBeenCalled();
        expect(mocks.receiverStateTransition.apply).not.toHaveBeenCalled();
    });

    test('6. Fail fast on missing dependencies or invalid state (TypeError)', () => {
        expect(() => new TickOrchestrator({})).toThrow(TypeError);

        const mocks = createMocks();
        const orchestrator = new TickOrchestrator(mocks);

        expect(() => orchestrator.tick(null)).toThrow(TypeError);
        expect(() => orchestrator.tick({})).toThrow(TypeError);
    });

    test('7. Input State Immutability: original State[t] is never mutated', () => {
        const mocks = createMocks();
        const orchestrator = new TickOrchestrator(mocks);

        const ball = createMockBall(null, { x: 10, y: 0 }, { x: 0, y: 0 });
        const state = createMockState(ball, []);

        Object.freeze(ball);
        Object.freeze(state);

        mocks.interceptionDetector.evaluate.mockReturnValue({ hasCandidate: false });
        mocks.receiverDetector.evaluate.mockReturnValue({ hasReceiver: false });

        expect(() => orchestrator.tick(state, { receivingTeamId: 'HOME' })).not.toThrow();
    });

    test('8. Bit-exact determinism across executions', () => {
        const mocks = createMocks();
        const orchestrator = new TickOrchestrator(mocks);

        const ball = createMockBall(null, { x: 50, y: 0 }, { x: 0, y: 0 });
        const state1 = createMockState(ball, []);
        const state2 = createMockState(ball, []);

        mocks.interceptionDetector.evaluate.mockReturnValue({ hasCandidate: false });
        mocks.receiverDetector.evaluate.mockReturnValue({ hasReceiver: false });

        const res1 = orchestrator.tick(state1, { receivingTeamId: 'HOME' });
        const res2 = orchestrator.tick(state2, { receivingTeamId: 'HOME' });

        expect(res1.ball).toEqual(res2.ball);
        expect(res1.players).toEqual(res2.players);
    });

    test('9. Orchestrator instance is immutable', () => {
        const mocks = createMocks();
        const orchestrator = new TickOrchestrator(mocks);
        expect(Object.isFrozen(orchestrator)).toBe(true);
    });

    test('10. Sequence Verification: strictly calls Interception -> Receiver in exact order', () => {
        const mocks = createMocks();
        const orchestrator = new TickOrchestrator(mocks);

        const callOrder = [];

        mocks.interceptionDetector.evaluate.mockImplementation(() => {
            callOrder.push('interceptionDetector');
            return { hasCandidate: false };
        });

        mocks.receiverDetector.evaluate.mockImplementation(() => {
            callOrder.push('receiverDetector');
            return { hasReceiver: false };
        });

        const ball = createMockBall(null, { x: 10, y: 0 }, { x: 0, y: 0 });
        const state = createMockState(ball, []);

        orchestrator.tick(state, { receivingTeamId: 'HOME' });

        expect(callOrder).toEqual(['interceptionDetector', 'receiverDetector']);
    });

    test('11. TickOrchestrator has NO physics dependency (ballPhysics, playerPhysics)', () => {
        const mocks = createMocks();
        const orchestrator = new TickOrchestrator(mocks);

        // Fizik bağımlılıkları KESİNLİKLE olmamalı
        expect(orchestrator.ballPhysics).toBeUndefined();
        expect(orchestrator.playerPhysics).toBeUndefined();

        // Constructor'da fazladan fizik verilse bile yok sayılmalı
        const orchestratorWithExtras = new TickOrchestrator({
            ...mocks,
            ballPhysics: { update: vi.fn() },
            playerPhysics: { update: vi.fn() }
        });

        expect(orchestratorWithExtras.ballPhysics).toBeUndefined();
        expect(orchestratorWithExtras.playerPhysics).toBeUndefined();
    });

    test('12. TickOrchestrator does not advance time (no dt parameter)', () => {
        const mocks = createMocks();
        const orchestrator = new TickOrchestrator(mocks);

        const ball = createMockBall(null, { x: 50, y: 0 }, { x: 0, y: 0 });
        const state = createMockState(ball, []);

        mocks.interceptionDetector.evaluate.mockReturnValue({ hasCandidate: false });
        mocks.receiverDetector.evaluate.mockReturnValue({ hasReceiver: false });

        // tick() sadece 2 parametre almalı: state, options
        // dt parametresi YOK
        const nextState = orchestrator.tick(state, { receivingTeamId: 'HOME' });

        expect(nextState).toBe(state);
    });


    // ============================================================
    // 13 — passerTeamId === undefined → receivingTeamId fallback
    // ============================================================

    test('13. passerTeamId undefined ise receivingTeamId fallback olarak kullanılmalı', () => {

        const mocks = createMocks();
        const orchestrator = new TickOrchestrator(mocks);

        const ball = createMockBall(null, { x: 50, y: 0 }, { x: 100, y: 100 });
        const state = createMockState(ball, []);

        mocks.interceptionDetector.evaluate.mockReturnValue({ hasCandidate: false });
        mocks.receiverDetector.evaluate.mockReturnValue({ hasReceiver: false });

        /*
         * passerTeamId YOK (undefined)
         * receivingTeamId = 'HOME'
         *
         * Beklenen: InterceptionDetector 'HOME' ile çağrılmalı
         * (undefined ile DEĞİL).
         */
        orchestrator.tick(state, {
            receivingTeamId: 'HOME'
        });

        expect(mocks.interceptionDetector.evaluate).toHaveBeenCalledWith(
            state,
            'HOME'
        );
    });


    // ============================================================
    // 14 — Her iki team ID de yoksa interception ATLANMALI
    // ============================================================

    test('14. passerTeamId ve receivingTeamId yoksa interception atlanmalı', () => {

        const mocks = createMocks();
        const orchestrator = new TickOrchestrator(mocks);

        const ball = createMockBall(null, { x: 50, y: 0 }, { x: 100, y: 100 });
        const state = createMockState(ball, []);

        mocks.interceptionDetector.evaluate.mockReturnValue({ hasCandidate: false });
        mocks.receiverDetector.evaluate.mockReturnValue({ hasReceiver: false });

        /*
         * Her iki team ID de null.
         *
         * Beklenen: InterceptionDetector HİÇ çağrılmamalı
         * (çünkü resolvedPasserTeamId null).
         */
        orchestrator.tick(state, {
            passerTeamId: null,
            receivingTeamId: null
        });

        expect(mocks.interceptionDetector.evaluate).not.toHaveBeenCalled();
    });

});