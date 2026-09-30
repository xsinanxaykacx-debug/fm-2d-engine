// tests/simulationCore.test.js

import { describe, it, expect } from 'vitest';

import { CollisionDetector } from '../src/engine/CollisionDetector.js';
import { CollisionStateTransition } from '../src/engine/CollisionStateTransition.js';
import { SimulationCore } from '../src/core/SimulationCore.js';
import { PlayerBehaviorEngine } from '../src/engine/PlayerBehaviorEngine.js';
import { DecisionEngine } from '../src/engine/DecisionEngine.js';
import { PhysicsEngine } from '../src/engine/PhysicsEngine.js';
import { PossessionEngine } from '../src/engine/PossessionEngine.js';
import { PassTargetSelector } from '../src/engine/PassTargetSelector.js';
import { PassEngine } from '../src/engine/PassEngine.js';
import { PassExecutor } from '../src/engine/PassExecutor.js';
import { PossessionStateTransition } from '../src/engine/PossessionStateTransition.js';
import { BallPhysics } from '../src/engine/BallPhysics.js';


const FRICTION = 0.98;


describe('SimulationCore — Engine Integration', () => {

    it('çarpışma çözümü State[t+1] içine yazılmalı', () => {

        const players = [
            { id: 'A1', teamId: 'A', role: 'ST', position: { x: 200, y: 200 }, basePosition: { x: 200, y: 200 } },
            { id: 'B1', teamId: 'B', role: 'ST', position: { x: 220, y: 200 }, basePosition: { x: 220, y: 200 } }
        ];

        const core = new SimulationCore({
            initialPlayers: players,
            initialBall: { position: { x: 500, y: 300 } },
            collisionDetector: new CollisionDetector({ collisionDistance: 30 }),
            collisionStateTransition: new CollisionStateTransition({ collisionDistance: 30 })
        });

        const oldState = core.state;
        const result = core.tick();
        const newState = result.state;

        expect(newState).not.toBe(oldState);
        expect(newState.players).not.toBe(oldState.players);

        const playerA = newState.players.find(p => p.id === 'A1');
        const playerB = newState.players.find(p => p.id === 'B1');

        const distance = Math.hypot(
            playerB.position.x - playerA.position.x,
            playerB.position.y - playerA.position.y
        );

        expect(distance).toBeGreaterThanOrEqual(30);
    });


    it('CollisionDetector ve CollisionStateTransition SimulationCore içinde çalışmalı', () => {

        const players = [
            { id: 'A1', teamId: 'A', role: 'ST', position: { x: 100, y: 100 }, basePosition: { x: 100, y: 100 } },
            { id: 'B1', teamId: 'B', role: 'ST', position: { x: 110, y: 100 }, basePosition: { x: 110, y: 100 } }
        ];

        const core = new SimulationCore({
            initialPlayers: players,
            initialBall: { position: { x: 500, y: 300 } },
            tacticalEngine: new TestTacticalEngine(),
            behaviorEngine: new PlayerBehaviorEngine(),
            decisionEngine: new DecisionEngine(),
            physicsEngine: new PhysicsEngine({ playerSpeed: 120 }),
            collisionDetector: new CollisionDetector({ collisionDistance: 30 }),
            collisionStateTransition: new CollisionStateTransition({ collisionDistance: 30 })
        });

        const before = core.state.players.map(p => ({ id: p.id, x: p.position.x, y: p.position.y }));
        const result = core.tick();
        const after = result.state.players;

        expect(after).toHaveLength(2);

        const playerA = after.find(p => p.id === 'A1');
        const playerB = after.find(p => p.id === 'B1');

        const distance = Math.hypot(
            playerB.position.x - playerA.position.x,
            playerB.position.y - playerA.position.y
        );

        expect(distance).toBeGreaterThanOrEqual(30);
        expect(before[0].x).toBe(100);
        expect(before[1].x).toBe(110);
    });


    function createPlayer({ id = 1, teamId = 'A', role = 'CM', x = 100, y = 100 } = {}) {
        return { id, teamId, role, position: { x, y }, basePosition: { x, y } };
    }


    function createBall({ x = 500, y = 100 } = {}) {
        return { position: { x, y } };
    }


    class TestTacticalEngine {
        evaluate(state) {
            return state.players.map(player => ({
                playerId: player.id,
                tacticalTarget: { x: player.basePosition.x, y: player.basePosition.y }
            }));
        }
    }


    function createCore({ player, ball }) {
        const tacticalEngine = new TestTacticalEngine();
        const behaviorEngine = new PlayerBehaviorEngine({
            ballInfluenceDistance: 1000,
            pressDistance: 50,
            supportDistance: 180,
            forwardRunDistance: 120
        });
        const decisionEngine = new DecisionEngine();
        const physicsEngine = new PhysicsEngine({ playerSpeed: 120 });

        return new SimulationCore({
            initialPlayers: [player],
            initialBall: ball,
            tacticalEngine,
            behaviorEngine,
            decisionEngine,
            physicsEngine,
            timeStep: 1 / 60
        });
    }


    it('SimulationCore oluşturulabilmeli', () => {
        const core = createCore({ player: createPlayer(), ball: createBall() });
        expect(core).toBeInstanceOf(SimulationCore);
    });


    it('tek tick bütün engine zincirini çalıştırmalı', () => {
        const core = createCore({ player: createPlayer({ x: 100, y: 100 }), ball: createBall({ x: 500, y: 100 }) });
        const result = core.tick();
        expect(result).toHaveProperty('state');
        expect(result).toHaveProperty('tacticalSnapshots');
        expect(result).toHaveProperty('behaviorSnapshots');
        expect(result).toHaveProperty('possessionSnapshot');
        expect(result).toHaveProperty('passTargets');
        expect(result).toHaveProperty('decisions');
    });


    it('tactical snapshot üretilmeli', () => {
        const core = createCore({ player: createPlayer(), ball: createBall() });
        const result = core.tick();
        expect(result.tacticalSnapshots).toHaveLength(1);
        expect(result.tacticalSnapshots[0].playerId).toBe(1);
    });


    it('behavior snapshot üretilmeli', () => {
        const core = createCore({ player: createPlayer(), ball: createBall() });
        const result = core.tick();
        expect(result.behaviorSnapshots).toHaveLength(1);
        expect(result.behaviorSnapshots[0].playerId).toBe(1);
    });


    it('decision snapshot üretilmeli', () => {
        const core = createCore({ player: createPlayer(), ball: createBall() });
        const result = core.tick();
        expect(result.decisions).toHaveLength(1);
        expect(result.decisions[0].playerId).toBe(1);
    });


    it('PhysicsEngine state pozisyonunu değiştirmeli', () => {
        const core = createCore({ player: createPlayer({ x: 100, y: 100 }), ball: createBall({ x: 500, y: 100 }) });
        const result = core.tick();
        expect(result.state.players[0].position.x).toBeGreaterThan(100);
    });


    it('tick eski state nesnesini değiştirmemeli', () => {
        const core = createCore({ player: createPlayer({ x: 100, y: 100 }), ball: createBall({ x: 500, y: 100 }) });
        const oldState = core.state;
        const oldPosition = { x: oldState.players[0].position.x, y: oldState.players[0].position.y };
        core.tick();
        expect(oldState.players[0].position).toEqual(oldPosition);
        expect(core.state).not.toBe(oldState);
    });


    it('10 tick boyunca oyuncu hareket etmeye devam etmeli', () => {
        const core = createCore({ player: createPlayer({ x: 100, y: 100 }), ball: createBall({ x: 800, y: 100 }) });
        const positions = [];
        for (let i = 0; i < 10; i++) {
            core.tick();
            positions.push(core.state.players[0].position.x);
        }
        for (let i = 1; i < positions.length; i++) {
            expect(positions[i]).toBeGreaterThan(positions[i - 1]);
        }
    });


    it('60 tick sonunda oyuncu ilk pozisyonundan ileride olmalı', () => {
        const core = createCore({ player: createPlayer({ x: 100, y: 100 }), ball: createBall({ x: 800, y: 100 }) });
        for (let i = 0; i < 60; i++) core.tick();
        expect(core.state.players[0].position.x).toBeGreaterThan(100);
    });


    it('600 tick boyunca simülasyon çökmeden çalışmalı', () => {
        const core = createCore({ player: createPlayer({ x: 100, y: 100 }), ball: createBall({ x: 800, y: 100 }) });
        expect(() => { for (let i = 0; i < 600; i++) core.tick(); }).not.toThrow();
    });


    it('600 tick sonunda pozisyon sonlu bir sayı olmalı', () => {
        const core = createCore({ player: createPlayer({ x: 100, y: 100 }), ball: createBall({ x: 800, y: 100 }) });
        for (let i = 0; i < 600; i++) core.tick();
        const position = core.state.players[0].position;
        expect(Number.isFinite(position.x)).toBe(true);
        expect(Number.isFinite(position.y)).toBe(true);
    });


    it('aynı başlangıç koşulları deterministik sonuç üretmeli', () => {
        const core1 = createCore({ player: createPlayer({ x: 100, y: 100 }), ball: createBall({ x: 800, y: 100 }) });
        const core2 = createCore({ player: createPlayer({ x: 100, y: 100 }), ball: createBall({ x: 800, y: 100 }) });
        for (let i = 0; i < 60; i++) { core1.tick(); core2.tick(); }
        expect(core1.state.players[0].position).toEqual(core2.state.players[0].position);
    });


    it('ball state tick sonrasında korunmalı', () => {
        const ball = createBall({ x: 500, y: 250 });
        const core = createCore({ player: createPlayer(), ball });
        core.tick();
        expect(core.state.ball.position).toEqual({ x: 500, y: 250 });
    });


    it('oyuncu sayısı tick sonrasında korunmalı', () => {
        const player1 = createPlayer({ id: 1, x: 100, y: 100 });
        const player2 = createPlayer({ id: 2, x: 200, y: 200 });
        const core = new SimulationCore({
            initialPlayers: [player1, player2],
            initialBall: createBall({ x: 500, y: 100 }),
            tacticalEngine: new TestTacticalEngine(),
            behaviorEngine: new PlayerBehaviorEngine({ ballInfluenceDistance: 1000 }),
            decisionEngine: new DecisionEngine(),
            physicsEngine: new PhysicsEngine(),
            timeStep: 1 / 60
        });
        core.tick();
        expect(core.state.players).toHaveLength(2);
    });


    it('600 tick sonrasında oyuncu durduysa bunun sebebi PhysicsEngine değil hedefe ulaşması olmalı', () => {
        const core = createCore({ player: createPlayer({ x: 100, y: 100 }), ball: createBall({ x: 800, y: 100 }) });
        for (let i = 0; i < 600; i++) core.tick();
        const position = core.state.players[0].position;
        expect(Number.isFinite(position.x)).toBe(true);
        expect(Number.isFinite(position.y)).toBe(true);
        expect(position.x).toBeLessThanOrEqual(800);
    });


    function createPassCore() {
        const passer = createPlayer({ id: 7, teamId: 'A', role: 'CM', x: 100, y: 100 });
        const receiver = createPlayer({ id: 10, teamId: 'A', role: 'ST', x: 400, y: 100 });
        const opponent = createPlayer({ id: 20, teamId: 'B', role: 'CM', x: 130, y: 100 });

        const possessionStateTransition = new PossessionStateTransition();

        return new SimulationCore({
            initialPlayers: [passer, receiver, opponent],
            initialBall: { ownerId: 7, velocity: { x: 0, y: 0 }, position: { x: 100, y: 100 } },
            tacticalEngine: new TestTacticalEngine(),
            behaviorEngine: new PlayerBehaviorEngine({
                ballInfluenceDistance: 1000, pressDistance: 50,
                supportDistance: 180, forwardRunDistance: 120
            }),
            possessionEngine: new PossessionEngine({ controlRadius: 12 }),
            passTargetSelector: new PassTargetSelector(),
            decisionEngine: new DecisionEngine(),
            passExecutor: new PassExecutor({
                passEngine: new PassEngine(),
                possessionStateTransition
            }),
            physicsEngine: new PhysicsEngine({ playerSpeed: 120 }),
            timeStep: 1 / 60
        });
    }


    it('PASS entegrasyonunda possession snapshot üretilmeli', () => {
        const core = createPassCore();
        const result = core.tick();
        expect(result.possessionSnapshot).not.toBeNull();
        expect(result.possessionSnapshot.ownerId).toBe(7);
    });


    it('PASS entegrasyonunda receiver hedefi bulunmalı', () => {
        const core = createPassCore();
        const result = core.tick();
        expect(result.passTargets.length).toBeGreaterThan(0);
        expect(result.passTargets[0].receiverId).toBe(10);
    });


    it('SimulationCore PASS kararı üretmeli', () => {
        const core = createPassCore();
        const result = core.tick();
        const passDecision = result.decisions.find(d => d.playerId === 7);
        expect(passDecision).toBeDefined();
        expect(passDecision.action).toBe('PASS');
        expect(passDecision.receiverId).toBe(10);
    });


    it('SimulationCore PASS kararını gerçek Ball stateine uygulamalı', () => {
        const core = createPassCore();
        const oldState = core.state;
        const result = core.tick();
        expect(result.state).not.toBe(oldState);
        expect(result.state.ball.ownerId).toBeNull();
        expect(result.state.ball.velocity).toEqual({ x: 300, y: 0 });
    });


    it('PASS yapan oyuncu aynı tick içinde MOVE edilmemeli', () => {
        const core = createPassCore();
        const result = core.tick();
        const passer = result.state.players.find(p => p.id === 7);
        expect(passer.position).toEqual({ x: 100, y: 100 });
    });


    it('PASS yapan oyuncu dışındaki oyuncular PhysicsEngine tarafından işlenebilir', () => {
        const core = createPassCore();
        const result = core.tick();
        const receiver = result.state.players.find(p => p.id === 10);
        expect(receiver).toBeDefined();
        expect(Number.isFinite(receiver.position.x)).toBe(true);
        expect(Number.isFinite(receiver.position.y)).toBe(true);
    });


    it('PASS dependencyleri yoksa mevcut normal tick akışı korunmalı', () => {
        const core = createCore({ player: createPlayer({ id: 1, x: 100, y: 100 }), ball: createBall({ x: 800, y: 100 }) });
        const result = core.tick();
        expect(result.state.players[0].position.x).toBeGreaterThan(100);
        expect(result.decisions[0].action).toBe('MOVE');
    });


    function createPassPhysicsCore() {
        const passer = createPlayer({ id: 7, teamId: 'A', role: 'CM', x: 100, y: 100 });
        const receiver = createPlayer({ id: 10, teamId: 'A', role: 'ST', x: 400, y: 100 });
        const opponent = createPlayer({ id: 20, teamId: 'B', role: 'CM', x: 130, y: 100 });

        const possessionStateTransition = new PossessionStateTransition();

        return new SimulationCore({
            initialPlayers: [passer, receiver, opponent],
            initialBall: { ownerId: 7, velocity: { x: 0, y: 0 }, position: { x: 100, y: 100 } },
            tacticalEngine: new TestTacticalEngine(),
            behaviorEngine: new PlayerBehaviorEngine({
                ballInfluenceDistance: 1000, pressDistance: 50,
                supportDistance: 180, forwardRunDistance: 120
            }),
            possessionEngine: new PossessionEngine({ controlRadius: 12 }),
            passTargetSelector: new PassTargetSelector(),
            decisionEngine: new DecisionEngine(),
            passExecutor: new PassExecutor({
                passEngine: new PassEngine(),
                possessionStateTransition
            }),
            physicsEngine: new PhysicsEngine({ playerSpeed: 120 }),
            ballPhysics: new BallPhysics(),
            timeStep: 1 / 60
        });
    }


    it('PASS + BallPhysics aynı tick içinde top pozisyonunu değiştirmeli', () => {
        const core = createPassPhysicsCore();
        const result = core.tick();
        expect(result.state.ball.position.x).toBeCloseTo(105, 10);
        expect(result.state.ball.position.y).toBeCloseTo(100, 10);
        expect(result.state.ball.ownerId).toBeNull();
    });


    it('BallPhysics PASS velocity\'sini kullanmalı, eski velocity\'yi değil', () => {
        const core = createPassPhysicsCore();
        const result = core.tick();
        expect(result.state.ball.position.x).toBeGreaterThan(100);
        expect(result.state.ball.velocity.x).toBeCloseTo(300 * FRICTION, 10);
        expect(result.state.ball.velocity.y).toBeCloseTo(0, 10);
    });


    it('PASS sonrası Ball.velocity friction ile azalmalı', () => {
        const core = createPassPhysicsCore();
        const result = core.tick();
        expect(result.state.ball.velocity.x).toBeCloseTo(300 * FRICTION, 10);
        expect(result.state.ball.velocity.y).toBeCloseTo(0, 10);
    });


    it('ikinci tick\'te top hareket etmeye devam etmeli', () => {
        const core = createPassPhysicsCore();
        core.tick();
        const positionAfterFirst = { ...core.state.ball.position };
        core.tick();
        expect(core.state.ball.position.x).toBeGreaterThan(positionAfterFirst.x);
    });


    it('BallPhysics yoksa top hareket etmemeli', () => {
        const core = createPassCore();
        const result = core.tick();
        expect(result.state.ball.ownerId).toBeNull();
        expect(result.state.ball.position).toEqual({ x: 100, y: 100 });
    });


    it('PASS + BallPhysics sonrası diğer oyuncular PhysicsEngine tarafından işlenmeli', () => {
        const core = createPassPhysicsCore();
        const result = core.tick();
        const receiver = result.state.players.find(p => p.id === 10);
        expect(receiver).toBeDefined();
        expect(Number.isFinite(receiver.position.x)).toBe(true);
        expect(Number.isFinite(receiver.position.y)).toBe(true);
    });

});