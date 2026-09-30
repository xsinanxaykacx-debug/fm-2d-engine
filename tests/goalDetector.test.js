// tests/goalDetector.test.js

import { describe, expect, test } from 'vitest';
import { GoalDetector, GOAL_SIDES } from '../src/engine/GoalDetector.js';

describe('V5.0 — Goal Detector Engine', () => {
    const detector = new GoalDetector();
    const defaultContext = Object.freeze({
        width: 105,
        height: 68,
        homeTeamId: 'HOME',
        awayTeamId: 'AWAY',
        homeAttackingSide: 'RIGHT', // HOME attacks RIGHT, AWAY attacks LEFT
        goalWidth: 7.32 // goalTop = 30.34, goalBottom = 37.66
    });
    const radius = 0.11;

    test('1. Normal in-bounds ball returns NO GOAL', () => {
        const ball = { position: { x: 52.5, y: 34.0 }, radius };
        const result = detector.detect(ball, defaultContext);

        expect(result.isGoal).toBe(false);
        expect(result.scoringTeamId).toBeNull();
        expect(result.concedingTeamId).toBeNull();
        expect(result.goalSide).toBe(GOAL_SIDES.NONE);
        expect(result.ballPosition).toBeNull();
    });

    test('2. Ball center on left goal line (x = 0) returns NO GOAL', () => {
        const ball = { position: { x: 0.0, y: 34.0 }, radius };
        const result = detector.detect(ball, defaultContext);

        expect(result.isGoal).toBe(false);
    });

    test('3. Ball partially crossing left goal line (x + radius = 0.05 > 0) returns NO GOAL', () => {
        const ball = { position: { x: -0.06, y: 34.0 }, radius: 0.11 };
        const result = detector.detect(ball, defaultContext);

        expect(result.isGoal).toBe(false);
    });

    test('4. Ball fully crossing left goal line (x + radius < 0) within goal height returns GOAL', () => {
        const ball = { position: { x: -0.12, y: 34.0 }, radius: 0.11 };
        const result = detector.detect(ball, defaultContext);

        expect(result.isGoal).toBe(true);
        expect(result.goalSide).toBe(GOAL_SIDES.LEFT);
        expect(result.ballPosition).toEqual({ x: -0.12, y: 34.0 });
    });

    test('5. Ball fully crossing right goal line (x - radius > width) within goal height returns GOAL', () => {
        const ball = { position: { x: 105.12, y: 34.0 }, radius: 0.11 };
        const result = detector.detect(ball, defaultContext);

        expect(result.isGoal).toBe(true);
        expect(result.goalSide).toBe(GOAL_SIDES.RIGHT);
        expect(result.ballPosition).toEqual({ x: 105.12, y: 34.0 });
    });

    test('6. Ball fully crossing left line outside goal height (y < goalTop) returns NO GOAL', () => {
        const ball = { position: { x: -0.5, y: 20.0 }, radius: 0.11 };
        const result = detector.detect(ball, defaultContext);

        expect(result.isGoal).toBe(false);
    });

    test('7. Ball fully crossing right line outside goal height (y > goalBottom) returns NO GOAL', () => {
        const ball = { position: { x: 106.0, y: 50.0 }, radius: 0.11 };
        const result = detector.detect(ball, defaultContext);

        expect(result.isGoal).toBe(false);
    });

    test('8. Ball center within goal frame but edge overlaps goalpost (y - radius <= goalTop) returns NO GOAL', () => {
        const ball = { position: { x: -0.5, y: 30.40 }, radius: 0.11 };
        const result = detector.detect(ball, defaultContext);

        expect(result.isGoal).toBe(false);
    });

    test('9. homeAttackingSide = RIGHT + LEFT GOAL -> AWAY scores, HOME concedes', () => {
        const ball = { position: { x: -0.2, y: 34.0 }, radius: 0.11 };
        const result = detector.detect(ball, defaultContext);

        expect(result.isGoal).toBe(true);
        expect(result.scoringTeamId).toBe('AWAY');
        expect(result.concedingTeamId).toBe('HOME');
    });

    test('10. homeAttackingSide = RIGHT + RIGHT GOAL -> HOME scores, AWAY concedes', () => {
        const ball = { position: { x: 105.2, y: 34.0 }, radius: 0.11 };
        const result = detector.detect(ball, defaultContext);

        expect(result.isGoal).toBe(true);
        expect(result.scoringTeamId).toBe('HOME');
        expect(result.concedingTeamId).toBe('AWAY');
    });

    test('11. Dynamic Side Swap: homeAttackingSide = LEFT + LEFT GOAL -> HOME scores, AWAY concedes', () => {
        const invertedContext = { ...defaultContext, homeAttackingSide: 'LEFT' };
        const ball = { position: { x: -0.2, y: 34.0 }, radius: 0.11 };

        const result = detector.detect(ball, invertedContext);

        expect(result.isGoal).toBe(true);
        expect(result.scoringTeamId).toBe('HOME');
        expect(result.concedingTeamId).toBe('AWAY');
    });

    test('12. Dynamic Side Swap: homeAttackingSide = LEFT + RIGHT GOAL -> AWAY scores, HOME concedes', () => {
        const invertedContext = { ...defaultContext, homeAttackingSide: 'LEFT' };
        const ball = { position: { x: 105.2, y: 34.0 }, radius: 0.11 };

        const result = detector.detect(ball, invertedContext);

        expect(result.isGoal).toBe(true);
        expect(result.scoringTeamId).toBe('AWAY');
        expect(result.concedingTeamId).toBe('HOME');
    });

    test('13. Comprehensive Fail-Fast on invalid ball, radius, pitchContext or goalWidth', () => {
        // Ball Structure & Position Failures
        expect(() => detector.detect(null, defaultContext)).toThrow(TypeError);
        expect(() => detector.detect({ position: { x: NaN, y: 0 } }, defaultContext)).toThrow(TypeError);

        // Ball Radius Strict Validations
        expect(() => detector.detect({ position: { x: 0, y: 0 }, radius: 0 }, defaultContext)).toThrow(TypeError);
        expect(() => detector.detect({ position: { x: 0, y: 0 }, radius: -1 }, defaultContext)).toThrow(TypeError);
        expect(() => detector.detect({ position: { x: 0, y: 0 }, radius: NaN }, defaultContext)).toThrow(TypeError);
        expect(() => detector.detect({ position: { x: 0, y: 0 }, radius: "abc" }, defaultContext)).toThrow(TypeError);

        // PitchContext Structure Failures
        expect(() => detector.detect({ position: { x: 0, y: 0 } }, { ...defaultContext, width: 0 })).toThrow(TypeError);

        // Goal Width Strict Validations
        expect(() => detector.detect({ position: { x: 0, y: 0 } }, { ...defaultContext, goalWidth: 0 })).toThrow(TypeError);
        expect(() => detector.detect({ position: { x: 0, y: 0 } }, { ...defaultContext, goalWidth: -1 })).toThrow(TypeError);
        expect(() => detector.detect({ position: { x: 0, y: 0 } }, { ...defaultContext, goalWidth: NaN })).toThrow(TypeError);
        expect(() => detector.detect({ position: { x: 0, y: 0 } }, { ...defaultContext, goalWidth: "abc" })).toThrow(TypeError);
        expect(() => detector.detect({ position: { x: 0, y: 0 } }, { ...defaultContext, goalWidth: 100 })).toThrow(TypeError);
    });

    test('14. Immutability and Determinism across executions', () => {
        const ball = { position: { x: -0.2, y: 34.0 }, radius: 0.11 };
        const res1 = detector.detect(ball, defaultContext);
        const res2 = detector.detect(ball, defaultContext);

        expect(res1).toEqual(res2);
        expect(Object.isFrozen(detector)).toBe(true);
        expect(Object.isFrozen(res1)).toBe(true);
        expect(Object.isFrozen(res1.ballPosition)).toBe(true);
    });
});