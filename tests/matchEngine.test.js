// tests/matchEngine.test.js

import { describe, it, expect, vi, afterEach } from 'vitest';

import { MatchEngine } from '../src/core/MatchEngine.js';
import { SimulationCore } from '../src/core/SimulationCore.js';

import {
    PlayerBehaviorEngine
} from '../src/engine/PlayerBehaviorEngine.js';

import {
    DecisionEngine
} from '../src/engine/DecisionEngine.js';

import {
    PhysicsEngine
} from '../src/engine/PhysicsEngine.js';

import {
    CollisionDetector
} from '../src/engine/CollisionDetector.js';

import {
    CollisionStateTransition
} from '../src/engine/CollisionStateTransition.js';

import {
    TickOrchestrator
} from '../src/engine/TickOrchestrator.js';


/*
 * ---------------------------------------------------------
 * TEST TACTICAL ENGINE
 * ---------------------------------------------------------
 */

class TestTacticalEngine {

    evaluate(state) {

        return state.players.map(player => ({
            playerId: player.id,

            tacticalTarget: {
                x: player.basePosition.x + 100,
                y: player.basePosition.y
            }
        }));
    }
}


/*
 * ---------------------------------------------------------
 * MATCH ENGINE FACTORY
 * ---------------------------------------------------------
 */

function createEngine() {

    const players = [
        {
            id: 'A1',
            teamId: 'A',
            role: 'ST',

            position: {
                x: 100,
                y: 200
            },

            basePosition: {
                x: 100,
                y: 200
            }
        },

        {
            id: 'B1',
            teamId: 'B',
            role: 'ST',

            position: {
                x: 700,
                y: 200
            },

            basePosition: {
                x: 700,
                y: 200
            }
        }
    ];


    const simulationCore =
        new SimulationCore({

            initialPlayers:
                players,

            initialBall: {
                ownerId: null,

                position: {
                    x: 400,
                    y: 300
                }
            },

            tacticalEngine:
                new TestTacticalEngine(),

            behaviorEngine:
                new PlayerBehaviorEngine(),

            decisionEngine:
                new DecisionEngine(),

            physicsEngine:
                new PhysicsEngine({
                    playerSpeed: 120
                }),

            collisionDetector:
                new CollisionDetector({
                    collisionDistance: 30
                }),

            collisionStateTransition:
                new CollisionStateTransition({
                    collisionDistance: 30
                }),

            timeStep:
                1 / 60
        });


    return new MatchEngine({

        simulationCore,

        timeStep:
            1 / 60
    });
}


/*
 * ---------------------------------------------------------
 * TICK ORCHESTRATOR TEST DOUBLE
 * ---------------------------------------------------------
 */

function createTickOrchestrator({
    interceptionHasCandidate = false,
    interceptionOwnerId = null
} = {}) {

    const interceptionDetector = {

        evaluate(state) {

            return {
                hasCandidate:
                    interceptionHasCandidate,

                playerId:
                    interceptionOwnerId
            };
        }
    };


    const interceptionStateTransition = {

        apply(ball, snapshot) {

            if (
                !snapshot ||
                !snapshot.hasCandidate
            ) {
                return ball;
            }

            return {
                ...ball,

                ownerId:
                    snapshot.playerId
            };
        }
    };


    const receiverDetector = {

        evaluate() {

            return {
                hasReceiver: false
            };
        }
    };


    const receiverStateTransition = {

        apply(state) {

            return state;
        }
    };


    return new TickOrchestrator({

        interceptionDetector,

        interceptionStateTransition,

        receiverDetector,

        receiverStateTransition
    });
}


/*
 * ---------------------------------------------------------
 * TESTS
 * ---------------------------------------------------------
 */

describe(
    'MatchEngine — Maç Motoru',
    () => {

        afterEach(() => {
            vi.restoreAllMocks();
        });


        it(
            'motor oluşturulabilmeli',
            () => {

                const engine =
                    createEngine();


                expect(engine)
                    .toBeInstanceOf(
                        MatchEngine
                    );


                expect(
                    engine.tickCount
                ).toBe(0);


                expect(
                    engine.elapsedTime
                ).toBe(0);


                expect(
                    engine.running
                ).toBe(false);
            }
        );


        it(
            'tek tick çalıştırabilmeli',
            () => {

                const engine =
                    createEngine();


                const result =
                    engine.tick();


                expect(result)
                    .toBeDefined();


                expect(result.state)
                    .toBe(engine.state);


                expect(
                    engine.tickCount
                ).toBe(1);
            }
        );


        it(
            'tick sayısını doğru tutmalı',
            () => {

                const engine =
                    createEngine();


                engine.runTicks(10);


                expect(
                    engine.tickCount
                ).toBe(10);
            }
        );


        it(
            '60 tick yaklaşık 1 saniyelik simülasyon üretmeli',
            () => {

                const engine =
                    createEngine();


                engine.runTicks(60);


                expect(
                    engine.tickCount
                ).toBe(60);


                expect(
                    engine.elapsedTime
                ).toBeCloseTo(
                    1,
                    10
                );
            }
        );


        it(
            '10 saniyelik simülasyon çalıştırabilmeli',
            () => {

                const engine =
                    createEngine();


                engine.runForSeconds(10);


                expect(
                    engine.tickCount
                ).toBe(600);


                expect(
                    engine.elapsedTime
                ).toBeCloseTo(
                    10,
                    10
                );
            }
        );


        it(
            'oyuncular fizik motoru üzerinden hareket etmeli',
            () => {

                const engine =
                    createEngine();


                const initialX =
                    engine
                        .state
                        .players[0]
                        .position
                        .x;


                engine.runTicks(60);


                const finalX =
                    engine
                        .state
                        .players[0]
                        .position
                        .x;


                expect(finalX)
                    .toBeGreaterThan(
                        initialX
                    );
            }
        );


        it(
            'eski state değiştirilmemeli',
            () => {

                const engine =
                    createEngine();


                const oldState =
                    engine.state;


                const oldX =
                    oldState
                        .players[0]
                        .position
                        .x;


                engine.tick();


                expect(
                    oldState
                        .players[0]
                        .position
                        .x
                ).toBe(oldX);


                expect(
                    engine.state
                ).not.toBe(oldState);
            }
        );


        it(
            'aynı başlangıç koşulları deterministik olmalı',
            () => {

                const engineA =
                    createEngine();

                const engineB =
                    createEngine();


                engineA.runTicks(600);

                engineB.runTicks(600);


                expect(
                    engineA.state
                ).toEqual(
                    engineB.state
                );
            }
        );


        it(
            'oyuncu sayısı maç boyunca korunmalı',
            () => {

                const engine =
                    createEngine();


                engine.runTicks(600);


                expect(
                    engine.state.players
                ).toHaveLength(2);
            }
        );


        it(
            'oyuncu pozisyonları sonlu kalmalı',
            () => {

                const engine =
                    createEngine();


                engine.runTicks(600);


                for (
                    const player
                    of engine.state.players
                ) {

                    expect(
                        Number.isFinite(
                            player.position.x
                        )
                    ).toBe(true);


                    expect(
                        Number.isFinite(
                            player.position.y
                        )
                    ).toBe(true);
                }
            }
        );


        it(
            'start motoru çalışır duruma getirmeli',
            () => {

                const engine =
                    createEngine();


                expect(
                    engine.start()
                ).toBe(true);


                expect(
                    engine.running
                ).toBe(true);
            }
        );


        it(
            'çalışan motor tekrar start edilmemeli',
            () => {

                const engine =
                    createEngine();


                engine.start();


                expect(
                    engine.start()
                ).toBe(false);
            }
        );


        it(
            'stop motoru durdurmalı',
            () => {

                const engine =
                    createEngine();


                engine.start();


                expect(
                    engine.stop()
                ).toBe(true);


                expect(
                    engine.running
                ).toBe(false);
            }
        );


        it(
            'çalışmayan motor tekrar stop edilmemeli',
            () => {

                const engine =
                    createEngine();


                expect(
                    engine.stop()
                ).toBe(false);
            }
        );


        it(
            'reset motor sayaçlarını sıfırlamalı',
            () => {

                const engine =
                    createEngine();


                engine.start();

                engine.runTicks(100);


                engine.reset();


                expect(
                    engine.tickCount
                ).toBe(0);


                expect(
                    engine.elapsedTime
                ).toBe(0);


                expect(
                    engine.running
                ).toBe(false);
            }
        );


        it(
            'uzun simülasyonda çökmemeli',
            () => {

                const engine =
                    createEngine();


                expect(() => {

                    engine.runTicks(3600);

                }).not.toThrow();
            }
        );


        /*
         * -------------------------------------------------
         * TICK ORCHESTRATOR ENTEGRASYON TESTLERİ
         * -------------------------------------------------
         */


        it(
            'TickOrchestrator MatchEngine içinde çalışmalı',
            () => {

                const engine =
                    createEngine();


                const orchestrator =
                    createTickOrchestrator();


                const integratedEngine =
                    new MatchEngine({

                        simulationCore:
                            engine.simulationCore,

                        tickOrchestrator:
                            orchestrator,

                        timeStep:
                            1 / 60
                    });


                const oldState =
                    integratedEngine.state;


                const result =
                    integratedEngine.tick();


                expect(result)
                    .toBeDefined();


                expect(result.state)
                    .toBe(
                        integratedEngine.state
                    );


                expect(
                    integratedEngine.state
                ).not.toBe(oldState);


                expect(
                    integratedEngine.tickCount
                ).toBe(1);
            }
        );


        it(
            'TickOrchestrator sonucu MatchEngine state içine yazılmalı',
            () => {

                const engine =
                    createEngine();


                const orchestrator =
                    createTickOrchestrator({

                        interceptionHasCandidate:
                            true,

                        interceptionOwnerId:
                            'A1'
                    });


                const integratedEngine =
                    new MatchEngine({

                        simulationCore:
                            engine.simulationCore,

                        tickOrchestrator:
                            orchestrator,

                        timeStep:
                            1 / 60
                    });


                integratedEngine.tick({

                    passerTeamId:
                        'A',

                    receivingTeamId:
                        'A'
                });


                expect(
                    integratedEngine
                        .state
                        .ball
                        .ownerId
                ).toBe('A1');
            }
        );


        it(
            'TickOrchestrator kullanılmadığında mevcut SimulationCore zinciri çalışmalı',
            () => {

                const engine =
                    createEngine();


                const initialX =
                    engine
                        .state
                        .players[0]
                        .position
                        .x;


                engine.runTicks(60);


                const finalX =
                    engine
                        .state
                        .players[0]
                        .position
                        .x;


                expect(finalX)
                    .toBeGreaterThan(
                        initialX
                    );


                expect(
                    engine.tickCount
                ).toBe(60);
            }
        );


        it(
            'TickOrchestrator ile uzun simülasyon deterministik çalışmalı',
            () => {

                const engineA =
                    createEngine();

                const engineB =
                    createEngine();


                const orchestratorA =
                    createTickOrchestrator();

                const orchestratorB =
                    createTickOrchestrator();


                const matchA =
                    new MatchEngine({

                        simulationCore:
                            engineA.simulationCore,

                        tickOrchestrator:
                            orchestratorA,

                        timeStep:
                            1 / 60
                    });


                const matchB =
                    new MatchEngine({

                        simulationCore:
                            engineB.simulationCore,

                        tickOrchestrator:
                            orchestratorB,

                        timeStep:
                            1 / 60
                    });


                matchA.runTicks(600);

                matchB.runTicks(600);


                expect(
                    matchA.state
                ).toEqual(
                    matchB.state
                );


                expect(
                    matchA.tickCount
                ).toBe(600);


                expect(
                    matchB.tickCount
                ).toBe(600);
            }
        );


        it(
            'TickOrchestrator interception sonucu top sahibini değiştirebilmeli',
            () => {

                const engine =
                    createEngine();


                const orchestrator =
                    createTickOrchestrator({

                        interceptionHasCandidate:
                            true,

                        interceptionOwnerId:
                            'B1'
                    });


                const match =
                    new MatchEngine({

                        simulationCore:
                            engine.simulationCore,

                        tickOrchestrator:
                            orchestrator,

                        timeStep:
                            1 / 60
                    });


                expect(
                    match.state.ball.ownerId
                ).toBe(null);


                match.tick({

                    passerTeamId:
                        'A',

                    receivingTeamId:
                        'A'
                });


                expect(
                    match.state.ball.ownerId
                ).toBe('B1');
            }
        );


        /*
         * -------------------------------------------------
         * TEK FİZİK ADIMI REGRESYON TESTLERİ
         * -------------------------------------------------
         */


        it(
            'tek MatchEngine.tick() içinde oyuncu fiziği SADECE 1 kez çağrılmalı',
            () => {

                const players = [
                    {
                        id: 'A1',
                        teamId: 'A',
                        role: 'ST',

                        position: {
                            x: 100,
                            y: 200
                        },

                        basePosition: {
                            x: 100,
                            y: 200
                        }
                    }
                ];


                const stepSpy =
                    vi.spyOn(
                        PhysicsEngine.prototype,
                        'step'
                    );


                const simulationCore =
                    new SimulationCore({

                        initialPlayers:
                            players,

                        initialBall: {
                            ownerId: null,

                            position: {
                                x: 400,
                                y: 300
                            }
                        },

                        tacticalEngine:
                            new TestTacticalEngine(),

                        behaviorEngine:
                            new PlayerBehaviorEngine(),

                        decisionEngine:
                            new DecisionEngine(),

                        physicsEngine:
                            new PhysicsEngine({
                                playerSpeed: 120
                            }),

                        collisionDetector:
                            new CollisionDetector({
                                collisionDistance: 30
                            }),

                        collisionStateTransition:
                            new CollisionStateTransition({
                                collisionDistance: 30
                            }),

                        timeStep:
                            1 / 60
                    });


                const engine =
                    new MatchEngine({

                        simulationCore,

                        timeStep:
                            1 / 60
                    });


                engine.tick();


                expect(stepSpy)
                    .toHaveBeenCalledTimes(1);
            }
        );


        it(
            'tek MatchEngine.tick() içinde top fiziği SADECE 1 kez çağrılmalı',
            () => {

                const players = [
                    {
                        id: 'A1',
                        teamId: 'A',
                        role: 'ST',

                        position: {
                            x: 100,
                            y: 200
                        },

                        basePosition: {
                            x: 100,
                            y: 200
                        }
                    }
                ];


                let ballStepCallCount = 0;

                const ballPhysics = {

                    step(ball, dt) {

                        ballStepCallCount++;

                        return ball;
                    }
                };


                const simulationCore =
                    new SimulationCore({

                        initialPlayers:
                            players,

                        initialBall: {
                            ownerId: null,

                            position: {
                                x: 400,
                                y: 300
                            }
                        },

                        tacticalEngine:
                            new TestTacticalEngine(),

                        behaviorEngine:
                            new PlayerBehaviorEngine(),

                        decisionEngine:
                            new DecisionEngine(),

                        physicsEngine:
                            new PhysicsEngine({
                                playerSpeed: 120
                            }),

                        collisionDetector:
                            new CollisionDetector({
                                collisionDistance: 30
                            }),

                        collisionStateTransition:
                            new CollisionStateTransition({
                                collisionDistance: 30
                            }),

                        ballPhysics,

                        timeStep:
                            1 / 60
                    });


                const engine =
                    new MatchEngine({

                        simulationCore,

                        timeStep:
                            1 / 60
                    });


                engine.tick();


                expect(ballStepCallCount)
                    .toBe(1);
            }
        );


        it(
            'TickOrchestrator varken bile fizik SADECE 1 kez çağrılmalı (çift-step yok)',
            () => {

                const players = [
                    {
                        id: 'A1',
                        teamId: 'A',
                        role: 'ST',

                        position: {
                            x: 100,
                            y: 200
                        },

                        basePosition: {
                            x: 100,
                            y: 200
                        }
                    }
                ];


                const stepSpy =
                    vi.spyOn(
                        PhysicsEngine.prototype,
                        'step'
                    );


                let ballStepCallCount = 0;

                const ballPhysics = {

                    step(ball, dt) {

                        ballStepCallCount++;

                        return ball;
                    }
                };


                const simulationCore =
                    new SimulationCore({

                        initialPlayers:
                            players,

                        initialBall: {
                            ownerId: null,

                            position: {
                                x: 400,
                                y: 300
                            }
                        },

                        tacticalEngine:
                            new TestTacticalEngine(),

                        behaviorEngine:
                            new PlayerBehaviorEngine(),

                        decisionEngine:
                            new DecisionEngine(),

                        physicsEngine:
                            new PhysicsEngine({
                                playerSpeed: 120
                            }),

                        collisionDetector:
                            new CollisionDetector({
                                collisionDistance: 30
                            }),

                        collisionStateTransition:
                            new CollisionStateTransition({
                                collisionDistance: 30
                            }),

                        ballPhysics,

                        timeStep:
                            1 / 60
                    });


                const orchestrator =
                    createTickOrchestrator();


                const engine =
                    new MatchEngine({

                        simulationCore,

                        tickOrchestrator:
                            orchestrator,

                        timeStep:
                            1 / 60
                    });


                engine.tick();


                expect(stepSpy)
                    .toHaveBeenCalledTimes(1);


                expect(ballStepCallCount)
                    .toBe(1);
            }
        );


        /*
         * -------------------------------------------------
         * OPTIONS FORWARDING — MatchEngine → SimulationCore
         * -------------------------------------------------
         */


        it(
            'MatchEngine.tick(options) options değerini SimulationCore.tick\'e iletmeli',
            () => {

                const engine =
                    createEngine();

                /*
                 * Manuel shotDecision ile tick at.
                 *
                 * SimulationCore.tick(options) içindeki
                 * manuel shotDecision override mantığı,
                 * effectiveDecisions içine manuel kararı ekler.
                 *
                 * Bu karar, tick sonucundaki `decisions`
                 * array'inde görünür.
                 */
                const result =
                    engine.tick({

                        shotDecision: {
                            playerId: 'A1',
                            action: 'SHOT',
                            shotType: 'GROUND'
                        },

                        targetPosition: {
                            x: 1000,
                            y: 200
                        }
                    });

                /*
                 * Eğer options SimulationCore'a ulaştıysa:
                 *   → 'A1' için SHOT kararı
                 *
                 * Eğer options iletilmediyse:
                 *   → 'A1' için normal MOVE/NONE kararı
                 */
                const a1Decision =
                    result.decisions.find(
                        d => d.playerId === 'A1'
                    );

                expect(a1Decision)
                    .toBeDefined();

                expect(a1Decision.action)
                    .toBe('SHOT');

                expect(a1Decision.shotType)
                    .toBe('GROUND');
            }
        );

    }
);