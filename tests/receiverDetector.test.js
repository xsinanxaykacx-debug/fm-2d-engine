// tests/receiverDetector.test.js

import { describe, expect, test } from 'vitest';
import { ReceiverDetector, CONTROL_RADIUS } from '../src/engine/ReceiverDetector.js';

describe('V3.8 — Receiver Detector', () => {
    const detector = new ReceiverDetector();

    test('1. Detects specified targetReceiverId when within control radius (<=12px)', () => {
        const state = Object.freeze({
            ball: Object.freeze({
                ownerId: null,
                position: Object.freeze({ x: 100, y: 100 }),
                velocity: Object.freeze({ x: 100, y: 0 })
            }),
            players: Object.freeze([
                Object.freeze({ id: 10, teamId: 'HOME', position: Object.freeze({ x: 108, y: 100 }) }) // 8px away
            ])
        });

        const snapshot = detector.evaluate(state, 'HOME', 10);

        expect(snapshot.hasReceiver).toBe(true);
        expect(snapshot.receiverId).toBe(10);
        expect(snapshot.distanceToBall).toBe(8);
    });

    test('2. Ignores players outside control radius (>12px)', () => {
        const state = Object.freeze({
            ball: Object.freeze({
                ownerId: null,
                position: Object.freeze({ x: 100, y: 100 }),
                velocity: Object.freeze({ x: 100, y: 0 })
            }),
            players: Object.freeze([
                Object.freeze({ id: 10, teamId: 'HOME', position: Object.freeze({ x: 115, y: 100 }) }) // 15px > 12px
            ])
        });

        const snapshot = detector.evaluate(state, 'HOME', 10);

        expect(snapshot.hasReceiver).toBe(false);
        expect(snapshot.receiverId).toBeNull();
    });

    test('3. Prioritizes targetReceiverId over a closer non-target teammate in range', () => {
        const state = Object.freeze({
            ball: Object.freeze({
                ownerId: null,
                position: Object.freeze({ x: 100, y: 100 }),
                velocity: Object.freeze({ x: 100, y: 0 })
            }),
            players: Object.freeze([
                Object.freeze({ id: 7, teamId: 'HOME', position: Object.freeze({ x: 103, y: 100 }) }),  // 3px away (closer)
                Object.freeze({ id: 10, teamId: 'HOME', position: Object.freeze({ x: 108, y: 100 }) }) // 8px away (target)
            ])
        });

        const snapshot = detector.evaluate(state, 'HOME', 10);

        expect(snapshot.hasReceiver).toBe(true);
        expect(snapshot.receiverId).toBe(10); // Target receiver wins
    });

    test('4. Falls back to closest teammate if targetReceiverId is null or out of range', () => {
        const state = Object.freeze({
            ball: Object.freeze({
                ownerId: null,
                position: Object.freeze({ x: 100, y: 100 }),
                velocity: Object.freeze({ x: 100, y: 0 })
            }),
            players: Object.freeze([
                Object.freeze({ id: 15, teamId: 'HOME', position: Object.freeze({ x: 109, y: 100 }) }), // 9px away
                Object.freeze({ id: 20, teamId: 'HOME', position: Object.freeze({ x: 105, y: 100 }) })  // 5px away
            ])
        });

        const snapshot = detector.evaluate(state, 'HOME', null);

        expect(snapshot.hasReceiver).toBe(true);
        expect(snapshot.receiverId).toBe(20); // Closest teammate wins
        expect(snapshot.distanceToBall).toBe(5);
    });

    test('5. Tie-breaker: Smallest player ID wins when distances are identical', () => {
        const state = Object.freeze({
            ball: Object.freeze({
                ownerId: null,
                position: Object.freeze({ x: 100, y: 100 }),
                velocity: Object.freeze({ x: 100, y: 0 })
            }),
            players: Object.freeze([
                Object.freeze({ id: 30, teamId: 'HOME', position: Object.freeze({ x: 106, y: 100 }) }),
                Object.freeze({ id: 12, teamId: 'HOME', position: Object.freeze({ x: 94, y: 100 }) }) // Both 6px away
            ])
        });

        const snapshot = detector.evaluate(state, 'HOME', null);

        expect(snapshot.hasReceiver).toBe(true);
        expect(snapshot.receiverId).toBe(12); // Smaller ID wins
    });

    test('6. Opponents are ignored when checking receiver control', () => {
        const state = Object.freeze({
            ball: Object.freeze({
                ownerId: null,
                position: Object.freeze({ x: 100, y: 100 }),
                velocity: Object.freeze({ x: 100, y: 0 })
            }),
            players: Object.freeze([
                Object.freeze({ id: 99, teamId: 'AWAY', position: Object.freeze({ x: 102, y: 100 }) }) // Opponent 2px away
            ])
        });

        const snapshot = detector.evaluate(state, 'HOME', null);

        expect(snapshot.hasReceiver).toBe(false);
    });

    test('7. Controlled or stationary ball yields hasReceiver = false', () => {
        const ownedState = Object.freeze({
            ball: Object.freeze({
                ownerId: 5,
                position: Object.freeze({ x: 100, y: 100 }),
                velocity: Object.freeze({ x: 0, y: 0 })
            }),
            players: Object.freeze([
                Object.freeze({ id: 10, teamId: 'HOME', position: Object.freeze({ x: 100, y: 100 }) })
            ])
        });

        expect(detector.evaluate(ownedState, 'HOME', 10).hasReceiver).toBe(false);
    });

    test('8. Fail fast on missing mandatory inputs (TypeError)', () => {
        const validState = { ball: { ownerId: null, position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 } }, players: [] };

        expect(() => detector.evaluate(null, 'HOME')).toThrow(TypeError);
        expect(() => detector.evaluate(validState, null)).toThrow(TypeError);
    });

    test('9. Detector and returned ReceiverSnapshot are immutable', () => {
        const state = Object.freeze({
            ball: Object.freeze({
                ownerId: null,
                position: Object.freeze({ x: 100, y: 100 }),
                velocity: Object.freeze({ x: 100, y: 0 })
            }),
            players: Object.freeze([
                Object.freeze({ id: 10, teamId: 'HOME', position: Object.freeze({ x: 105, y: 100 }) })
            ])
        });

        const snapshot = detector.evaluate(state, 'HOME', 10);

        expect(Object.isFrozen(detector)).toBe(true);
        expect(Object.isFrozen(snapshot)).toBe(true);
    });

    test('10. Bit-exact value determinism across evaluations', () => {
        const state = Object.freeze({
            ball: Object.freeze({
                ownerId: null,
                position: Object.freeze({ x: 100, y: 100 }),
                velocity: Object.freeze({ x: 100, y: 0 })
            }),
            players: Object.freeze([
                Object.freeze({ id: 10, teamId: 'HOME', position: Object.freeze({ x: 105, y: 100 }) })
            ])
        });

        const snap1 = detector.evaluate(state, 'HOME', 10);
        const snap2 = detector.evaluate(state, 'HOME', 10);

        expect(snap1).not.toBe(snap2); // Distinct new snapshot objects
        expect(snap1).toEqual(snap2);  // Bit-exact value equality
    });


    // ------------------------------------------------------------
    // 11 — Target out of range → NO fallback
    // ------------------------------------------------------------

    test('11. Target receiver out of range → NO fallback', () => {

        const state = Object.freeze({
            ball: Object.freeze({
                ownerId: null,
                position: Object.freeze({ x: 100, y: 100 }),
                velocity: Object.freeze({ x: 100, y: 0 })
            }),
            players: Object.freeze([
                Object.freeze({ id: 10, teamId: 'HOME', position: Object.freeze({ x: 125, y: 100 }) }),
                Object.freeze({ id: 7, teamId: 'HOME', position: Object.freeze({ x: 103, y: 100 }) })
            ])
        });

        // targetReceiverId = 10 (uzak). Player 7 yakın ama target değil.
        const snapshot = detector.evaluate(state, 'HOME', 10);

        // Yeni davranış: fallback YOK
        expect(snapshot.hasReceiver).toBe(false);
        expect(snapshot.receiverId).toBeNull();
        expect(snapshot.distanceToBall).toBeNull();
    });


    // ------------------------------------------------------------
    // 12 — Target exists but out of range → receiverId null
    // ------------------------------------------------------------

    test('12. Target receiver exists but out of range', () => {

        const state = Object.freeze({
            ball: Object.freeze({
                ownerId: null,
                position: Object.freeze({ x: 100, y: 100 }),
                velocity: Object.freeze({ x: 100, y: 0 })
            }),
            players: Object.freeze([
                Object.freeze({ id: 10, teamId: 'HOME', position: Object.freeze({ x: 200, y: 100 }) })
            ])
        });

        const snapshot = detector.evaluate(state, 'HOME', 10);

        expect(snapshot.hasReceiver).toBe(false);
        expect(snapshot.receiverId).toBeNull();
    });


    // ------------------------------------------------------------
    // 13 — Target null → fallback still works
    // ------------------------------------------------------------

    test('13. Target receiver null → fallback still works', () => {

        const state = Object.freeze({
            ball: Object.freeze({
                ownerId: null,
                position: Object.freeze({ x: 100, y: 100 }),
                velocity: Object.freeze({ x: 100, y: 0 })
            }),
            players: Object.freeze([
                Object.freeze({ id: 7, teamId: 'HOME', position: Object.freeze({ x: 103, y: 100 }) }),
                Object.freeze({ id: 10, teamId: 'HOME', position: Object.freeze({ x: 108, y: 100 }) })
            ])
        });

        // targetReceiverId = null → fallback
        const snapshot = detector.evaluate(state, 'HOME', null);

        expect(snapshot.hasReceiver).toBe(true);
        expect(snapshot.receiverId).toBe(7);  // en yakın
    });

});