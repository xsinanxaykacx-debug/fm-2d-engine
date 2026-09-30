// tests/boundaryStateTransition.test.js

import { describe, expect, test, vi } from 'vitest';
import { BoundaryStateTransition } from '../src/engine/BoundaryStateTransition.js';
import { BOUNDARY_EDGES } from '../src/engine/BoundaryDetector.js';

describe('V4.2 — Boundary State Transition Engine', () => {
    const transitionEngine = new BoundaryStateTransition();

    class MockBall {
        constructor(ownerId = null, velocity = { x: 5, y: 10 }, position = { x: -1, y: 34 }, isOutOfBounds = false) {
            this.ownerId = ownerId;
            this.velocity = { ...velocity };
            this.position = { ...position };
            this.isOutOfBounds = isOutOfBounds;
        }

        cloneWith(changes = {}) {
            const nextBall = new MockBall(
                changes.ownerId !== undefined ? changes.ownerId : this.ownerId,
                changes.velocity !== undefined ? changes.velocity : this.velocity,
                changes.position !== undefined ? changes.position : this.position,
                changes.isOutOfBounds !== undefined ? changes.isOutOfBounds : this.isOutOfBounds
            );
            nextBall.lastBoundaryEdge = changes.lastBoundaryEdge || this.lastBoundaryEdge || null;
            nextBall.exitPosition = changes.exitPosition || this.exitPosition || null;
            return Object.freeze(nextBall);
        }
    }

    const createMockState = (ball, players = []) => Object.freeze({
        ball: Object.freeze(ball),
        players: Object.freeze(players),
        nextState: vi.fn((nextPlayers, nextBall) => createMockState(nextBall, nextPlayers))
    });

    test('1. Out of Bounds Transition: Zeroes velocity, clears owner, sets boundary flags', () => {
        const ball = new MockBall(10, { x: 15, y: -5 }, { x: -0.5, y: 30 });
        const state = createMockState(ball);

        const snapshot = {
            isOutOfBounds: true,
            edge: BOUNDARY_EDGES.OUT_LEFT,
            exitPosition: { x: -0.5, y: 30 }
        };

        const nextState = transitionEngine.apply(state, snapshot);

        expect(nextState.ball.ownerId).toBeNull();
        expect(nextState.ball.velocity).toEqual({ x: 0, y: 0 });
        expect(nextState.ball.isOutOfBounds).toBe(true);
        expect(nextState.ball.lastBoundaryEdge).toBe(BOUNDARY_EDGES.OUT_LEFT);
        expect(nextState.ball.exitPosition).toEqual({ x: -0.5, y: 30 });
    });

    test('2. In-Bounds No-Op: Returns exact same state reference if isOutOfBounds is false', () => {
        const ball = new MockBall(7, { x: 2, y: 3 }, { x: 50, y: 30 });
        const state = createMockState(ball);

        const snapshot = { isOutOfBounds: false, edge: BOUNDARY_EDGES.NONE, exitPosition: null };

        const nextState = transitionEngine.apply(state, snapshot);

        expect(nextState).toBe(state);
        expect(state.nextState).not.toHaveBeenCalled();
    });

    test('3. Input Immutability: Original State and Ball remain strictly untouched', () => {
        const ball = new MockBall(5, { x: 10, y: 10 }, { x: 106, y: 30 });
        const state = createMockState(ball);

        Object.freeze(ball);
        Object.freeze(state);

        const snapshot = {
            isOutOfBounds: true,
            edge: BOUNDARY_EDGES.OUT_RIGHT,
            exitPosition: { x: 106, y: 30 }
        };

        expect(() => transitionEngine.apply(state, snapshot)).not.toThrow();
        expect(state.ball.ownerId).toBe(5);
        expect(state.ball.velocity).toEqual({ x: 10, y: 10 });
    });

    test('4. Correct Edge Assignment for OUT_TOP and OUT_BOTTOM', () => {
        const ballTop = new MockBall(null, { x: 0, y: -2 }, { x: 50, y: -0.2 });
        const stateTop = createMockState(ballTop);
        const nextStateTop = transitionEngine.apply(stateTop, {
            isOutOfBounds: true,
            edge: BOUNDARY_EDGES.OUT_TOP,
            exitPosition: { x: 50, y: -0.2 }
        });

        expect(nextStateTop.ball.lastBoundaryEdge).toBe(BOUNDARY_EDGES.OUT_TOP);

        const ballBottom = new MockBall(null, { x: 0, y: 2 }, { x: 50, y: 68.2 });
        const stateBottom = createMockState(ballBottom);
        const nextStateBottom = transitionEngine.apply(stateBottom, {
            isOutOfBounds: true,
            edge: BOUNDARY_EDGES.OUT_BOTTOM,
            exitPosition: { x: 50, y: 68.2 }
        });

        expect(nextStateBottom.ball.lastBoundaryEdge).toBe(BOUNDARY_EDGES.OUT_BOTTOM);
    });

    test('5. Fail Fast on invalid inputs (TypeError)', () => {
        expect(() => transitionEngine.apply(null, {})).toThrow(TypeError);
        expect(() => transitionEngine.apply({}, null)).toThrow(TypeError);
        expect(() => transitionEngine.apply({ ball: {} }, { isOutOfBounds: true })).toThrow(TypeError);
    });

    test('6. Strictly uses Ball.cloneWith for state generation', () => {
        const cloneWithSpy = vi.fn().mockReturnValue(new MockBall());
        const ball = { cloneWith: cloneWithSpy, position: { x: -1, y: 10 } };
        const state = createMockState(ball);

        transitionEngine.apply(state, { isOutOfBounds: true, edge: BOUNDARY_EDGES.OUT_LEFT });

        expect(cloneWithSpy).toHaveBeenCalledOnce();
    });

    test('7. Determinism: Identical state and snapshot produce bit-exact next state', () => {
        const ball = new MockBall(1, { x: 5, y: 5 }, { x: -1, y: 20 });
        const state1 = createMockState(ball);
        const state2 = createMockState(ball);

        const snapshot = { isOutOfBounds: true, edge: BOUNDARY_EDGES.OUT_LEFT, exitPosition: { x: -1, y: 20 } };

        const res1 = transitionEngine.apply(state1, snapshot);
        const res2 = transitionEngine.apply(state2, snapshot);

        expect(res1.ball).toEqual(res2.ball);
    });

    test('8. Transition Engine Instance is immutable', () => {
        expect(Object.isFrozen(transitionEngine)).toBe(true);
    });

    test('9. Players array is preserved intact in next state', () => {
        const players = [{ id: 1 }, { id: 2 }];
        const ball = new MockBall(null, { x: 1, y: 1 }, { x: 106, y: 20 });
        const state = createMockState(ball, players);

        const nextState = transitionEngine.apply(state, {
            isOutOfBounds: true,
            edge: BOUNDARY_EDGES.OUT_RIGHT,
            exitPosition: { x: 106, y: 20 }
        });

        expect(nextState.players).toEqual(players);
    });
});