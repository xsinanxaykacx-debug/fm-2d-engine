// tests/simulationCoreInterception.test.js

import { describe, it, expect } from 'vitest';

import { SimulationCore } from '../src/core/SimulationCore.js';
import { TickOrchestrator } from '../src/engine/TickOrchestrator.js';
import { ReceiverDetector } from '../src/engine/ReceiverDetector.js';
import { ReceiverStateTransition } from '../src/engine/ReceiverStateTransition.js';
import { InterceptionDetector } from '../src/engine/InterceptionDetector.js';
import { InterceptionStateTransition } from '../src/engine/InterceptionStateTransition.js';
import { DecisionEngine } from '../src/engine/DecisionEngine.js';
import { PhysicsEngine } from '../src/engine/PhysicsEngine.js';
import { PossessionEngine } from '../src/engine/PossessionEngine.js';
import { PassTargetSelector } from '../src/engine/PassTargetSelector.js';
import { PassEngine } from '../src/engine/PassEngine.js';
import { PassExecutor } from '../src/engine/PassExecutor.js';
import { PossessionStateTransition } from '../src/engine/PossessionStateTransition.js';
import { BallPhysics } from '../src/engine/BallPhysics.js';


const FRICTION = 0.98;


describe('SimulationCore + TickOrchestrator + Interception', () => {

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
        const opponent = createPlayer({ id: 20, teamId: 'B', role: 'CM', x: 110, y: 100 });

        const possessionStateTransition = new PossessionStateTransition();

        return new SimulationCore({
            initialPlayers: [passer, receiver, opponent],
            initialBall: { ownerId: 7, velocity: { x: 0, y: 0 }, position: { x: 100, y: 100 } },
            tacticalEngine: new TestTacticalEngine(),
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


    it('PASS kararı oluşmalı', () => {
        const core = createSimulationCore();
        const result = core.tick();
        expect(result.passInfo.passerTeamId).toBe('A');
        expect(result.passInfo.receivingTeamId).toBe('A');
        expect(result.passInfo.targetReceiverId).toBe(10);
    });


    it('PASS sonrası top sahipsiz olmalı', () => {
        const core = createSimulationCore();
        const result = core.tick();
        expect(result.state.ball.ownerId).toBeNull();
    });


    it('PASS sonrası top velocity PASS velocity * friction olmalı', () => {
        const core = createSimulationCore();
        const result = core.tick();
        expect(result.state.ball.velocity.x).toBeCloseTo(300 * FRICTION, 10);
        expect(result.state.ball.velocity.y).toBeCloseTo(0, 10);
    });


    it('PASS sonrası top 105,100 konumuna ilerlemeli', () => {
        const core = createSimulationCore();
        const result = core.tick();
        expect(result.state.ball.position.x).toBeCloseTo(105, 10);
        expect(result.state.ball.position.y).toBeCloseTo(100, 10);
    });


    it('PASS sonrası rakip #20 interception adayı olmalı', () => {
        const core = createSimulationCore();
        const orchestrator = createTickOrchestrator();
        const coreResult = core.tick();
        const snapshot = orchestrator.interceptionDetector.evaluate(
            coreResult.state, coreResult.passInfo.passerTeamId
        );
        expect(snapshot.hasCandidate).toBe(true);
        expect(snapshot.interceptorId).toBe(20);
    });


    it('Interception noktası 110,100 olmalı', () => {
        const core = createSimulationCore();
        const orchestrator = createTickOrchestrator();
        const coreResult = core.tick();
        const snapshot = orchestrator.interceptionDetector.evaluate(
            coreResult.state, coreResult.passInfo.passerTeamId
        );
        expect(snapshot.interceptionPoint.x).toBeCloseTo(110, 10);
        expect(snapshot.interceptionPoint.y).toBeCloseTo(100, 10);
    });


    it('Receiver #10 da yörüngede olsa bile #20 seçilmeli', () => {
        const core = createSimulationCore();
        const orchestrator = createTickOrchestrator();
        const coreResult = core.tick();
        const snapshot = orchestrator.interceptionDetector.evaluate(
            coreResult.state, coreResult.passInfo.passerTeamId
        );
        expect(snapshot.interceptorId).toBe(20);
        expect(snapshot.timeToPoint)
            .toBeCloseTo(5 / (300 * FRICTION), 10);
    });


    it('TickOrchestrator interception sonucunu uygulamalı', () => {
        const core = createSimulationCore();
        const orchestrator = createTickOrchestrator();
        const coreResult = core.tick();
        const finalState = orchestrator.tick(coreResult.state, {
            passerTeamId: coreResult.passInfo.passerTeamId,
            receivingTeamId: coreResult.passInfo.receivingTeamId,
            targetReceiverId: coreResult.passInfo.targetReceiverId
        });
        expect(finalState.ball.ownerId).toBe(20);
    });


    it('Interception sonrası top velocity sıfır olmalı', () => {
        const core = createSimulationCore();
        const orchestrator = createTickOrchestrator();
        const coreResult = core.tick();
        const finalState = orchestrator.tick(coreResult.state, {
            passerTeamId: coreResult.passInfo.passerTeamId,
            receivingTeamId: coreResult.passInfo.receivingTeamId,
            targetReceiverId: coreResult.passInfo.targetReceiverId
        });
        expect(finalState.ball.velocity).toEqual({ x: 0, y: 0 });
    });


    it('Interception sonrası top 110,100 konumunda olmalı', () => {
        const core = createSimulationCore();
        const orchestrator = createTickOrchestrator();
        const coreResult = core.tick();
        const finalState = orchestrator.tick(coreResult.state, {
            passerTeamId: coreResult.passInfo.passerTeamId,
            receivingTeamId: coreResult.passInfo.receivingTeamId,
            targetReceiverId: coreResult.passInfo.targetReceiverId
        });
        expect(finalState.ball.position.x).toBeCloseTo(110, 10);
        expect(finalState.ball.position.y).toBeCloseTo(100, 10);
    });


    it('Interception gerçekleştiğinde receiver topu almamalı', () => {
        const core = createSimulationCore();
        const orchestrator = createTickOrchestrator();
        const coreResult = core.tick();
        const finalState = orchestrator.tick(coreResult.state, {
            passerTeamId: coreResult.passInfo.passerTeamId,
            receivingTeamId: coreResult.passInfo.receivingTeamId,
            targetReceiverId: coreResult.passInfo.targetReceiverId
        });
        expect(finalState.ball.ownerId).toBe(20);
        expect(finalState.ball.ownerId).not.toBe(10);
    });


    it('Aynı input deterministik interception sonucu üretmeli', () => {
        const core1 = createSimulationCore();
        const core2 = createSimulationCore();
        const orchestrator1 = createTickOrchestrator();
        const orchestrator2 = createTickOrchestrator();
        const result1 = core1.tick();
        const result2 = core2.tick();
        const final1 = orchestrator1.tick(result1.state, {
            passerTeamId: result1.passInfo.passerTeamId,
            receivingTeamId: result1.passInfo.receivingTeamId,
            targetReceiverId: result1.passInfo.targetReceiverId
        });
        const final2 = orchestrator2.tick(result2.state, {
            passerTeamId: result2.passInfo.passerTeamId,
            receivingTeamId: result2.passInfo.receivingTeamId,
            targetReceiverId: result2.passInfo.targetReceiverId
        });
        expect(final1.ball).toEqual(final2.ball);
        expect(final1.ball.ownerId).toBe(20);
    });

});