// tests/possession.test.js

import { describe, expect, test } from 'vitest';
import { PossessionEngine } from '../src/engine/PossessionEngine.js';

// V3.3 Sözleşmesine tam uyumlu Immutable Mock Entity Sınıfları
class Player {
    constructor({ id, teamId, basePosition }) {
        this.id = id;
        this.teamId = teamId;
        this.position = Object.freeze({ ...basePosition });
        Object.freeze(this);
    }
}

class Ball {
    constructor({ position, ownerId = null }) {
        this.position = Object.freeze({ ...position });
        this.ownerId = ownerId;
        Object.freeze(this);
    }
}

class MatchState {
    constructor({ players = [], ball = null }) {
        this.players = Object.freeze([...players]);
        this.ball = ball;
        Object.freeze(this);
    }
}

describe('V3.3 — Possession Engine', () => {
    const possessionEngine = new PossessionEngine({
        controlRadius: 12
    });

    test('1. Free ball when players are far away', () => {
        const ball = new Ball({
            position: { x: 500, y: 300 }
        });

        const playerA = new Player({
            id: 1,
            teamId: 'A',
            basePosition: { x: 100, y: 100 }
        });

        const state = new MatchState({
            players: [playerA],
            ball
        });

        const snapshot = possessionEngine.evaluate(state);

        expect(snapshot.state).toBe('FREE');
        expect(snapshot.ownerId).toBeNull();
        expect(snapshot.nearestPlayerId).toBe(1);
        expect(snapshot.distance).toBeGreaterThan(12);
    });

    test('2. Controlled ball when player is within control radius', () => {
        const ball = new Ball({
            position: { x: 500, y: 300 }
        });

        const playerA = new Player({
            id: 7,
            teamId: 'A',
            basePosition: { x: 505, y: 300 }
        });

        const state = new MatchState({
            players: [playerA],
            ball
        });

        const snapshot = possessionEngine.evaluate(state);

        expect(snapshot.state).toBe('CONTROLLED');
        expect(snapshot.ownerId).toBe(7);
        expect(snapshot.nearestPlayerId).toBe(7);
        expect(snapshot.distance).toBe(5);
    });

    test('3. Evaluates nearest player correctly among multiple players', () => {
        const ball = new Ball({
            position: { x: 500, y: 300 }
        });

        const p1 = new Player({
            id: 1,
            teamId: 'A',
            basePosition: { x: 100, y: 100 }
        });

        const p2 = new Player({
            id: 2,
            teamId: 'B',
            basePosition: { x: 490, y: 300 }
        });

        const state = new MatchState({
            players: [p1, p2],
            ball
        });

        const snapshot = possessionEngine.evaluate(state);

        expect(snapshot.nearestPlayerId).toBe(2);
        expect(snapshot.state).toBe('CONTROLLED');
        expect(snapshot.ownerId).toBe(2);
        expect(snapshot.distance).toBe(10);
    });

    test('4. Correctly identifies nearest opponent and distance', () => {
        const ball = new Ball({
            position: { x: 500, y: 300 }
        });

        const pA = new Player({
            id: 7,
            teamId: 'A',
            basePosition: { x: 502, y: 300 }
        });

        const pB = new Player({
            id: 12,
            teamId: 'B',
            basePosition: { x: 520, y: 300 }
        });

        const state = new MatchState({
            players: [pA, pB],
            ball
        });

        const snapshot = possessionEngine.evaluate(state);

        expect(snapshot.nearestPlayerId).toBe(7);
        expect(snapshot.nearestOpponentId).toBe(12);
        expect(snapshot.nearestOpponentDistance).toBe(20);
    });

    test('5. MatchState and Ball are not mutated', () => {
        const ball = new Ball({
            position: { x: 500, y: 300 },
            ownerId: null
        });

        const pA = new Player({
            id: 7,
            teamId: 'A',
            basePosition: { x: 502, y: 300 }
        });

        const state = new MatchState({
            players: [pA],
            ball
        });

        const originalBall = state.ball;
        const originalPosition = state.ball.position;
        const originalOwnerId = state.ball.ownerId;

        const snapshot = possessionEngine.evaluate(state);

        expect(state.ball).toBe(originalBall);
        expect(state.ball.position).toBe(originalPosition);
        expect(state.ball.ownerId).toBe(originalOwnerId);
        expect(state.ball.ownerId).toBeNull();

        expect(Object.isFrozen(state)).toBe(true);
        expect(Object.isFrozen(state.ball)).toBe(true);
        expect(Object.isFrozen(snapshot)).toBe(true);
    });

    test('6. Bit-exact determinism across evaluations', () => {
        const ball = new Ball({
            position: { x: 500, y: 300 }
        });

        const pA = new Player({
            id: 7,
            teamId: 'A',
            basePosition: { x: 510, y: 300 }
        });

        const state = new MatchState({
            players: [pA],
            ball
        });

        const snapshotA = possessionEngine.evaluate(state);
        const snapshotB = possessionEngine.evaluate(state);

        expect(snapshotA.state).toBe(snapshotB.state);
        expect(snapshotA.ownerId).toBe(snapshotB.ownerId);
        expect(snapshotA.nearestPlayerId).toBe(snapshotB.nearestPlayerId);
        expect(snapshotA.distance).toBe(snapshotB.distance);
        expect(snapshotA.nearestOpponentId).toBe(snapshotB.nearestOpponentId);
        expect(snapshotA.nearestOpponentDistance).toBe(snapshotB.nearestOpponentDistance);
    });

    test('7. Control radius boundary is inclusive', () => {
        const ball = new Ball({
            position: { x: 500, y: 300 }
        });

        const player = new Player({
            id: 5,
            teamId: 'A',
            basePosition: { x: 512, y: 300 }
        });

        const state = new MatchState({
            players: [player],
            ball
        });

        const snapshot = possessionEngine.evaluate(state);

        expect(snapshot.distance).toBe(12);
        expect(snapshot.state).toBe('CONTROLLED');
        expect(snapshot.ownerId).toBe(5);
    });

    test('8. No players means FREE ball', () => {
        const ball = new Ball({
            position: { x: 500, y: 300 }
        });

        const state = new MatchState({
            players: [],
            ball
        });

        const snapshot = possessionEngine.evaluate(state);

        expect(snapshot.state).toBe('FREE');
        expect(snapshot.ownerId).toBeNull();
        expect(snapshot.nearestPlayerId).toBeNull();
        expect(snapshot.distance).toBe(Infinity);
        expect(snapshot.nearestOpponentId).toBeNull();
        expect(snapshot.nearestOpponentDistance).toBe(Infinity);
    });

    test('9. No ball means FREE ball', () => {
        const player = new Player({
            id: 1,
            teamId: 'A',
            basePosition: { x: 500, y: 300 }
        });

        const state = new MatchState({
            players: [player],
            ball: null
        });

        const snapshot = possessionEngine.evaluate(state);

        expect(snapshot.state).toBe('FREE');
        expect(snapshot.ownerId).toBeNull();
        expect(snapshot.nearestPlayerId).toBeNull();
        expect(snapshot.distance).toBe(Infinity);
    });

    test('10. PossessionEngine never changes existing ownerId', () => {
        const ball = new Ball({
            position: { x: 500, y: 300 },
            ownerId: 99
        });

        const player = new Player({
            id: 7,
            teamId: 'A',
            basePosition: { x: 502, y: 300 }
        });

        const state = new MatchState({
            players: [player],
            ball
        });

        const snapshot = possessionEngine.evaluate(state);

        expect(snapshot.state).toBe('CONTROLLED');
        expect(snapshot.ownerId).toBe(7);
        expect(state.ball.ownerId).toBe(99);
    });

    // ------------------------------------------------------------
    // 11 — EŞİT MESAFEDE KÜÇÜK ID KAZANMALI
    // ------------------------------------------------------------

    test('11. eşit mesafedeki oyuncular arasında küçük ID sahibi topa sahip olmalı', () => {

        const engine = new PossessionEngine({
            controlRadius: 12
        });

        const ball = new Ball({
            position: { x: 100, y: 100 }
        });

        const p7 = new Player({
            id: 7,
            teamId: 'HOME',
            basePosition: { x: 100, y: 100 }
        });

        const p3 = new Player({
            id: 3,
            teamId: 'HOME',
            basePosition: { x: 100, y: 100 }
        });

        const state = new MatchState({
            players: [p7, p3],
            ball
        });

        const result = engine.evaluate(state);

        expect(result.ownerId).toBe(3);
    });


    // ------------------------------------------------------------
    // 12 — DİZİ SIRASI DEĞİŞSE BİLE SONUÇ AYNI OLMALI
    // ------------------------------------------------------------

    test('12. eşit mesafede oyuncu dizisinin sırası sonucu değiştirmemeli', () => {

        const engine = new PossessionEngine({
            controlRadius: 12
        });

        const ball = new Ball({
            position: { x: 100, y: 100 }
        });

        const p7 = new Player({
            id: 7,
            teamId: 'HOME',
            basePosition: { x: 100, y: 100 }
        });

        const p3 = new Player({
            id: 3,
            teamId: 'HOME',
            basePosition: { x: 100, y: 100 }
        });

        const stateA = new MatchState({
            players: [p7, p3],
            ball
        });

        const stateB = new MatchState({
            players: [p3, p7],
            ball
        });

        const result1 = engine.evaluate(stateA);
        const result2 = engine.evaluate(stateB);

        expect(result1.ownerId).toBe(3);
        expect(result2.ownerId).toBe(3);
    });


    // ------------------------------------------------------------
    // 13 — DEFAULT CONTROL RADIUS SÖZLEŞMESİ
    // ------------------------------------------------------------

    test('13. Default controlRadius 12 px sözleşmesi', () => {

        const engine = new PossessionEngine();

        const ball = new Ball({
            position: { x: 500, y: 300 }
        });

        // 11.99 px → CONTROLLED
        const playerInside = new Player({
            id: 5,
            teamId: 'A',
            basePosition: { x: 511.99, y: 300 }
        });

        const insideSnapshot = engine.evaluate(
            new MatchState({ players: [playerInside], ball })
        );

        expect(insideSnapshot.state).toBe('CONTROLLED');
        expect(insideSnapshot.ownerId).toBe(5);

        // 12.01 px → FREE
        const playerOutside = new Player({
            id: 6,
            teamId: 'A',
            basePosition: { x: 512.01, y: 300 }
        });

        const outsideSnapshot = engine.evaluate(
            new MatchState({ players: [playerOutside], ball })
        );

        expect(outsideSnapshot.state).toBe('FREE');
        expect(outsideSnapshot.ownerId).toBeNull();
    });
});