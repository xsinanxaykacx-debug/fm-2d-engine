// tests/restartEventDetector.test.js

import { describe, expect, test } from 'vitest';
import { RestartEventDetector, RESTART_LINE_TYPES } from '../src/engine/RestartEventDetector.js';
import { BOUNDARY_EDGES } from '../src/engine/BoundaryDetector.js';

describe('V4.3 — Restart Event Detector Engine', () => {
    const detector = new RestartEventDetector();

    test('1. In-bounds ball produces NO restart event', () => {
        const ball = { isOutOfBounds: false, lastBoundaryEdge: BOUNDARY_EDGES.NONE };
        const snap = detector.evaluate(ball);

        expect(snap.hasEvent).toBe(false);
        expect(snap.lineType).toBe(RESTART_LINE_TYPES.NONE);
        expect(snap.requiresTypeResolution).toBe(false);
    });

    test('2. OUT_TOP triggers TOUCHLINE event metadata', () => {
        const ball = {
            isOutOfBounds: true,
            lastBoundaryEdge: BOUNDARY_EDGES.OUT_TOP,
            exitPosition: { x: 45, y: -0.1 }
        };
        const snap = detector.evaluate(ball, { playerId: 10, teamId: 'HOME' });

        expect(snap.hasEvent).toBe(true);
        expect(snap.lineType).toBe(RESTART_LINE_TYPES.TOUCHLINE);
        expect(snap.edge).toBe(BOUNDARY_EDGES.OUT_TOP);
        expect(snap.lastTouchedBy).toBe(10);
        expect(snap.lastTouchTeamId).toBe('HOME');
        expect(snap.requiresTypeResolution).toBe(true);
    });

    test('3. OUT_BOTTOM triggers TOUCHLINE event metadata', () => {
        const ball = {
            isOutOfBounds: true,
            lastBoundaryEdge: BOUNDARY_EDGES.OUT_BOTTOM,
            exitPosition: { x: 55, y: 68.1 }
        };
        const snap = detector.evaluate(ball, { playerId: 7, teamId: 'AWAY' });

        expect(snap.hasEvent).toBe(true);
        expect(snap.lineType).toBe(RESTART_LINE_TYPES.TOUCHLINE);
        expect(snap.edge).toBe(BOUNDARY_EDGES.OUT_BOTTOM);
    });

    test('4. OUT_LEFT triggers GOALLINE event metadata', () => {
        const ball = {
            isOutOfBounds: true,
            lastBoundaryEdge: BOUNDARY_EDGES.OUT_LEFT,
            exitPosition: { x: -0.2, y: 34 }
        };
        const snap = detector.evaluate(ball, { playerId: 1, teamId: 'HOME' });

        expect(snap.hasEvent).toBe(true);
        expect(snap.lineType).toBe(RESTART_LINE_TYPES.GOALLINE);
        expect(snap.edge).toBe(BOUNDARY_EDGES.OUT_LEFT);
        expect(snap.requiresTypeResolution).toBe(true);
    });

    test('5. OUT_RIGHT triggers GOALLINE event metadata', () => {
        const ball = {
            isOutOfBounds: true,
            lastBoundaryEdge: BOUNDARY_EDGES.OUT_RIGHT,
            exitPosition: { x: 105.2, y: 20 }
        };
        const snap = detector.evaluate(ball, { playerId: 9, teamId: 'AWAY' });

        expect(snap.hasEvent).toBe(true);
        expect(snap.lineType).toBe(RESTART_LINE_TYPES.GOALLINE);
        expect(snap.edge).toBe(BOUNDARY_EDGES.OUT_RIGHT);
    });

    test('6. Fallback to ball property when lastTouchInfo is not explicitly passed', () => {
        const ball = {
            isOutOfBounds: true,
            lastBoundaryEdge: BOUNDARY_EDGES.OUT_LEFT,
            lastTouchedBy: 4,
            lastTouchTeamId: 'HOME'
        };
        const snap = detector.evaluate(ball);

        expect(snap.lastTouchedBy).toBe(4);
        expect(snap.lastTouchTeamId).toBe('HOME');
    });

    test('7. Fail Fast on invalid inputs (TypeError)', () => {
        expect(() => detector.evaluate(null)).toThrow(TypeError);
        expect(() => detector.evaluate('invalid')).toThrow(TypeError);
    });

    test('8. Detector and Snapshot Immutability', () => {
        const ball = { isOutOfBounds: true, lastBoundaryEdge: BOUNDARY_EDGES.OUT_TOP };
        const snap = detector.evaluate(ball);

        expect(Object.isFrozen(detector)).toBe(true);
        expect(Object.isFrozen(snap)).toBe(true);
    });

    test('9. Determinism across executions', () => {
        const ball = { isOutOfBounds: true, lastBoundaryEdge: BOUNDARY_EDGES.OUT_RIGHT, exitPosition: { x: 105.1, y: 30 } };
        const snap1 = detector.evaluate(ball, { playerId: 2, teamId: 'HOME' });
        const snap2 = detector.evaluate(ball, { playerId: 2, teamId: 'HOME' });

        expect(snap1).toEqual(snap2);
    });
});