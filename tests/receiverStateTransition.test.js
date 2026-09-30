// tests/receiverStateTransition.test.js

import { describe, expect, test, vi } from 'vitest';
import { ReceiverStateTransition } from '../src/engine/ReceiverStateTransition.js';

describe('V3.9 — Receiver State Transition', () => {
    const transition = new ReceiverStateTransition();

    // Helper mock factory for Ball
    const createMockBall = (ownerId = null, velocity = { x: 10, y: 0 }, position = { x: 100, y: 100 }) => {
        const ball = {
            ownerId,
            position: { ...position },
            velocity: { ...velocity },
            cloneWith: vi.fn((overrides) => createMockBall(
                overrides.ownerId !== undefined ? overrides.ownerId : ball.ownerId,
                overrides.velocity !== undefined ? overrides.velocity : ball.velocity,
                overrides.position !== undefined ? overrides.position : ball.position
            ))
        };
        return ball;
    };

    // Helper mock factory for MatchState
    const createMockState = (ball, players) => {
        return {
            ball,
            players,
            nextState: vi.fn((nextPlayers, nextBall) => createMockState(nextBall, nextPlayers))
        };
    };

    test('1. Successful Control: assigns ownerId, zeros velocity, and syncs ball position to receiver', () => {
        const initialBall = createMockBall(null, { x: 50, y: 20 }, { x: 100, y: 100 });
        const players = [
            { id: 10, teamId: 'HOME', position: { x: 108, y: 100 } }
        ];
        const state = createMockState(initialBall, players);

        const snapshot = Object.freeze({
            hasReceiver: true,
            receiverId: 10,
            distanceToBall: 8
        });

        const newState = transition.apply(state, snapshot);

        expect(newState).not.toBe(state);
        expect(newState.ball.ownerId).toBe(10);
        expect(newState.ball.velocity).toEqual({ x: 0, y: 0 });
        expect(newState.ball.position).toEqual({ x: 108, y: 100 });
        expect(initialBall.cloneWith).toHaveBeenCalledOnce();
    });

    test('2. No Receiver: returns exact same state and ball reference untouched', () => {
        const ball = createMockBall();
        const state = createMockState(ball, []);
        const snapshot = Object.freeze({
            hasReceiver: false,
            receiverId: null,
            distanceToBall: null
        });

        const newState = transition.apply(state, snapshot);

        expect(newState).toBe(state);
        expect(newState.ball).toBe(ball);
        expect(ball.cloneWith).not.toHaveBeenCalled();
    });

    test('3. Ball Immutability: original ball and state remain unchanged', () => {
        const ball = createMockBall(null, { x: 10, y: 0 }, { x: 50, y: 50 });
        const players = [{ id: 7, teamId: 'HOME', position: { x: 55, y: 50 } }];
        const state = createMockState(ball, players);

        const snapshot = Object.freeze({ hasReceiver: true, receiverId: 7, distanceToBall: 5 });

        Object.freeze(ball);
        Object.freeze(state);

        expect(() => transition.apply(state, snapshot)).not.toThrow();
        expect(ball.ownerId).toBeNull();
        expect(ball.velocity).toEqual({ x: 10, y: 0 });
    });

    test('4. Missing or Unmatched receiverId throws Error', () => {
        const ball = createMockBall();
        const state = createMockState(ball, [{ id: 1, position: { x: 0, y: 0 } }]);

        const nullSnapshot = { hasReceiver: true, receiverId: null, distanceToBall: 0 };
        expect(() => transition.apply(state, nullSnapshot)).toThrow(Error);

        const missingSnapshot = { hasReceiver: true, receiverId: 999, distanceToBall: 0 };
        expect(() => transition.apply(state, missingSnapshot)).toThrow(Error);
    });

    test('5. Fail Fast on invalid inputs (TypeError)', () => {
        const validBall = createMockBall();
        const validState = createMockState(validBall, []);
        const validSnapshot = { hasReceiver: false };

        expect(() => transition.apply(null, validSnapshot)).toThrow(TypeError);
        expect(() => transition.apply(validState, null)).toThrow(TypeError);

        // Eksik ball
        const stateWithoutBall = { players: [], nextState: vi.fn() };
        expect(() => transition.apply(stateWithoutBall, validSnapshot)).toThrow(TypeError);

        // Eksik players
        const stateWithoutPlayers = { ball: {}, nextState: vi.fn() };
        expect(() => transition.apply(stateWithoutPlayers, validSnapshot)).toThrow(TypeError);

        // Eksik nextState
        const stateWithoutNextState = { ball: {}, players: [] };
        expect(() => transition.apply(stateWithoutNextState, validSnapshot)).toThrow(TypeError);
    });

    test('6. Transition engine instance is immutable', () => {
        expect(Object.isFrozen(transition)).toBe(true);
    });

    test('7. Determinism: produce identical next state for identical inputs', () => {
        const ball1 = createMockBall(null, { x: 15, y: 0 }, { x: 10, y: 10 });
        const players1 = [{ id: 4, teamId: 'HOME', position: { x: 12, y: 10 } }];
        const state1 = createMockState(ball1, players1);

        const ball2 = createMockBall(null, { x: 15, y: 0 }, { x: 10, y: 10 });
        const players2 = [{ id: 4, teamId: 'HOME', position: { x: 12, y: 10 } }];
        const state2 = createMockState(ball2, players2);

        const snapshot = Object.freeze({ hasReceiver: true, receiverId: 4, distanceToBall: 2 });

        const res1 = transition.apply(state1, snapshot);
        const res2 = transition.apply(state2, snapshot);

        expect(res1.ball.ownerId).toEqual(res2.ball.ownerId);
        expect(res1.ball.velocity).toEqual(res2.ball.velocity);
        expect(res1.ball.position).toEqual(res2.ball.position);
    });

    test('8. Strictly updates via Ball.cloneWith', () => {
        const ball = createMockBall();
        const players = [{ id: 10, teamId: 'HOME', position: { x: 10, y: 10 } }];
        const state = createMockState(ball, players);
        const snapshot = { hasReceiver: true, receiverId: 10, distanceToBall: 0 };

        transition.apply(state, snapshot);

        expect(ball.cloneWith).toHaveBeenCalledWith({
            ownerId: 10,
            velocity: { x: 0, y: 0 },
            position: { x: 10, y: 10 }
        });
    });

    test('9. Position Sync: ball position exactly equals receiver position after transition', () => {
        const ball = createMockBall(null, { x: 20, y: 0 }, { x: 100, y: 200 });
        const players = [{ id: 8, teamId: 'HOME', position: { x: 105, y: 198 } }];
        const state = createMockState(ball, players);

        const snapshot = { hasReceiver: true, receiverId: 8, distanceToBall: 5.38 };

        const newState = transition.apply(state, snapshot);

        expect(newState.ball.position).toEqual({ x: 105, y: 198 });
    });
});