// tests/simulationCoreReceiver.test.js

import { describe, it, expect } from 'vitest';

import { SimulationCore } from '../src/core/SimulationCore.js';
import { TickOrchestrator } from '../src/engine/TickOrchestrator.js';
import { ReceiverDetector } from '../src/engine/ReceiverDetector.js';
import { ReceiverStateTransition } from '../src/engine/ReceiverStateTransition.js';
import { InterceptionDetector } from '../src/engine/InterceptionDetector.js';
import { InterceptionStateTransition } from '../src/engine/InterceptionStateTransition.js';
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


describe('SimulationCore + TickOrchestrator + Receiver', () => {

    function createPlayer({ id, teamId = 'A', role = 'CM', x = 0, y = 0 } = {}) {
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


    function createSimulationCore() {
        const passer = createPlayer({ id: 7, teamId: 'A', role: 'CM', x: 100, y: 100 });
        const receiver = createPlayer({ id: 10, teamId: 'A', role: 'ST', x: 112, y: 100 });
        const opponent = createPlayer({ id: 20, teamId: 'B', role: 'CM', x: 130, y: 130 });

        const possessionStateTransition = new PossessionStateTransition();

        return new SimulationCore({
            initialPlayers: [passer, receiver, opponent],
            initialBall: { ownerId: 7, velocity: { x: 0, y: 0 }, position: { x: 100, y: 100 } },
            tacticalEngine: new TestTacticalEngine(),
            behaviorEngine: new PlayerBehaviorEngine({
                ballInfluenceDistance: 1000, pressDistance: 50,
                supportDistance: 180, forwardRunDistance: 120
            }),
            possessionEngine: new PossessionEngine({ controlRadius: 15 }),
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


    function createTickOrchestrator() {
        return new TickOrchestrator({
            interceptionDetector: new InterceptionDetector(),
            interceptionStateTransition: new InterceptionStateTransition(),
            receiverDetector: new ReceiverDetector(),
            receiverStateTransition: new ReceiverStateTransition()
        });
    }


    it('PASS olduğunda passInfo dolu olmalı', () => {
        const core = createSimulationCore();
        const result = core.tick();
        expect(result.passInfo.receivingTeamId).toBe('A');
        expect(result.passInfo.targetReceiverId).toBe(10);
    });


    it('PASS olmadığında passInfo null olmalı', () => {
        const core = createSimulationCore();
        core.setState(
            core.state.nextState(
                core.state.players,
                { ownerId: null, velocity: { x: 0, y: 0 }, position: { x: 500, y: 300 } }
            )
        );
        const result = core.tick();
        expect(result.passInfo.receivingTeamId).toBeNull();
        expect(result.passInfo.targetReceiverId).toBeNull();
    });


    it('tick 1 sonunda Ball.ownerId null olmalı', () => {
        const core = createSimulationCore();
        const result = core.tick();
        expect(result.state.ball.ownerId).toBeNull();
    });


    it('tick 1 sonunda Ball.velocity PASS velocity * friction olmalı', () => {
        const core = createSimulationCore();
        const result = core.tick();
        expect(result.state.ball.velocity.x).toBeCloseTo(300 * FRICTION, 10);
        expect(result.state.ball.velocity.y).toBeCloseTo(0, 10);
    });


    it('tick 1 sonunda Ball.position (105, 100) olmalı', () => {
        const core = createSimulationCore();
        const result = core.tick();
        expect(result.state.ball.position.x).toBeCloseTo(105, 10);
        expect(result.state.ball.position.y).toBeCloseTo(100, 10);
    });


    it('TickOrchestrator receiver topu yakalamalı', () => {
        const core = createSimulationCore();
        const orchestrator = createTickOrchestrator();
        const coreResult = core.tick();
        const finalState = orchestrator.tick(coreResult.state, {
            receivingTeamId: coreResult.passInfo.receivingTeamId,
            targetReceiverId: coreResult.passInfo.targetReceiverId
        });
        expect(finalState.ball.ownerId).toBe(10);
    });


    it('Receiver yakaladıktan sonra Ball.velocity sıfır olmalı', () => {
        const core = createSimulationCore();
        const orchestrator = createTickOrchestrator();
        const coreResult = core.tick();
        const finalState = orchestrator.tick(coreResult.state, {
            receivingTeamId: coreResult.passInfo.receivingTeamId,
            targetReceiverId: coreResult.passInfo.targetReceiverId
        });
        expect(finalState.ball.velocity).toEqual({ x: 0, y: 0 });
    });


    it('Receiver yakaladıktan sonra Ball.position receiver pozisyonunda olmalı', () => {
        const core = createSimulationCore();
        const orchestrator = createTickOrchestrator();
        const coreResult = core.tick();
        const finalState = orchestrator.tick(coreResult.state, {
            receivingTeamId: coreResult.passInfo.receivingTeamId,
            targetReceiverId: coreResult.passInfo.targetReceiverId
        });
        const receiver = finalState.players.find(p => p.id === 10);
        expect(finalState.ball.position).toEqual(receiver.position);
    });


    it('Receiver yakaladıktan sonra top sahibi receiver olmalı', () => {
        const core = createSimulationCore();
        const orchestrator = createTickOrchestrator();
        const coreResult = core.tick();
        const stateAfterOrchestrator = orchestrator.tick(coreResult.state, {
            receivingTeamId: coreResult.passInfo.receivingTeamId,
            targetReceiverId: coreResult.passInfo.targetReceiverId
        });
        expect(stateAfterOrchestrator.ball.ownerId).toBe(10);
        expect(stateAfterOrchestrator.ball.velocity).toEqual({ x: 0, y: 0 });
        const receiver = stateAfterOrchestrator.players.find(p => p.id === 10);
        expect(stateAfterOrchestrator.ball.position).toEqual(receiver.position);
    });


    it('PASS yoksa TickOrchestrator interception/receiver denemez', () => {
        const core = createSimulationCore();
        const orchestrator = createTickOrchestrator();
        const coreResult = core.tick();
        expect(coreResult.passInfo.targetReceiverId).toBe(10);
        const finalState = orchestrator.tick(coreResult.state, {
            receivingTeamId: null,
            targetReceiverId: null
        });
        expect(finalState.ball.ownerId).toBeNull();
    });


    it('opponent yörünge dışındaysa interception olmamalı', () => {
        const core = createSimulationCore();
        const orchestrator = createTickOrchestrator();
        const coreResult = core.tick();
        const finalState = orchestrator.tick(coreResult.state, {
            receivingTeamId: coreResult.passInfo.receivingTeamId,
            targetReceiverId: coreResult.passInfo.targetReceiverId
        });
        expect(finalState.ball.ownerId).toBe(10);
        expect(finalState.ball.ownerId).not.toBe(20);
    });


    it('aynı input deterministik sonuç üretmeli', () => {
        const core1 = createSimulationCore();
        const core2 = createSimulationCore();
        const orchestrator1 = createTickOrchestrator();
        const orchestrator2 = createTickOrchestrator();
        const coreResult1 = core1.tick();
        const coreResult2 = core2.tick();
        const final1 = orchestrator1.tick(coreResult1.state, {
            receivingTeamId: coreResult1.passInfo.receivingTeamId,
            targetReceiverId: coreResult1.passInfo.targetReceiverId
        });
        const final2 = orchestrator2.tick(coreResult2.state, {
            receivingTeamId: coreResult2.passInfo.receivingTeamId,
            targetReceiverId: coreResult2.passInfo.targetReceiverId
        });
        expect(final1.ball).toEqual(final2.ball);
    });

});