// tests/restartTypeResolver.test.js

import { describe, expect, test } from 'vitest';
import { RestartTypeResolver, RESTART_TYPES } from '../src/engine/RestartTypeResolver.js';
import { BOUNDARY_EDGES } from '../src/engine/BoundaryDetector.js';
import { RESTART_LINE_TYPES } from '../src/engine/RestartEventDetector.js';

describe('V4.4 — Restart Type Resolver Engine', () => {
    const resolver = new RestartTypeResolver();
    const defaultContext = Object.freeze({
        homeTeamId: 'HOME',
        awayTeamId: 'AWAY',
        homeAttackingSide: 'RIGHT' // Home attacks RIGHT, so OUT_LEFT is Home Goal Line, OUT_RIGHT is Away Goal Line
    });

    test('1. In-bounds or no event produces RESTART_TYPES.NONE and requiresPlacement false', () => {
        const restartEvent = { hasEvent: false, lineType: RESTART_LINE_TYPES.NONE, edge: BOUNDARY_EDGES.NONE };
        const result = resolver.resolve(restartEvent, defaultContext);

        expect(result.type).toBe(RESTART_TYPES.NONE);
        expect(result.executingTeamId).toBeNull();
        expect(result.defendingTeamId).toBeNull();
        expect(result.requiresPlacement).toBe(false);
    });

    test('2. Missing lastTouchTeamId returns RESTART_TYPES.NONE safely (Unresolved Safeguard)', () => {
        const restartEvent = {
            hasEvent: true,
            lineType: RESTART_LINE_TYPES.TOUCHLINE,
            edge: BOUNDARY_EDGES.OUT_TOP,
            lastTouchTeamId: null
        };
        const result = resolver.resolve(restartEvent, defaultContext);

        expect(result.type).toBe(RESTART_TYPES.NONE);
        expect(result.requiresPlacement).toBe(false);
    });

    test('3. Touchline Event (HOME last touch) -> THROW_IN for AWAY', () => {
        const restartEvent = {
            hasEvent: true,
            lineType: RESTART_LINE_TYPES.TOUCHLINE,
            edge: BOUNDARY_EDGES.OUT_TOP,
            lastTouchTeamId: 'HOME'
        };
        const result = resolver.resolve(restartEvent, defaultContext);

        expect(result.type).toBe(RESTART_TYPES.THROW_IN);
        expect(result.executingTeamId).toBe('AWAY');
        expect(result.defendingTeamId).toBe('HOME');
        expect(result.requiresPlacement).toBe(true);
    });

    test('4. Touchline Event (AWAY last touch) -> THROW_IN for HOME', () => {
        const restartEvent = {
            hasEvent: true,
            lineType: RESTART_LINE_TYPES.TOUCHLINE,
            edge: BOUNDARY_EDGES.OUT_BOTTOM,
            lastTouchTeamId: 'AWAY'
        };
        const result = resolver.resolve(restartEvent, defaultContext);

        expect(result.type).toBe(RESTART_TYPES.THROW_IN);
        expect(result.executingTeamId).toBe('HOME');
        expect(result.defendingTeamId).toBe('AWAY');
        expect(result.requiresPlacement).toBe(true);
    });

    test('5. Goalline OUT_LEFT (Home Goal Line) + AWAY last touch -> GOAL_KICK for HOME', () => {
        const restartEvent = {
            hasEvent: true,
            lineType: RESTART_LINE_TYPES.GOALLINE,
            edge: BOUNDARY_EDGES.OUT_LEFT,
            lastTouchTeamId: 'AWAY'
        };
        const result = resolver.resolve(restartEvent, defaultContext);

        expect(result.type).toBe(RESTART_TYPES.GOAL_KICK);
        expect(result.executingTeamId).toBe('HOME');
        expect(result.defendingTeamId).toBe('AWAY');
        expect(result.requiresPlacement).toBe(true);
    });

    test('6. Goalline OUT_LEFT (Home Goal Line) + HOME last touch -> CORNER_KICK for AWAY', () => {
        const restartEvent = {
            hasEvent: true,
            lineType: RESTART_LINE_TYPES.GOALLINE,
            edge: BOUNDARY_EDGES.OUT_LEFT,
            lastTouchTeamId: 'HOME'
        };
        const result = resolver.resolve(restartEvent, defaultContext);

        expect(result.type).toBe(RESTART_TYPES.CORNER_KICK);
        expect(result.executingTeamId).toBe('AWAY');
        expect(result.defendingTeamId).toBe('HOME');
        expect(result.requiresPlacement).toBe(true);
    });

    test('7. Dynamic Side Swap: homeAttackingSide = "LEFT" flips Goal Line ownership', () => {
        const invertedContext = {
            homeTeamId: 'HOME',
            awayTeamId: 'AWAY',
            homeAttackingSide: 'LEFT' // Home attacks LEFT, so OUT_LEFT is AWAY Goal Line
        };

        const restartEvent = {
            hasEvent: true,
            lineType: RESTART_LINE_TYPES.GOALLINE,
            edge: BOUNDARY_EDGES.OUT_LEFT,
            lastTouchTeamId: 'HOME'
        };
        const result = resolver.resolve(restartEvent, invertedContext);

        expect(result.type).toBe(RESTART_TYPES.GOAL_KICK);
        expect(result.executingTeamId).toBe('AWAY');
        expect(result.defendingTeamId).toBe('HOME');
    });

    test('8. Goalline OUT_RIGHT (Away Goal Line) + AWAY last touch -> CORNER_KICK for HOME', () => {
        const restartEvent = {
            hasEvent: true,
            lineType: RESTART_LINE_TYPES.GOALLINE,
            edge: BOUNDARY_EDGES.OUT_RIGHT,
            lastTouchTeamId: 'AWAY'
        };
        const result = resolver.resolve(restartEvent, defaultContext);

        expect(result.type).toBe(RESTART_TYPES.CORNER_KICK);
        expect(result.executingTeamId).toBe('HOME');
        expect(result.defendingTeamId).toBe('AWAY');
        expect(result.requiresPlacement).toBe(true);
    });

    test('9. Fail Fast on invalid inputs (TypeError)', () => {
        expect(() => resolver.resolve(null, defaultContext)).toThrow(TypeError);
        expect(() => resolver.resolve({}, null)).toThrow(TypeError);
        expect(() => resolver.resolve({}, { homeTeamId: 'H' })).toThrow(TypeError);
        expect(() => resolver.resolve({}, { homeTeamId: 'H', awayTeamId: 'A', homeAttackingSide: 'UP' })).toThrow(TypeError);
    });

    test('10. Resolver instance and result snapshot are strictly frozen', () => {
        const restartEvent = { hasEvent: true, lineType: RESTART_LINE_TYPES.TOUCHLINE, edge: BOUNDARY_EDGES.OUT_TOP, lastTouchTeamId: 'HOME' };
        const result = resolver.resolve(restartEvent, defaultContext);

        expect(Object.isFrozen(resolver)).toBe(true);
        expect(Object.isFrozen(result)).toBe(true);
    });

    test('11. Determinism across executions', () => {
        const restartEvent = { hasEvent: true, lineType: RESTART_LINE_TYPES.GOALLINE, edge: BOUNDARY_EDGES.OUT_LEFT, lastTouchTeamId: 'AWAY' };
        const res1 = resolver.resolve(restartEvent, defaultContext);
        const res2 = resolver.resolve(restartEvent, defaultContext);

        expect(res1).toEqual(res2);
    });

    test('12. Unknown lastTouchTeamId throws TypeError (Fail-Fast Guard)', () => {
        const restartEvent = {
            hasEvent: true,
            lineType: RESTART_LINE_TYPES.TOUCHLINE,
            edge: BOUNDARY_EDGES.OUT_TOP,
            lastTouchTeamId: 'UNKNOWN_TEAM'
        };
        expect(() => resolver.resolve(restartEvent, defaultContext)).toThrow(TypeError);
    });

    test('13. Inconsistent lineType and edge combinations throw TypeError (Fail-Fast Guard)', () => {
        const invalidTouchline = {
            hasEvent: true,
            lineType: RESTART_LINE_TYPES.TOUCHLINE,
            edge: BOUNDARY_EDGES.OUT_LEFT, // Inconsistent! OUT_LEFT is GOALLINE
            lastTouchTeamId: 'HOME'
        };

        const invalidGoalline = {
            hasEvent: true,
            lineType: RESTART_LINE_TYPES.GOALLINE,
            edge: BOUNDARY_EDGES.OUT_TOP, // Inconsistent! OUT_TOP is TOUCHLINE
            lastTouchTeamId: 'HOME'
        };

        expect(() => resolver.resolve(invalidTouchline, defaultContext)).toThrow(TypeError);
        expect(() => resolver.resolve(invalidGoalline, defaultContext)).toThrow(TypeError);
    });
});