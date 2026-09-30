// tests/simulationCoreAutoShot.test.js

import { describe, it, expect, vi, afterEach } from 'vitest';

import { SimulationCore } from '../src/core/SimulationCore.js';
import { TacticalEngine } from '../src/engine/TacticalEngine.js';
import { PlayerBehaviorEngine } from '../src/engine/PlayerBehaviorEngine.js';
import { PossessionEngine } from '../src/engine/PossessionEngine.js';
import { PassTargetSelector } from '../src/engine/PassTargetSelector.js';
import { ShotDecisionEngine } from '../src/engine/ShotDecisionEngine.js';
import { DecisionEngine } from '../src/engine/DecisionEngine.js';
import { PassEngine } from '../src/engine/PassEngine.js';
import { PassExecutor } from '../src/engine/PassExecutor.js';
import { ShotEngine } from '../src/engine/ShotEngine.js';
import { ShotExecutor } from '../src/engine/ShotExecutor.js';
import { PossessionStateTransition } from '../src/engine/PossessionStateTransition.js';
import { PhysicsEngine } from '../src/engine/PhysicsEngine.js';
import { BallPhysics } from '../src/engine/BallPhysics.js';
import { PitchContext } from '../src/engine/PitchContext.js';


describe('SimulationCore — Auto Shot', () => {

    afterEach(() => {
        vi.restoreAllMocks();
    });


    // ------------------------------------------------------------
    // YARDIMCI FONKSİYONLAR
    // ------------------------------------------------------------

    function createPlayer({
        id,
        teamId = 'HOME',
        role = 'ST',
        x = 0,
        y = 0
    } = {}) {

        return {
            id,
            teamId,
            role,
            position: { x, y },
            basePosition: { x, y }
        };
    }


    function createState({
        shooterX = 80,
        shooterY = 34,
        shooterTeamId = 'HOME'
    } = {}) {

        const shooter = createPlayer({
            id: 7,
            teamId: shooterTeamId,
            role: 'ST',
            x: shooterX,
            y: shooterY
        });

        const opponent = createPlayer({
            id: 99,
            teamId: 'AWAY',
            role: 'CB',
            x: 200,
            y: 34
        });

        return {
            players: [shooter, opponent],
            ball: {
                ownerId: 7,
                position: { x: shooterX, y: shooterY },
                velocity: { x: 0, y: 0 }
            }
        };
    }


    function createFullCore({
        withShotDecisionEngine = true
    } = {}) {

        const pitchContext = new PitchContext();

        const tacticalEngine = new TacticalEngine({ pitchContext });

        const behaviorEngine = new PlayerBehaviorEngine({
            ballInfluenceDistance: 1000,
            pressDistance: 50,
            supportDistance: 180,
            forwardRunDistance: 120
        });

        const possessionEngine = new PossessionEngine({
            controlRadius: 15
        });

        const passTargetSelector = new PassTargetSelector();

        const shotDecisionEngine = withShotDecisionEngine
            ? new ShotDecisionEngine({ pitchContext })
            : null;

        const decisionEngine = new DecisionEngine();

        const passEngine = new PassEngine();
        const possessionStateTransition = new PossessionStateTransition();
        const passExecutor = new PassExecutor({
            passEngine,
            possessionStateTransition
        });

        const shotEngine = new ShotEngine();
        const shotExecutor = new ShotExecutor({
            shotEngine,
            possessionStateTransition
        });

        const physicsEngine = new PhysicsEngine({
            playerSpeed: 120
        });

        const ballPhysics = new BallPhysics();

        const state = createState();

        return new SimulationCore({
            initialPlayers: state.players,
            initialBall: state.ball,

            tacticalEngine,
            behaviorEngine,
            possessionEngine,
            passTargetSelector,
            shotDecisionEngine,
            decisionEngine,
            passExecutor,
            shotExecutor,
            physicsEngine,
            ballPhysics,

            timeStep: 1 / 60
        });
    }


    // ------------------------------------------------------------
    // 1 — SHOTDECISIONENGINE KONSTRÜKTÖRDE KABUL EDİLİR
    // ------------------------------------------------------------

    it('shotDecisionEngine constructor üzerinden kabul edilmeli', () => {

        const core = createFullCore();

        expect(core.shotDecisionEngine)
            .toBeInstanceOf(ShotDecisionEngine);
    });


    // ------------------------------------------------------------
    // 2 — VERİLMEZSE MEVCUT DAVRANIŞ
    // ------------------------------------------------------------

    it('shotDecisionEngine verilmezse shotDecisions boş olmalı', () => {

        const core = createFullCore({
            withShotDecisionEngine: false
        });

        const result = core.tick();

        expect(result.shotDecisions)
            .toEqual([]);
    });


    // ------------------------------------------------------------
    // 3 — SHOTDECISIONENGINE.EVALUATE ÇAĞRILIR
    // ------------------------------------------------------------

    it('shotDecisionEngine.evaluate() tick içinde çağrılmalı', () => {

        const spy = vi.spyOn(
            ShotDecisionEngine.prototype,
            'evaluate'
        );

        const core = createFullCore();

        core.tick();

        expect(spy).toHaveBeenCalledTimes(1);
    });


    // ------------------------------------------------------------
    // 4 — SHOTDECISIONS DECISIONENGINE'E AKTARILIR
    // ------------------------------------------------------------

    it('shotDecisions DecisionEngine çıktısına yansımalı', () => {

        const core = createFullCore();

        const result = core.tick();

        expect(result.shotDecisions.length)
            .toBeGreaterThan(0);

        const playerDecision =
            result.decisions.find(
                d => d.playerId === 7
            );

        expect(playerDecision).toBeDefined();
    });


    // ------------------------------------------------------------
    // 5 — UYGUN OYUNCU OTOMATİK SHOT ALIR
    // ------------------------------------------------------------

    it('uygun oyuncu otomatik SHOT üretmeli', () => {

        const core = createFullCore();

        const result = core.tick();

        const shooterDecision =
            result.decisions.find(
                d => d.playerId === 7
            );

        expect(shooterDecision.action)
            .toBe('SHOT');
    });


    // ------------------------------------------------------------
    // 6 — SHOT KARARI DOĞRU OYUNCUYA AİT
    // ------------------------------------------------------------

    it('SHOT kararı sadece uygun oyuncuya ait olmalı', () => {

        const core = createFullCore();

        const result = core.tick();

        const opponentDecision =
            result.decisions.find(
                d => d.playerId === 99
            );

        expect(opponentDecision.action)
            .not.toBe('SHOT');
    });


    // ------------------------------------------------------------
    // 7 — TARGETPOSITION KORUNUR
    // ------------------------------------------------------------

    it('SHOT kararında targetPosition kale merkezi olmalı', () => {

        const core = createFullCore();

        const result = core.tick();

        const shooterDecision =
            result.decisions.find(
                d => d.playerId === 7
            );

        expect(shooterDecision.targetPosition)
            .toEqual({ x: 105, y: 34 });
    });


    // ------------------------------------------------------------
    // 8 — SHOTTYPE KORUNUR
    // ------------------------------------------------------------

    it('SHOT kararında shotType GROUND olmalı', () => {

        const core = createFullCore();

        const result = core.tick();

        const shooterDecision =
            result.decisions.find(
                d => d.playerId === 7
            );

        expect(shooterDecision.shotType)
            .toBe('GROUND');
    });


    // ------------------------------------------------------------
    // 9 — UYGUN OLMAYAN OYUNCU OTOMATİK SHOT ALMAZ
    // ------------------------------------------------------------

    it('kale çok uzaksa otomatik SHOT oluşmamalı', () => {

        const pitchContext = new PitchContext();

        const tacticalEngine =
            new TacticalEngine({ pitchContext });

        const behaviorEngine =
            new PlayerBehaviorEngine({
                ballInfluenceDistance: 1000
            });

        const possessionEngine =
            new PossessionEngine({ controlRadius: 15 });

        const passTargetSelector =
            new PassTargetSelector();

        const shotDecisionEngine =
            new ShotDecisionEngine({
                pitchContext,
                shootRange: 10
            });

        const decisionEngine = new DecisionEngine();

        const passEngine = new PassEngine();
        const possessionStateTransition =
            new PossessionStateTransition();
        const passExecutor = new PassExecutor({
            passEngine,
            possessionStateTransition
        });

        const shotEngine = new ShotEngine();
        const shotExecutor = new ShotExecutor({
            shotEngine,
            possessionStateTransition
        });

        const physicsEngine = new PhysicsEngine();
        const ballPhysics = new BallPhysics();

        const state = createState();

        const core = new SimulationCore({
            initialPlayers: state.players,
            initialBall: state.ball,
            tacticalEngine,
            behaviorEngine,
            possessionEngine,
            passTargetSelector,
            shotDecisionEngine,
            decisionEngine,
            passExecutor,
            shotExecutor,
            physicsEngine,
            ballPhysics,
            timeStep: 1 / 60
        });

        const result = core.tick();

        const shooterDecision =
            result.decisions.find(
                d => d.playerId === 7
            );

        expect(shooterDecision.action)
            .not.toBe('SHOT');
    });


    // ------------------------------------------------------------
    // 10 — MANUEL OPTIONS.SHOTDECISION KORUNUR
    // ------------------------------------------------------------

    it('options.shotDecision hâlâ çalışmalı', () => {

        const core = createFullCore({
            withShotDecisionEngine: false
        });

        const result = core.tick({
            shotDecision: {
                playerId: 7,
                action: 'SHOT',
                shotType: 'GROUND'
            },
            targetPosition: { x: 1000, y: 100 }
        });

        const shooterDecision =
            result.decisions.find(
                d => d.playerId === 7
            );

        expect(shooterDecision.action)
            .toBe('SHOT');
    });


    // ------------------------------------------------------------
    // 11 — OTOMATİK SHOT → SHOTEXECUTOR ZİNCİRİ
    // ------------------------------------------------------------

    it('otomatik SHOT ShotExecutor zincirine ulaşmalı', () => {

        const core = createFullCore();

        const result = core.tick();

        expect(result.state.ball.ownerId)
            .toBeNull();
    });


    // ------------------------------------------------------------
    // 12 — BALLPHYSICS HAREKETİ
    // ------------------------------------------------------------

    it('otomatik SHOT sonrası top hareket etmeli', () => {

        const core = createFullCore();

        const initialBallX =
            core.state.ball.position.x;

        const result = core.tick();

        expect(result.state.ball.position.x)
            .toBeGreaterThan(initialBallX);
    });


    // ------------------------------------------------------------
    // 13 — MANUEL ENJEKSİYON YOKKEN MEVCUT DAVRANIŞ
    // ------------------------------------------------------------

    it('shotDecisionEngine yoksa mevcut PASS/MOVE davranışı korunmalı', () => {

        const core = createFullCore({
            withShotDecisionEngine: false
        });

        const result = core.tick();

        const shooterDecision =
            result.decisions.find(
                d => d.playerId === 7
            );

        expect(shooterDecision.action)
            .not.toBe('SHOT');

        expect(['MOVE', 'NONE', 'PASS'])
            .toContain(shooterDecision.action);
    });


    // ------------------------------------------------------------
    // 14 — STATE MUTATE EDİLMEZ
    // ------------------------------------------------------------

    it('tick orijinal state\'i mutate etmemeli', () => {

        const core = createFullCore();

        const oldState = core.state;
        const oldBallOwner = oldState.ball.ownerId;

        core.tick();

        expect(oldState.ball.ownerId)
            .toBe(oldBallOwner);

        expect(core.state)
            .not.toBe(oldState);
    });


    // ------------------------------------------------------------
    // 15 — DETERMİNİZM
    // ------------------------------------------------------------

    it('aynı input deterministik sonuç üretmeli', () => {

        const coreA = createFullCore();
        const coreB = createFullCore();

        const resultA = coreA.tick();
        const resultB = coreB.tick();

        expect(resultA.state.ball)
            .toEqual(resultB.state.ball);

        expect(resultA.shotDecisions)
            .toEqual(resultB.shotDecisions);
    });

});