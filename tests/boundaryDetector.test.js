// tests/boundaryDetector.test.js

import { describe, expect, test } from 'vitest';
import { BoundaryDetector, BOUNDARY_EDGES } from '../src/engine/BoundaryDetector.js';

describe('V4.1 — Boundary Detector Engine', () => {
    const defaultDetector = new BoundaryDetector();

    test('1. In-Bounds: Ball inside pitch boundaries returns isOutOfBounds false', () => {
        const ball = { position: { x: 52.5, y: 34 }, radius: 0.11 };
        const snapshot = defaultDetector.evaluate(ball);

        expect(snapshot.isOutOfBounds).toBe(false);
        expect(snapshot.edge).toBe(BOUNDARY_EDGES.NONE);
        expect(snapshot.exitPosition).toBeNull();
    });

    test('2. Boundary Line Touch: Ball touching line but not fully across is still IN-BOUNDS', () => {
        // Left line is X = 0. Ball center at 0.1, radius 0.11 -> Left edge is at -0.01 (Out!)
        // Ball center at 0.11, radius 0.11 -> Left edge is exactly at 0.00 (In-bounds!)
        const ball = { position: { x: 0.11, y: 34 }, radius: 0.11 };
        const snapshot = defaultDetector.evaluate(ball);

        expect(snapshot.isOutOfBounds).toBe(false);
        expect(snapshot.edge).toBe(BOUNDARY_EDGES.NONE);
    });

    test('3. Out Left: Ball fully crossing left goal line triggers OUT_LEFT', () => {
        const ball = { position: { x: -0.01, y: 34 }, radius: 0.11 };
        const snapshot = defaultDetector.evaluate(ball);

        expect(snapshot.isOutOfBounds).toBe(true);
        expect(snapshot.edge).toBe(BOUNDARY_EDGES.OUT_LEFT);
        expect(snapshot.exitPosition).toEqual({ x: -0.01, y: 34 });
    });

    test('4. Out Right: Ball fully crossing right goal line triggers OUT_RIGHT', () => {
        const ball = { position: { x: 105.12, y: 34 }, radius: 0.11 };
        const snapshot = defaultDetector.evaluate(ball);

        expect(snapshot.isOutOfBounds).toBe(true);
        expect(snapshot.edge).toBe(BOUNDARY_EDGES.OUT_RIGHT);
        expect(snapshot.exitPosition).toEqual({ x: 105.12, y: 34 });
    });

    test('5. Out Top: Ball fully crossing top touchline triggers OUT_TOP', () => {
        const ball = { position: { x: 50, y: -0.05 }, radius: 0.11 };
        const snapshot = defaultDetector.evaluate(ball);

        expect(snapshot.isOutOfBounds).toBe(true);
        expect(snapshot.edge).toBe(BOUNDARY_EDGES.OUT_TOP);
        expect(snapshot.exitPosition).toEqual({ x: 50, y: -0.05 });
    });

    test('6. Out Bottom: Ball fully crossing bottom touchline triggers OUT_BOTTOM', () => {
        const ball = { position: { x: 50, y: 68.15 }, radius: 0.11 };
        const snapshot = defaultDetector.evaluate(ball);

        expect(snapshot.isOutOfBounds).toBe(true);
        expect(snapshot.edge).toBe(BOUNDARY_EDGES.OUT_BOTTOM);
        expect(snapshot.exitPosition).toEqual({ x: 50, y: 68.15 });
    });

    test('7. Custom Pitch Dimensions support', () => {
        const customDetector = new BoundaryDetector({ width: 100, height: 50 });
        const ball = { position: { x: 100.15, y: 25 }, radius: 0.11 };

        const snapshot = customDetector.evaluate(ball);
        expect(snapshot.isOutOfBounds).toBe(true);
        expect(snapshot.edge).toBe(BOUNDARY_EDGES.OUT_RIGHT);
    });

    test('8. Fail Fast on invalid inputs (TypeError)', () => {
        expect(() => new BoundaryDetector({ width: 'invalid' })).toThrow(TypeError);
        expect(() => defaultDetector.evaluate(null)).toThrow(TypeError);
        expect(() => defaultDetector.evaluate({})).toThrow(TypeError);
        expect(() => defaultDetector.evaluate({ position: { x: 10 } })).toThrow(TypeError);
    });

    test('9. Immutability: Detector instance and Snapshot are strictly frozen', () => {
        const ball = { position: { x: -1, y: 20 }, radius: 0.11 };
        const snapshot = defaultDetector.evaluate(ball);

        expect(Object.isFrozen(defaultDetector)).toBe(true);
        expect(Object.isFrozen(snapshot)).toBe(true);
        expect(Object.isFrozen(snapshot.exitPosition)).toBe(true);
    });

    test('10. Determinism: Same ball position yields identical snapshot', () => {
        const ball = { position: { x: -0.5, y: 10 }, radius: 0.11 };
        const snap1 = defaultDetector.evaluate(ball);
        const snap2 = defaultDetector.evaluate(ball);

        expect(snap1.isOutOfBounds).toBe(snap2.isOutOfBounds);
        expect(snap1.edge).toBe(snap2.edge);
        expect(snap1.exitPosition).toEqual(snap2.exitPosition);
    });
});