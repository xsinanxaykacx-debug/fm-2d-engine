// tests/restartPlacementEngine.test.js

import { describe, expect, test } from 'vitest';
import { RestartPlacementEngine } from '../src/engine/RestartPlacementEngine.js';
import { BOUNDARY_EDGES } from '../src/engine/BoundaryDetector.js';
import { RESTART_TYPES } from '../src/engine/RestartTypeResolver.js';

describe('V4.5 — Restart Placement Engine', () => {
    const placementEngine = new RestartPlacementEngine();
    const pitchContext = Object.freeze({
        width: 105,
        height: 68,
        goalAreaWidth: 5.5
    });

    test('1. NONE resolution returns position null and isPlaced false', () => {
        const restartEvent = { hasEvent: false, exitPosition: null };
        const restartResolution = { type: RESTART_TYPES.NONE, requiresPlacement: false, edge: BOUNDARY_EDGES.NONE };

        const result = placementEngine.calculate(restartEvent, restartResolution, pitchContext);

        expect(result.position).toBeNull();
        expect(result.restartType).toBe(RESTART_TYPES.NONE);
        expect(result.isPlaced).toBe(false);
    });

    test('2. THROW_IN OUT_TOP places on y = 0 with exact X within pitch', () => {
        const restartEvent = { exitPosition: { x: 45.2, y: -0.5 } };
        const restartResolution = { type: RESTART_TYPES.THROW_IN, requiresPlacement: true, edge: BOUNDARY_EDGES.OUT_TOP };

        const result = placementEngine.calculate(restartEvent, restartResolution, pitchContext);

        expect(result.position).toEqual({ x: 45.2, y: 0 });
        expect(result.isPlaced).toBe(true);
    });

    test('3. THROW_IN OUT_BOTTOM places on y = height with exact X within pitch', () => {
        const restartEvent = { exitPosition: { x: 80.1, y: 68.5 } };
        const restartResolution = { type: RESTART_TYPES.THROW_IN, requiresPlacement: true, edge: BOUNDARY_EDGES.OUT_BOTTOM };

        const result = placementEngine.calculate(restartEvent, restartResolution, pitchContext);

        expect(result.position).toEqual({ x: 80.1, y: 68 });
        expect(result.isPlaced).toBe(true);
    });

    test('4. THROW_IN OUT_TOP clamps negative X to 0', () => {
        const restartEvent = { exitPosition: { x: -3.5, y: -0.2 } };
        const restartResolution = { type: RESTART_TYPES.THROW_IN, requiresPlacement: true, edge: BOUNDARY_EDGES.OUT_TOP };

        const result = placementEngine.calculate(restartEvent, restartResolution, pitchContext);

        expect(result.position).toEqual({ x: 0, y: 0 });
    });

    test('5. THROW_IN OUT_BOTTOM clamps excessive X to width', () => {
        const restartEvent = { exitPosition: { x: 110.0, y: 68.2 } };
        const restartResolution = { type: RESTART_TYPES.THROW_IN, requiresPlacement: true, edge: BOUNDARY_EDGES.OUT_BOTTOM };

        const result = placementEngine.calculate(restartEvent, restartResolution, pitchContext);

        expect(result.position).toEqual({ x: 105, y: 68 });
    });

    test('6. CORNER_KICK OUT_LEFT + upper half (y < height/2) places at (0, 0)', () => {
        const restartEvent = { exitPosition: { x: -0.5, y: 15.0 } };
        const restartResolution = { type: RESTART_TYPES.CORNER_KICK, requiresPlacement: true, edge: BOUNDARY_EDGES.OUT_LEFT };

        const result = placementEngine.calculate(restartEvent, restartResolution, pitchContext);

        expect(result.position).toEqual({ x: 0, y: 0 });
    });

    test('7. CORNER_KICK OUT_LEFT + lower half (y >= height/2) places at (0, height)', () => {
        const restartEvent = { exitPosition: { x: -0.2, y: 50.0 } };
        const restartResolution = { type: RESTART_TYPES.CORNER_KICK, requiresPlacement: true, edge: BOUNDARY_EDGES.OUT_LEFT };

        const result = placementEngine.calculate(restartEvent, restartResolution, pitchContext);

        expect(result.position).toEqual({ x: 0, y: 68 });
    });

    test('8. CORNER_KICK OUT_RIGHT + upper half (y < height/2) places at (width, 0)', () => {
        const restartEvent = { exitPosition: { x: 105.5, y: 10.0 } };
        const restartResolution = { type: RESTART_TYPES.CORNER_KICK, requiresPlacement: true, edge: BOUNDARY_EDGES.OUT_RIGHT };

        const result = placementEngine.calculate(restartEvent, restartResolution, pitchContext);

        expect(result.position).toEqual({ x: 105, y: 0 });
    });

    test('9. CORNER_KICK OUT_RIGHT + lower half (y >= height/2) places at (width, height)', () => {
        const restartEvent = { exitPosition: { x: 106.0, y: 40.0 } };
        const restartResolution = { type: RESTART_TYPES.CORNER_KICK, requiresPlacement: true, edge: BOUNDARY_EDGES.OUT_RIGHT };

        const result = placementEngine.calculate(restartEvent, restartResolution, pitchContext);

        expect(result.position).toEqual({ x: 105, y: 68 });
    });

    test('10. GOAL_KICK OUT_LEFT places at (5.5, height / 2)', () => {
        const restartEvent = { exitPosition: { x: -1.0, y: 30.0 } };
        const restartResolution = { type: RESTART_TYPES.GOAL_KICK, requiresPlacement: true, edge: BOUNDARY_EDGES.OUT_LEFT };

        const result = placementEngine.calculate(restartEvent, restartResolution, pitchContext);

        expect(result.position).toEqual({ x: 5.5, y: 34 });
    });

    test('11. GOAL_KICK OUT_RIGHT places at (width - 5.5, height / 2)', () => {
        const restartEvent = { exitPosition: { x: 106.0, y: 38.0 } };
        const restartResolution = { type: RESTART_TYPES.GOAL_KICK, requiresPlacement: true, edge: BOUNDARY_EDGES.OUT_RIGHT };

        const result = placementEngine.calculate(restartEvent, restartResolution, pitchContext);

        expect(result.position).toEqual({ x: 99.5, y: 34 });
    });

    test('12. Fail-Fast on invalid goalAreaWidth or pitchContext', () => {
        const restartEvent = { exitPosition: { x: 10, y: 10 } };
        const restartResolution = { type: RESTART_TYPES.THROW_IN, requiresPlacement: true, edge: BOUNDARY_EDGES.OUT_TOP };

        expect(() => placementEngine.calculate(restartEvent, restartResolution, { width: 105, height: 68, goalAreaWidth: -5 })).toThrow(TypeError);
        expect(() => placementEngine.calculate(restartEvent, restartResolution, { width: 105, height: 68, goalAreaWidth: 60 })).toThrow(TypeError);
        expect(() => placementEngine.calculate(restartEvent, restartResolution, { width: 0, height: 68 })).toThrow(TypeError);
    });

    test('13. Fail-Fast on inconsistent restartType and edge combination or missing exitPosition', () => {
        const restartEvent = { exitPosition: { x: 10, y: 10 } };

        // THROW_IN with OUT_LEFT is invalid
        const invalidThrowIn = { type: RESTART_TYPES.THROW_IN, requiresPlacement: true, edge: BOUNDARY_EDGES.OUT_LEFT };
        // GOAL_KICK with OUT_TOP is invalid
        const invalidGoalKick = { type: RESTART_TYPES.GOAL_KICK, requiresPlacement: true, edge: BOUNDARY_EDGES.OUT_TOP };

        expect(() => placementEngine.calculate(restartEvent, invalidThrowIn, pitchContext)).toThrow(TypeError);
        expect(() => placementEngine.calculate(restartEvent, invalidGoalKick, pitchContext)).toThrow(TypeError);
        expect(() => placementEngine.calculate({ exitPosition: null }, { type: RESTART_TYPES.THROW_IN, requiresPlacement: true, edge: BOUNDARY_EDGES.OUT_TOP }, pitchContext)).toThrow(TypeError);
    });

    test('14. Immutability and Determinism across executions', () => {
        const restartEvent = { exitPosition: { x: 20.0, y: -1.0 } };
        const restartResolution = { type: RESTART_TYPES.THROW_IN, requiresPlacement: true, edge: BOUNDARY_EDGES.OUT_TOP };

        const res1 = placementEngine.calculate(restartEvent, restartResolution, pitchContext);
        const res2 = placementEngine.calculate(restartEvent, restartResolution, pitchContext);

        expect(res1).toEqual(res2);
        expect(Object.isFrozen(placementEngine)).toBe(true);
        expect(Object.isFrozen(res1)).toBe(true);
        expect(Object.isFrozen(res1.position)).toBe(true);
    });
});