// tests/interceptionDetector.test.js

import { describe, expect, test } from 'vitest';
import { InterceptionDetector, INTERCEPTION_RADIUS } from '../src/engine/InterceptionDetector.js';

describe('V3.6 — Interception Detector', () => {
    const detector = new InterceptionDetector();

    test('1. Detects opponent on trajectory within 15px radius', () => {
        const state = Object.freeze({
            ball: Object.freeze({
                ownerId: null,
                position: Object.freeze({ x: 100, y: 100 }),
                velocity: Object.freeze({ x: 300, y: 0 }) // Moving right
            }),
            players: Object.freeze([
                Object.freeze({ id: 1, teamId: 'HOME', position: Object.freeze({ x: 100, y: 100 }) }), // Passer
                Object.freeze({ id: 99, teamId: 'AWAY', position: Object.freeze({ x: 250, y: 110 }) }) // Opponent 10px perpendicular
            ])
        });

        const snapshot = detector.evaluate(state, 'HOME');

        expect(snapshot.hasCandidate).toBe(true);
        expect(snapshot.interceptorId).toBe(99);
        expect(snapshot.distanceToTrajectory).toBe(10);
        expect(snapshot.interceptionPoint).toEqual({ x: 250, y: 100 });
        expect(snapshot.timeToPoint).toBe(150 / 300); // 0.5s
    });

    test('2. Ignores opponent beyond 15px radius', () => {
        const state = Object.freeze({
            ball: Object.freeze({
                ownerId: null,
                position: Object.freeze({ x: 100, y: 100 }),
                velocity: Object.freeze({ x: 300, y: 0 })
            }),
            players: Object.freeze([
                Object.freeze({ id: 99, teamId: 'AWAY', position: Object.freeze({ x: 250, y: 120 }) }) // 20px > 15px
            ])
        });

        const snapshot = detector.evaluate(state, 'HOME');

        expect(snapshot.hasCandidate).toBe(false);
        expect(snapshot.interceptorId).toBeNull();
    });

    test('3. Ignores opponent positioned behind ball travel direction (rayProj <= 0)', () => {
        const state = Object.freeze({
            ball: Object.freeze({
                ownerId: null,
                position: Object.freeze({ x: 200, y: 100 }),
                velocity: Object.freeze({ x: 300, y: 0 }) // Moving right
            }),
            players: Object.freeze([
                Object.freeze({ id: 99, teamId: 'AWAY', position: Object.freeze({ x: 150, y: 100 }) }) // Behind ball
            ])
        });

        const snapshot = detector.evaluate(state, 'HOME');

        expect(snapshot.hasCandidate).toBe(false);
    });

    test('4. Chooses candidate with smaller timeToPoint among multiple opponents', () => {
        const state = Object.freeze({
            ball: Object.freeze({
                ownerId: null,
                position: Object.freeze({ x: 0, y: 0 }),
                velocity: Object.freeze({ x: 100, y: 0 })
            }),
            players: Object.freeze([
                Object.freeze({ id: 20, teamId: 'AWAY', position: Object.freeze({ x: 300, y: 5 }) }), // 300px ahead (time: 3s)
                Object.freeze({ id: 10, teamId: 'AWAY', position: Object.freeze({ x: 100, y: 5 }) })  // 100px ahead (time: 1s)
            ])
        });

        const snapshot = detector.evaluate(state, 'HOME');

        expect(snapshot.hasCandidate).toBe(true);
        expect(snapshot.interceptorId).toBe(10); // Faster intercept point
    });

    test('5. Tie-breaker: Smallest player ID wins when timeToPoint is identical', () => {
        const state = Object.freeze({
            ball: Object.freeze({
                ownerId: null,
                position: Object.freeze({ x: 0, y: 0 }),
                velocity: Object.freeze({ x: 100, y: 0 })
            }),
            players: Object.freeze([
                Object.freeze({ id: 25, teamId: 'AWAY', position: Object.freeze({ x: 200, y: 5 }) }),
                Object.freeze({ id: 12, teamId: 'AWAY', position: Object.freeze({ x: 200, y: -5 }) }) // Same distance & time
            ])
        });

        const snapshot = detector.evaluate(state, 'HOME');

        expect(snapshot.hasCandidate).toBe(true);
        expect(snapshot.interceptorId).toBe(12); // Smaller ID wins
    });

    test('6. Teammates cannot intercept pass (Only opponents checked)', () => {
        const state = Object.freeze({
            ball: Object.freeze({
                ownerId: null,
                position: Object.freeze({ x: 0, y: 0 }),
                velocity: Object.freeze({ x: 100, y: 0 })
            }),
            players: Object.freeze([
                Object.freeze({ id: 5, teamId: 'HOME', position: Object.freeze({ x: 50, y: 0 }) }) // Teammate in trajectory
            ])
        });

        const snapshot = detector.evaluate(state, 'HOME');

        expect(snapshot.hasCandidate).toBe(false);
    });

    test('7. Controlled or stationary ball yields hasCandidate = false', () => {
        const controlledState = Object.freeze({
            ball: Object.freeze({
                ownerId: 7,
                position: Object.freeze({ x: 0, y: 0 }),
                velocity: Object.freeze({ x: 0, y: 0 })
            }),
            players: Object.freeze([
                Object.freeze({ id: 99, teamId: 'AWAY', position: Object.freeze({ x: 10, y: 0 }) })
            ])
        });

        expect(detector.evaluate(controlledState, 'HOME').hasCandidate).toBe(false);
    });

    test('8. Fail fast on missing mandatory inputs (TypeError)', () => {
        const validState = { ball: { ownerId: null, position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 } }, players: [] };

        expect(() => detector.evaluate(null, 'HOME')).toThrow(TypeError);
        expect(() => detector.evaluate(validState, null)).toThrow(TypeError);
    });

    test('9. Snapshot object and inner points are frozen (Immutable)', () => {
        const state = Object.freeze({
            ball: Object.freeze({
                ownerId: null,
                position: Object.freeze({ x: 0, y: 0 }),
                velocity: Object.freeze({ x: 100, y: 0 })
            }),
            players: Object.freeze([
                Object.freeze({ id: 8, teamId: 'AWAY', position: Object.freeze({ x: 50, y: 0 }) })
            ])
        });

        const snapshot = detector.evaluate(state, 'HOME');

        expect(Object.isFrozen(snapshot)).toBe(true);
        expect(Object.isFrozen(snapshot.interceptionPoint)).toBe(true);
    });

    test('10. Bit-exact value determinism across evaluations', () => {
        const state = Object.freeze({
            ball: Object.freeze({
                ownerId: null,
                position: Object.freeze({ x: 0, y: 0 }),
                velocity: Object.freeze({ x: 200, y: 0 })
            }),
            players: Object.freeze([
                Object.freeze({ id: 15, teamId: 'AWAY', position: Object.freeze({ x: 100, y: 10 }) })
            ])
        });

        const snapA = detector.evaluate(state, 'HOME');
        const snapB = detector.evaluate(state, 'HOME');

        expect(snapA).not.toBe(snapB); // Distinct frozen object references
        expect(snapA).toEqual(snapB);  // Value bit-exact equality
    });
});