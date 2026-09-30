// tests/possessionStateTransition.test.js

import { describe, expect, test } from 'vitest';
import { PossessionStateTransition } from '../src/engine/PossessionStateTransition.js';

// Immutable Test Dummy Ball
class Ball {
    constructor({ position = { x: 0, y: 0 }, velocity = { x: 0, y: 0 }, ownerId = null } = {}) {
        this.position = Object.freeze({ ...position });
        this.velocity = Object.freeze({ ...velocity });
        this.ownerId = ownerId;
        Object.freeze(this);
    }

    cloneWith(changes = {}) {
        return new Ball({
            position: changes.position ?? this.position,
            velocity: changes.velocity ?? this.velocity,
            ownerId: changes.ownerId !== undefined ? changes.ownerId : this.ownerId
        });
    }
}

describe('V3.4 — Possession State Transition', () => {
    const transition = new PossessionStateTransition();

    test('1. FREE -> CONTROLLED sets ownerId and zeroes velocity', () => {
        const ball = new Ball({
            position: { x: 500, y: 300 },
            velocity: { x: 10, y: -5 },
            ownerId: null
        });

        const snapshot = Object.freeze({
            state: 'CONTROLLED',
            ownerId: 7,
            nearestPlayerId: 7,
            distance: 2.0
        });

        const nextBall = transition.apply(ball, snapshot);

        expect(nextBall.ownerId).toBe(7);
        expect(nextBall.velocity).toEqual({ x: 0, y: 0 });
        expect(ball.ownerId).toBeNull(); // Immutable original ball
    });

    test('2. FREE -> FREE preserves null ownerId and existing velocity', () => {
        const ball = new Ball({
            position: { x: 500, y: 300 },
            velocity: { x: 12, y: 4 },
            ownerId: null
        });

        const snapshot = Object.freeze({
            state: 'FREE',
            ownerId: null,
            nearestPlayerId: 1,
            distance: 30.0
        });

        const nextBall = transition.apply(ball, snapshot);

        expect(nextBall.ownerId).toBeNull();
        expect(nextBall.velocity).toEqual({ x: 12, y: 4 });
    });

    test('3. CONTROLLED(A) remains CONTROLLED(A) when snapshot is A', () => {
        const ball = new Ball({
            position: { x: 500, y: 300 },
            velocity: { x: 0, y: 0 },
            ownerId: 7
        });

        const snapshot = Object.freeze({
            state: 'CONTROLLED',
            ownerId: 7,
            nearestPlayerId: 7,
            distance: 1.0
        });

        const nextBall = transition.apply(ball, snapshot);

        expect(nextBall.ownerId).toBe(7);
    });

    test('4. CONTROLLED(A) -> FREE clears ownerId upon control loss', () => {
        const ball = new Ball({
            position: { x: 500, y: 300 },
            velocity: { x: 0, y: 0 },
            ownerId: 7
        });

        const snapshot = Object.freeze({
            state: 'FREE',
            ownerId: null,
            nearestPlayerId: 12,
            distance: 25.0
        });

        const nextBall = transition.apply(ball, snapshot);

        expect(nextBall.ownerId).toBeNull();
    });

    test('5. CONTROLLED(A) + CONTROLLED(B) PRESERVES Player A ownership (No Rival Transfer)', () => {
        const ball = new Ball({
            position: { x: 500, y: 300 },
            velocity: { x: 0, y: 0 },
            ownerId: 7 // Player A
        });

        // Opponent B is now closer according to snapshot evaluation
        const snapshot = Object.freeze({
            state: 'CONTROLLED',
            ownerId: 12, // Player B
            nearestPlayerId: 12,
            distance: 3.0
        });

        const nextBall = transition.apply(ball, snapshot);

        // Must strictly remain Player A in V3.4
        expect(nextBall.ownerId).toBe(7);
    });

    test('6. Explicit release clears ownerId regardless of snapshot', () => {
        const ball = new Ball({
            position: { x: 500, y: 300 },
            velocity: { x: 0, y: 0 },
            ownerId: 7
        });

        const snapshot = Object.freeze({
            state: 'CONTROLLED',
            ownerId: 7,
            nearestPlayerId: 7,
            distance: 0.0
        });

        const nextBall = transition.apply(ball, snapshot, { release: true });

        expect(nextBall.ownerId).toBeNull();
    });

    test('7. Explicit release applies custom releaseVelocity when provided', () => {
        const ball = new Ball({
            position: { x: 500, y: 300 },
            velocity: { x: 0, y: 0 },
            ownerId: 7
        });

        const snapshot = Object.freeze({
            state: 'CONTROLLED',
            ownerId: 7
        });

        const passVelocity = { x: 25.0, y: -10.0 };

        const nextBall = transition.apply(ball, snapshot, {
            release: true,
            releaseVelocity: passVelocity
        });

        expect(nextBall.ownerId).toBeNull();
        expect(nextBall.velocity).toEqual({ x: 25.0, y: -10.0 });
    });

    test('8. Ball object immutability is preserved', () => {
        const ball = new Ball({
            position: { x: 100, y: 100 },
            ownerId: null
        });

        const snapshot = Object.freeze({
            state: 'CONTROLLED',
            ownerId: 9
        });

        const nextBall = transition.apply(ball, snapshot);

        expect(nextBall).not.toBe(ball);
        expect(Object.isFrozen(ball)).toBe(true);
        expect(Object.isFrozen(nextBall)).toBe(true);
    });

    test('9. Invalid mandatory inputs throw TypeError (Fail Fast)', () => {
        const validBall = new Ball();
        const validSnapshot = { state: 'FREE', ownerId: null };

        expect(() => transition.apply(null, validSnapshot)).toThrow(TypeError);
        expect(() => transition.apply(undefined, validSnapshot)).toThrow(TypeError);
        expect(() => transition.apply(validBall, null)).toThrow(TypeError);
        expect(() => transition.apply(validBall, undefined)).toThrow(TypeError);
    });

    test('10. Bit-exact value determinism across executions (Value equality, not identity)', () => {
        const ball = new Ball({
            position: { x: 250, y: 150 },
            velocity: { x: 5, y: 5 },
            ownerId: null
        });

        const snapshot = Object.freeze({
            state: 'CONTROLLED',
            ownerId: 10
        });

        const resultA = transition.apply(ball, snapshot);
        const resultB = transition.apply(ball, snapshot);

        // Object reference identity MUST NOT be equal (Immutable instance per transition)
        expect(resultA).not.toBe(resultB);

        // Values MUST be bit-exact identical
        expect(resultA.ownerId).toBe(resultB.ownerId);
        expect(resultA.position).toEqual(resultB.position);
        expect(resultA.velocity).toEqual(resultB.velocity);
    });

    test('11. Transition engine instance is immutable', () => {
        expect(Object.isFrozen(transition)).toBe(true);
    });
});