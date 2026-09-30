// tests/simulationCoreShot.test.js

import { describe, it, expect } from 'vitest';

import { SimulationCore } from '../src/core/SimulationCore.js';
import { ShotEngine } from '../src/engine/ShotEngine.js';
import { ShotExecutor } from '../src/engine/ShotExecutor.js';
import { PossessionStateTransition } from '../src/engine/PossessionStateTransition.js';
import { PossessionEngine } from '../src/engine/PossessionEngine.js';
import { DecisionEngine } from '../src/engine/DecisionEngine.js';
import { PhysicsEngine } from '../src/engine/PhysicsEngine.js';
import { BallPhysics } from '../src/engine/BallPhysics.js';
import { PassEngine } from '../src/engine/PassEngine.js';
import { PassExecutor } from '../src/engine/PassExecutor.js';
import { PassTargetSelector } from '../src/engine/PassTargetSelector.js';


const FRICTION = 0.98;


describe('SimulationCore + ShotExecutor', () => {

    function createPlayer({ id, teamId = 'A', role = 'ST', x = 0, y = 0 } = {}) {
        return { id, teamId, role, position: { x, y }, basePosition: { x, y } };
    }


    class TestTacticalEngine {
        evaluate(state) {
            return state.players.map(player => ({
                playerId: player.id,
                tacticalTarget: { x: player.basePosition.x, y: player.basePosition.y }
            }));
        }
    }


    function createShotCore({ withShotExecutor = true } = {}) {
        const shooter = createPlayer({ id: 7, teamId: 'A', role: 'ST', x: 100, y: 100 });

        const possessionStateTransition = new PossessionStateTransition();

        return new SimulationCore({
            initialPlayers: [shooter],
            initialBall: { ownerId: 7, velocity: { x: 0, y: 0 }, position: { x: 100, y: 100 } },
            tacticalEngine: new TestTacticalEngine(),
            possessionEngine: new PossessionEngine({ controlRadius: 15 }),
            decisionEngine: new DecisionEngine(),
            passExecutor: new PassExecutor({
                passEngine: new PassEngine(),
                possessionStateTransition
            }),
            shotExecutor: withShotExecutor
                ? new ShotExecutor({
                    shotEngine: new ShotEngine(),
                    possessionStateTransition
                })
                : null,
            physicsEngine: new PhysicsEngine({ playerSpeed: 120 }),
            ballPhysics: new BallPhysics(),
            timeStep: 1 / 60
        });
    }


    function createShotDecision({ playerId = 7, shotType = 'GROUND' } = {}) {
        return {
            playerId,
            action: 'SHOT',
            duty: 'HOLD_POSITION',
            behavior: 'SUPPORT',
            target: { x: 0, y: 0 },
            shotType
        };
    }


    it('shotExecutor verilmezse mevcut davranış korunmalı', () => {
        const core = createShotCore({ withShotExecutor: false });
        const result = core.tick();
        expect(result).toBeDefined();
        expect(result.state).toBeDefined();
    });


    it('shotDecision yoksa top sahibi kalmalı', () => {
        const core = createShotCore();
        const result = core.tick();
        expect(result.state.ball.ownerId).toBe(7);
    });


    it('shotDecision varsa top sahipsiz olmalı', () => {
        const core = createShotCore();
        const result = core.tick({
            shotDecision: createShotDecision({ playerId: 7 }),
            targetPosition: { x: 1000, y: 100 }
        });
        expect(result.state.ball.ownerId).toBeNull();
    });


    it('targetPosition ShotIntent içine doğru aktarılmalı', () => {
        const core = createShotCore();
        const result = core.tick({
            shotDecision: createShotDecision({ playerId: 7 }),
            targetPosition: { x: 1000, y: 100 }
        });
        expect(result.state.ball.velocity.x).toBeCloseTo(500 * FRICTION, 10);
        expect(result.state.ball.velocity.y).toBeCloseTo(0, 10);
    });


    it('SHOT sonrası Ball.ownerId null olmalı', () => {
        const core = createShotCore();
        const result = core.tick({
            shotDecision: createShotDecision({ playerId: 7 }),
            targetPosition: { x: 1000, y: 100 }
        });
        expect(result.state.ball.ownerId).toBeNull();
    });


    it('SHOT sonrası Ball.velocity ShotIntent.velocity * friction olmalı', () => {
        const core = createShotCore();
        const result = core.tick({
            shotDecision: createShotDecision({ playerId: 7, shotType: 'LOB' }),
            targetPosition: { x: 1000, y: 100 }
        });
        expect(result.state.ball.velocity.x).toBeCloseTo(600 * FRICTION, 10);
        expect(result.state.ball.velocity.y).toBeCloseTo(0, 10);
    });


    it('SHOT sonrası BallPhysics topu hareket ettirmeli', () => {
        const core = createShotCore();
        const result = core.tick({
            shotDecision: createShotDecision({ playerId: 7 }),
            targetPosition: { x: 1000, y: 100 }
        });
        expect(result.state.ball.position.x).toBeGreaterThan(100);
        expect(result.state.ball.position.y).toBeCloseTo(100, 10);
    });


    it('shotDecision yoksa mevcut PASS/Physics akışı korunmalı', () => {
        const core = createShotCore();
        const initialX = core.state.players[0].position.x;
        const result = core.tick();
        expect(result.state.players[0].position.x).toBeGreaterThanOrEqual(initialX);
        expect(result.state.ball.ownerId).toBe(7);
    });


    it('PASS ve SHOT aynı tick\'te verilse bile efektif karar seti tek top aksiyonu içerir', () => {
        const core = createShotCore();
        const result = core.tick({
            shotDecision: createShotDecision({ playerId: 7 }),
            targetPosition: { x: 1000, y: 100 }
        });
        const topActions = result.decisions.filter(
            d => d.action === 'PASS' || d.action === 'SHOT'
        );
        expect(topActions.length).toBeLessThanOrEqual(1);
        expect(result.state.ball.ownerId).toBeNull();
    });


    it('shotDecision var ama targetPosition yoksa hata fırlatmalı', () => {
        const core = createShotCore();
        expect(() => {
            core.tick({
                shotDecision: createShotDecision({ playerId: 7 })
            });
        }).toThrow(TypeError);
    });


    it('tick orijinal state\'i mutate etmemeli', () => {
        const core = createShotCore();
        const oldState = core.state;
        const oldBallOwner = oldState.ball.ownerId;
        const oldBallVelocity = { ...oldState.ball.velocity };
        core.tick({
            shotDecision: createShotDecision({ playerId: 7 }),
            targetPosition: { x: 1000, y: 100 }
        });
        expect(oldState.ball.ownerId).toBe(oldBallOwner);
        expect(oldState.ball.velocity).toEqual(oldBallVelocity);
        expect(core.state).not.toBe(oldState);
    });


    it('aynı input deterministik sonuç üretmeli', () => {
        const coreA = createShotCore();
        const coreB = createShotCore();
        const options = {
            shotDecision: createShotDecision({ playerId: 7 }),
            targetPosition: { x: 1000, y: 100 }
        };
        const resultA = coreA.tick(options);
        const resultB = coreB.tick(options);
        expect(resultA.state.ball.ownerId).toBe(resultB.state.ball.ownerId);
        expect(resultA.state.ball.velocity).toEqual(resultB.state.ball.velocity);
        expect(resultA.state.ball.position).toEqual(resultB.state.ball.position);
    });

});