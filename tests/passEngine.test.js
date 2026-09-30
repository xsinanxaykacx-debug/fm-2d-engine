// tests/passEngine.test.js

import { describe, expect, test } from 'vitest';
import { PassEngine, PASS_TYPES, PASS_SPEEDS } from '../src/engine/PassEngine.js';
import { PossessionStateTransition } from '../src/engine/PossessionStateTransition.js';

describe('V3.5 — Pass Engine', () => {
    const passEngine = new PassEngine();
    const transition = new PossessionStateTransition();

    const mockState = Object.freeze({
        ball: Object.freeze({ ownerId: 7, position: Object.freeze({ x: 100, y: 100 }) }),
        players: Object.freeze([
            Object.freeze({ id: 7, position: Object.freeze({ x: 100, y: 100 }) }),
            Object.freeze({ id: 10, position: Object.freeze({ x: 400, y: 100 }) })
        ])
    });

    const mockSnapshot = Object.freeze({
        state: 'CONTROLLED',
        ownerId: 7,
        nearestPlayerId: 7,
        distance: 0.0
    });

    test('1. Valid GROUND pass generates correct velocity and targetPosition', () => {
        const intent = passEngine.calculateIntent(mockState, mockSnapshot, 7, 10, PASS_TYPES.GROUND);

        expect(intent.passerId).toBe(7);
        expect(intent.receiverId).toBe(10);
        expect(intent.passType).toBe('GROUND');
        expect(intent.targetPosition).toEqual({ x: 400, y: 100 });
        // Direction is (1, 0), speed is 300
        expect(intent.velocity).toEqual({ x: 300, y: 0 });
    });

    test('2. Valid LOB pass generates 420 speed velocity', () => {
        const intent = passEngine.calculateIntent(mockState, mockSnapshot, 7, 10, PASS_TYPES.LOB);

        expect(intent.passType).toBe('LOB');
        expect(intent.velocity).toEqual({ x: 420, y: 0 });
    });

    test('3. Non-owner player cannot pass', () => {
        const snapshotNotOwner = Object.freeze({ ...mockSnapshot, ownerId: 99 });
        expect(() => passEngine.calculateIntent(mockState, snapshotNotOwner, 7, 10))
            .toThrow('Player 7 does not have possession');
    });

    test('4. Self-pass is forbidden', () => {
        expect(() => passEngine.calculateIntent(mockState, mockSnapshot, 7, 7))
            .toThrow('Self-pass is forbidden');
    });

    test('5. Invalid pass type throws Error', () => {
        expect(() => passEngine.calculateIntent(mockState, mockSnapshot, 7, 10, 'CROSS'))
            .toThrow('Invalid passType "CROSS"');
    });

    test('6. Fail fast on missing mandatory inputs (TypeError)', () => {
        expect(() => passEngine.calculateIntent(null, mockSnapshot, 7, 10)).toThrow(TypeError);
        expect(() => passEngine.calculateIntent(mockState, null, 7, 10)).toThrow(TypeError);
        expect(() => passEngine.calculateIntent(mockState, mockSnapshot, null, 10)).toThrow(TypeError);
        expect(() => passEngine.calculateIntent(mockState, mockSnapshot, 7, null)).toThrow(TypeError);
    });

    test('7. PassEngine integration with PossessionStateTransition clears owner and assigns releaseVelocity', () => {
        const intent = passEngine.calculateIntent(mockState, mockSnapshot, 7, 10, PASS_TYPES.GROUND);

        const mockBall = {
            ownerId: 7,
            position: { x: 100, y: 100 },
            velocity: { x: 0, y: 0 },
            cloneWith(changes) {
                return { ...this, ...changes };
            }
        };

        const nextBall = transition.apply(mockBall, mockSnapshot, {
            release: true,
            releaseVelocity: intent.velocity
        });

        expect(nextBall.ownerId).toBeNull();
        expect(nextBall.velocity).toEqual({ x: 300, y: 0 });
    });

    test('8. PassEngine does not mutate state or ball', () => {
        const ballBefore = JSON.stringify(mockState.ball);
        const playersBefore = JSON.stringify(mockState.players);

        passEngine.calculateIntent(mockState, mockSnapshot, 7, 10);

        expect(JSON.stringify(mockState.ball)).toBe(ballBefore);
        expect(JSON.stringify(mockState.players)).toBe(playersBefore);
    });

    test('9. Generated PassIntent object is frozen (Immutable)', () => {
        const intent = passEngine.calculateIntent(mockState, mockSnapshot, 7, 10);

        expect(Object.isFrozen(intent)).toBe(true);
        expect(Object.isFrozen(intent.targetPosition)).toBe(true);
        expect(Object.isFrozen(intent.velocity)).toBe(true);
    });

    test('10. Bit-exact value determinism across executions', () => {
        const intentA = passEngine.calculateIntent(mockState, mockSnapshot, 7, 10, PASS_TYPES.GROUND);
        const intentB = passEngine.calculateIntent(mockState, mockSnapshot, 7, 10, PASS_TYPES.GROUND);

        expect(intentA).not.toBe(intentB);
        expect(intentA).toEqual(intentB);
        expect(intentA.velocity.x).toBe(300);
        expect(intentA.velocity.y).toBe(0);
    });
});