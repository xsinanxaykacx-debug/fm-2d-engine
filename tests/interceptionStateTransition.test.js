// tests/interceptionStateTransition.test.js

import { describe, expect, test } from 'vitest';
import { InterceptionStateTransition } from '../src/engine/InterceptionStateTransition.js';

describe('V3.7 — Interception State Transition', () => {
    const transition = new InterceptionStateTransition();

    // Standardized mock Ball entity class mimicking real domain Ball entity
    class MockBall {
        constructor(data = {}) {
            this.ownerId = data.ownerId ?? null;
            this.position = Object.freeze(data.position ? { ...data.position } : { x: 100, y: 100 });
            this.velocity = Object.freeze(data.velocity ? { ...data.velocity } : { x: 200, y: 0 });
            Object.freeze(this);
        }

        cloneWith(changes) {
            return new MockBall({
                ownerId: changes.ownerId !== undefined ? changes.ownerId : this.ownerId,
                position: changes.position ? { ...changes.position } : { ...this.position },
                velocity: changes.velocity ? { ...changes.velocity } : { ...this.velocity }
            });
        }
    }

    const createMockBall = (data = {}) => new MockBall(data);

    test('1. Successful interception transfers ownerId, zeroes velocity, and sets position', () => {
        const ball = createMockBall();
        const snapshot = Object.freeze({
            hasCandidate: true,
            interceptorId: 88,
            distanceToTrajectory: 5,
            interceptionPoint: Object.freeze({ x: 250, y: 100 }),
            timeToPoint: 0.75
        });

        const nextBall = transition.apply(ball, snapshot);

        expect(nextBall).not.toBe(ball); // New object reference
        expect(nextBall.ownerId).toBe(88);
        expect(nextBall.velocity).toEqual({ x: 0, y: 0 });
        expect(nextBall.position).toEqual({ x: 250, y: 100 });
    });

    test('2. No candidate (hasCandidate = false) returns exact same ball reference', () => {
        const ball = createMockBall();
        const snapshot = Object.freeze({
            hasCandidate: false,
            interceptorId: null,
            distanceToTrajectory: null,
            interceptionPoint: null,
            timeToPoint: null
        });

        const nextBall = transition.apply(ball, snapshot);

        expect(nextBall).toBe(ball); // Identical reference
    });

    test('3. Original ball entity immutability is preserved', () => {
        const ball = createMockBall();
        const originalOwner = ball.ownerId;
        const originalVel = { ...ball.velocity };

        const snapshot = Object.freeze({
            hasCandidate: true,
            interceptorId: 10,
            interceptionPoint: Object.freeze({ x: 150, y: 100 })
        });

        transition.apply(ball, snapshot);

        expect(ball.ownerId).toBe(originalOwner);
        expect(ball.velocity).toEqual(originalVel);
    });

    test('4. Missing interceptorId when hasCandidate is true throws Error', () => {
        const ball = createMockBall();
        const snapshot = Object.freeze({
            hasCandidate: true,
            interceptorId: null,
            interceptionPoint: Object.freeze({ x: 150, y: 100 })
        });

        expect(() => transition.apply(ball, snapshot)).toThrow(Error);
    });

    test('5. Fail fast on missing mandatory inputs (TypeError)', () => {
        const validSnapshot = { hasCandidate: false };

        expect(() => transition.apply(null, validSnapshot)).toThrow(TypeError);
        expect(() => transition.apply(undefined, validSnapshot)).toThrow(TypeError);
        expect(() => transition.apply(createMockBall(), null)).toThrow(TypeError);
        expect(() => transition.apply(createMockBall(), undefined)).toThrow(TypeError);
    });

    test('6. Transition engine instance is immutable', () => {
        expect(Object.isFrozen(transition)).toBe(true);
    });

    test('7. Bit-exact value determinism across executions', () => {
        const ball = createMockBall();
        const snapshot = Object.freeze({
            hasCandidate: true,
            interceptorId: 5,
            interceptionPoint: Object.freeze({ x: 300, y: 120 })
        });

        const res1 = transition.apply(ball, snapshot);
        const res2 = transition.apply(ball, snapshot);

        expect(res1).not.toBe(res2); // Distinct new references
        expect(res1).toEqual(res2);  // Bit-exact value equality
    });

    test('8. Invalid or NaN interceptionPoint (x or y) throws Error', () => {
        const ball = createMockBall();

        const invalidX = Object.freeze({
            hasCandidate: true,
            interceptorId: 7,
            interceptionPoint: Object.freeze({ x: NaN, y: 100 })
        });

        const invalidY = Object.freeze({
            hasCandidate: true,
            interceptorId: 7,
            interceptionPoint: Object.freeze({ x: 100, y: undefined })
        });

        expect(() => transition.apply(ball, invalidX)).toThrow(Error);
        expect(() => transition.apply(ball, invalidY)).toThrow(Error);
    });

    test('9. Verifies transition strictly calls cloneWith on the Ball entity', () => {
        let cloneCalled = false;
        const customBall = {
            ownerId: null,
            position: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            cloneWith(changes) {
                cloneCalled = true;
                return { ...this, ...changes };
            }
        };

        const snapshot = Object.freeze({
            hasCandidate: true,
            interceptorId: 99,
            interceptionPoint: Object.freeze({ x: 50, y: 50 })
        });

        transition.apply(customBall, snapshot);

        expect(cloneCalled).toBe(true);
    });
});