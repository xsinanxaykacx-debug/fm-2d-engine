// scripts/debugPassChain.js
//
// PASS zincirinin gerçek fiziksel izini sürer.
//
// AMAÇ:
//   PASS kararının,
//   PassEngine hedefinin,
//   receiver hareketinin,
//   BallPhysics hareketinin,
//   ReceiverDetector sonucunun
//   aynı zaman ekseninde görülmesi.
//
// MOTOR MANTIĞINA MÜDAHALE ETMEZ.
// SADECE DEBUG / GÖZLEM YAPAR.
//

import { SimulationCore } from '../src/core/SimulationCore.js';
import { PitchContext } from '../src/engine/PitchContext.js';
import { TacticalEngine } from '../src/engine/TacticalEngine.js';
import { PlayerBehaviorEngine } from '../src/engine/PlayerBehaviorEngine.js';
import { PossessionEngine } from '../src/engine/PossessionEngine.js';
import { PossessionStateTransition } from '../src/engine/PossessionStateTransition.js';

import { PassTargetSelector } from '../src/engine/PassTargetSelector.js';
import { ShotDecisionEngine } from '../src/engine/ShotDecisionEngine.js';
import { DecisionEngine } from '../src/engine/DecisionEngine.js';

import { PassEngine, PASS_TYPES } from '../src/engine/PassEngine.js';
import { PassExecutor } from '../src/engine/PassExecutor.js';

import { ShotEngine } from '../src/engine/ShotEngine.js';
import { ShotExecutor } from '../src/engine/ShotExecutor.js';

import { PhysicsEngine } from '../src/engine/PhysicsEngine.js';

import { CollisionDetector } from '../src/engine/CollisionDetector.js';
import { CollisionStateTransition } from '../src/engine/CollisionStateTransition.js';

import { BallPhysics } from '../src/engine/BallPhysics.js';

import { InterceptionDetector } from '../src/engine/InterceptionDetector.js';
import { InterceptionStateTransition } from '../src/engine/InterceptionStateTransition.js';

import {
    ReceiverDetector,
    CONTROL_RADIUS
} from '../src/engine/ReceiverDetector.js';

import { ReceiverStateTransition } from '../src/engine/ReceiverStateTransition.js';
import { TickOrchestrator } from '../src/engine/TickOrchestrator.js';


// ============================================================
// CONFIG
// ============================================================

const TIME_STEP = 1 / 60;

const PITCH_WIDTH = 105;
const PITCH_HEIGHT = 68;

// İlk PASS'i bulduktan sonra bu kadar fiziksel tick izlenecek.
const TRACE_TICKS_AFTER_PASS = 40;


// ============================================================
// PLAYERS
// ============================================================

function createPlayers() {

    const homePositions = [
        { x: 5, y: 34 },
        { x: 15, y: 12 },
        { x: 15, y: 28 },
        { x: 15, y: 40 },
        { x: 15, y: 56 },
        { x: 32, y: 15 },
        { x: 32, y: 30 },
        { x: 32, y: 38 },
        { x: 32, y: 53 },
        { x: 42, y: 25 },
        { x: 42, y: 43 }
    ];

    const awayPositions = [
        { x: 100, y: 34 },
        { x: 90, y: 12 },
        { x: 90, y: 28 },
        { x: 90, y: 40 },
        { x: 90, y: 56 },
        { x: 73, y: 15 },
        { x: 73, y: 30 },
        { x: 73, y: 38 },
        { x: 73, y: 53 },
        { x: 63, y: 25 },
        { x: 63, y: 43 }
    ];

    const roles = [
        'GK',
        'LB', 'LCB', 'RCB', 'RB',
        'LM', 'LCM', 'RCM', 'RM',
        'ST', 'ST'
    ];

    const players = [];

    for (let i = 0; i < 11; i++) {

        players.push({
            id: i + 1,
            teamId: 'HOME',
            role: roles[i],
            position: {
                x: homePositions[i].x,
                y: homePositions[i].y
            },
            basePosition: {
                x: homePositions[i].x,
                y: homePositions[i].y
            }
        });
    }

    for (let i = 0; i < 11; i++) {

        players.push({
            id: i + 12,
            teamId: 'AWAY',
            role: roles[i],
            position: {
                x: awayPositions[i].x,
                y: awayPositions[i].y
            },
            basePosition: {
                x: awayPositions[i].x,
                y: awayPositions[i].y
            }
        });
    }

    return players;
}


// ============================================================
// ENGINE FACTORY
// ============================================================

function createEngineBundle() {

    const pitchContext =
        new PitchContext({
            width: PITCH_WIDTH,
            height: PITCH_HEIGHT
        });

    const tacticalEngine =
        new TacticalEngine({
            pitchContext
        });

    const behaviorEngine =
        new PlayerBehaviorEngine();

    const possessionEngine =
        new PossessionEngine({
            controlRadius: 15
        });

    const possessionStateTransition =
        new PossessionStateTransition();

    const passTargetSelector =
        new PassTargetSelector();

    const shotDecisionEngine =
        new ShotDecisionEngine({
            pitchContext
        });

    const decisionEngine =
        new DecisionEngine();

    const passEngine =
        new PassEngine();

    const passExecutor =
        new PassExecutor({
            passEngine,
            possessionStateTransition
        });

    const shotEngine =
        new ShotEngine();

    const shotExecutor =
        new ShotExecutor({
            shotEngine,
            possessionStateTransition
        });

    const physicsEngine =
        new PhysicsEngine({
            playerSpeed: 120,
            pitchWidth: PITCH_WIDTH,
            pitchHeight: PITCH_HEIGHT
        });

    const collisionDetector =
        new CollisionDetector({
            collisionDistance: 2
        });

    const collisionStateTransition =
        new CollisionStateTransition({
            pitchWidth: PITCH_WIDTH,
            pitchHeight: PITCH_HEIGHT
        });

    const ballPhysics =
        new BallPhysics();

    const interceptionDetector =
        new InterceptionDetector();

    const interceptionStateTransition =
        new InterceptionStateTransition();

    const receiverDetector =
        new ReceiverDetector();

    const receiverStateTransition =
        new ReceiverStateTransition();

    const tickOrchestrator =
        new TickOrchestrator({
            interceptionDetector,
            interceptionStateTransition,
            receiverDetector,
            receiverStateTransition
        });

    const initialPlayers =
        createPlayers();

    const initialBall = {
        ownerId: null,
        velocity: {
            x: 0,
            y: 0
        },
        position: {
            x: PITCH_WIDTH / 2,
            y: PITCH_HEIGHT / 2
        }
    };

    const simulationCore =
        new SimulationCore({
            initialPlayers,
            initialBall,
            tacticalEngine,
            behaviorEngine,
            possessionEngine,
            passTargetSelector,
            shotDecisionEngine,
            decisionEngine,
            passExecutor,
            shotExecutor,
            physicsEngine,
            collisionDetector,
            collisionStateTransition,
            ballPhysics,
            timeStep: TIME_STEP
        });

    return {
        simulationCore,
        tickOrchestrator,
        interceptionDetector,
        receiverDetector,
        passEngine
    };
}


// ============================================================
// HELPERS
// ============================================================

function fmt(value) {

    if (value === null || value === undefined) {
        return 'null';
    }

    if (!Number.isFinite(value)) {
        return String(value);
    }

    return value.toFixed(3);
}


function point(position) {

    if (!position) {
        return '(null)';
    }

    return `(${fmt(position.x)},${fmt(position.y)})`;
}


function distance(a, b) {

    if (!a || !b) {
        return Infinity;
    }

    return Math.hypot(
        a.x - b.x,
        a.y - b.y
    );
}


function speed(velocity) {

    if (!velocity) {
        return 0;
    }

    return Math.hypot(
        velocity.x,
        velocity.y
    );
}


function findPlayer(state, playerId) {

    return state.players.find(
        player => player.id === playerId
    );
}


function printPlayer(label, player) {

    if (!player) {

        process.stdout.write(
            `${label}: NOT FOUND\n`
        );

        return;
    }

    process.stdout.write(
        `${label}: #${player.id} ` +
        `team=${player.teamId} ` +
        `role=${player.role} ` +
        `pos=${point(player.position)}\n`
    );
}


// ============================================================
// FIRST PASS TRACE
// ============================================================

function runDebug() {

    const bundle =
        createEngineBundle();

    const {
        simulationCore,
        tickOrchestrator,
        interceptionDetector,
        receiverDetector,
        passEngine
    } = bundle;


    process.stdout.write('\n');
    process.stdout.write(
        '============================================================\n'
    );
    process.stdout.write(
        'DEBUG: FIRST PASS PHYSICAL TRACE\n'
    );
    process.stdout.write(
        `CONTROL_RADIUS = ${CONTROL_RADIUS}\n`
    );
    process.stdout.write(
        `PLAYER_SPEED   = 120 px/s\n`
    );
    process.stdout.write(
        `PASS_SPEED     = 300 px/s\n`
    );
    process.stdout.write(
        `TIME_STEP      = ${TIME_STEP}\n`
    );
    process.stdout.write(
        '============================================================\n'
    );


    let passFound = false;
    let traceTick = 0;

    while (!passFound) {

        const beforeState =
            simulationCore.state;

        const beforeBall =
            beforeState.ball;

        const coreResult =
            simulationCore.tick({});

        const stateAfterCore =
            coreResult.state;

        const decisions =
            coreResult.decisions || [];

        const passDecision =
            decisions.find(
                decision =>
                    decision.action === 'PASS'
            );


        // --------------------------------------------------------
        // PASS YOKSA ORCHESTRATOR'U UYGULA VE DEVAM ET
        // --------------------------------------------------------

        if (!passDecision) {

            const passInfo =
                coreResult.passInfo;

            const finalState =
                tickOrchestrator.tick(
                    stateAfterCore,
                    {
                        passerTeamId:
                            passInfo?.passerTeamId ?? null,

                        receivingTeamId:
                            passInfo?.receivingTeamId ?? null,

                        targetReceiverId:
                            passInfo?.targetReceiverId ?? null
                    }
                );

            simulationCore.setState(finalState);

            continue;
        }


        // --------------------------------------------------------
        // İLK PASS BULUNDU
        // --------------------------------------------------------

        passFound = true;

        const passerId =
            passDecision.playerId;

        const receiverId =
            passDecision.receiverId;

        const possession =
            coreResult.possessionSnapshot;


        // PASS'İN GERÇEK BAŞLANGIÇ STATE'İ
        const passerBefore =
            findPlayer(
                beforeState,
                passerId
            );

        const receiverBefore =
            findPlayer(
                beforeState,
                receiverId
            );


        // PassEngine'in gerçekten hesapladığı intent
        const passIntent =
            passEngine.calculateIntent(
                beforeState,
                possession,
                passerId,
                receiverId,
                PASS_TYPES.GROUND
            );


        process.stdout.write('\n');
        process.stdout.write(
            '############################################################\n'
        );
        process.stdout.write(
            'İLK PASS BULUNDU\n'
        );
        process.stdout.write(
            '############################################################\n'
        );


        process.stdout.write('\nPASS KARARI\n');

        process.stdout.write(
            `  passerId       : ${passerId}\n`
        );

        process.stdout.write(
            `  receiverId     : ${receiverId}\n`
        );


        process.stdout.write('\nPASS BAŞLANGIÇ POZİSYONLARI\n');

        printPlayer(
            '  PASSER',
            passerBefore
        );

        printPlayer(
            '  RECEIVER',
            receiverBefore
        );


        process.stdout.write('\nPASS ENGINE SONUCU\n');

        process.stdout.write(
            `  targetPosition : ${point(passIntent.targetPosition)}\n`
        );

        process.stdout.write(
            `  velocity       : (${fmt(passIntent.velocity.x)},${fmt(passIntent.velocity.y)})\n`
        );

        process.stdout.write(
            `  speed          : ${fmt(speed(passIntent.velocity))}\n`
        );

        process.stdout.write(
            `  targetDistance : ${fmt(distance(
                passerBefore.position,
                passIntent.targetPosition
            ))}\n`
        );


        process.stdout.write('\nCORE SONRASI\n');

        process.stdout.write(
            `  ball.pos       : ${point(stateAfterCore.ball.position)}\n`
        );

        process.stdout.write(
            `  ball.vel       : (${fmt(stateAfterCore.ball.velocity.x)},${fmt(stateAfterCore.ball.velocity.y)})\n`
        );

        process.stdout.write(
            `  ball.speed     : ${fmt(speed(stateAfterCore.ball.velocity))}\n`
        );

        process.stdout.write(
            `  ball.owner     : ${stateAfterCore.ball.ownerId ?? 'null'}\n`
        );


        const receiverAfterCore =
            findPlayer(
                stateAfterCore,
                receiverId
            );

        printPlayer(
            '  RECEIVER CORE  ',
            receiverAfterCore
        );


        process.stdout.write(
            `  ball→receiver  : ${fmt(
                distance(
                    stateAfterCore.ball.position,
                    receiverAfterCore.position
                )
            )}\n`
        );


        // --------------------------------------------------------
        // ORCHESTRATOR
        // --------------------------------------------------------

        const passInfo =
            coreResult.passInfo;

        const finalState =
            tickOrchestrator.tick(
                stateAfterCore,
                {
                    passerTeamId:
                        passInfo?.passerTeamId ?? null,

                    receivingTeamId:
                        passInfo?.receivingTeamId ?? null,

                    targetReceiverId:
                        passInfo?.targetReceiverId ?? null
                }
            );

        simulationCore.setState(finalState);


        const receiverSnap =
            receiverDetector.evaluate(
                finalState,
                passInfo?.receivingTeamId ?? null,
                passInfo?.targetReceiverId ?? null
            );


        process.stdout.write('\nORCHESTRATOR SONUCU\n');

        process.stdout.write(
            `  owner          : ${finalState.ball.ownerId ?? 'null'}\n`
        );

        process.stdout.write(
            `  receiverFound  : ${receiverSnap.hasReceiver}\n`
        );

        process.stdout.write(
            `  receiverId     : ${receiverSnap.receiverId ?? 'null'}\n`
        );

        process.stdout.write(
            `  distance       : ${
                receiverSnap.distanceToBall === null
                    ? 'null'
                    : fmt(receiverSnap.distanceToBall)
            }\n`
        );


        // --------------------------------------------------------
        // PASS SONRASI FİZİKSEL İZ
        // --------------------------------------------------------

        process.stdout.write('\n');
        process.stdout.write(
            '============================================================\n'
        );
        process.stdout.write(
            'PASS SONRASI FİZİKSEL İZ\n'
        );
        process.stdout.write(
            '============================================================\n'
        );


        traceTick = 0;

        while (
            traceTick < TRACE_TICKS_AFTER_PASS
        ) {

            traceTick++;


            const stateBeforeTick =
                simulationCore.state;

            const ballBefore =
                stateBeforeTick.ball;

            const receiverBeforeTick =
                findPlayer(
                    stateBeforeTick,
                    receiverId
                );


            const core =
                simulationCore.tick({});

            const afterCore =
                core.state;

            const receiverAfterTick =
                findPlayer(
                    afterCore,
                    receiverId
                );


            const ballAfter =
                afterCore.ball;


            const ballReceiverDistance =
                distance(
                    ballAfter.position,
                    receiverAfterTick.position
                );


            const receiverMovement =
                distance(
                    receiverBeforeTick.position,
                    receiverAfterTick.position
                );


            const targetDistance =
                distance(
                    ballAfter.position,
                    passIntent.targetPosition
                );


            const receiverTargetDistance =
                distance(
                    receiverAfterTick.position,
                    passIntent.targetPosition
                );


            const receiverSnapNow =
                receiverDetector.evaluate(
                    afterCore,
                    passInfo?.receivingTeamId ?? null,
                    receiverId
                );


            const interceptionSnapNow =
                interceptionDetector.evaluate(
                    afterCore,
                    passInfo?.passerTeamId ?? null
                );


            const orchestrated =
                tickOrchestrator.tick(
                    afterCore,
                    {
                        passerTeamId:
                            passInfo?.passerTeamId ?? null,

                        receivingTeamId:
                            passInfo?.receivingTeamId ?? null,

                        targetReceiverId:
                            receiverId
                    }
                );


            simulationCore.setState(
                orchestrated
            );


            process.stdout.write(
                `\nTICK +${traceTick}\n`
            );

            process.stdout.write(
                `  BALL       pos=${point(ballAfter.position)} ` +
                `speed=${fmt(speed(ballAfter.velocity))} ` +
                `owner=${ballAfter.ownerId ?? 'null'}\n`
            );

            process.stdout.write(
                `  RECEIVER   pos=${point(receiverAfterTick.position)} ` +
                `move=${fmt(receiverMovement)}\n`
            );

            process.stdout.write(
                `  DISTANCE   ball→receiver=${fmt(ballReceiverDistance)} ` +
                `ball→target=${fmt(targetDistance)} ` +
                `receiver→target=${fmt(receiverTargetDistance)}\n`
            );

            process.stdout.write(
                `  DETECTOR   receiver=${receiverSnapNow.hasReceiver} ` +
                `id=${receiverSnapNow.receiverId ?? 'null'} ` +
                `interception=${interceptionSnapNow.hasCandidate} ` +
                `id=${interceptionSnapNow.interceptorId ?? 'null'}\n`
            );


            if (
                orchestrated.ball.ownerId === receiverId
            ) {

                process.stdout.write('\n');
                process.stdout.write(
                    '############################################################\n'
                );
                process.stdout.write(
                    'PASS BAŞARILI\n'
                );
                process.stdout.write(
                    `Receiver #${receiverId} topu aldı.\n`
                );
                process.stdout.write(
                    `Toplam PASS tick: ${traceTick}\n`
                );
                process.stdout.write(
                    '############################################################\n'
                );

                return;
            }


            if (
                interceptionSnapNow.hasCandidate
            ) {

                process.stdout.write('\n');
                process.stdout.write(
                    '############################################################\n'
                );
                process.stdout.write(
                    'PASS INTERCEPTION İLE KESİLDİ\n'
                );
                process.stdout.write(
                    `Interceptor #${interceptionSnapNow.interceptorId}\n`
                );
                process.stdout.write(
                    `Tick: ${traceTick}\n`
                );
                process.stdout.write(
                    '############################################################\n'
                );

                return;
            }
        }


        process.stdout.write('\n');
        process.stdout.write(
            '############################################################\n'
        );
        process.stdout.write(
            'PASS 40 TICK İÇİNDE TAMAMLANMADI\n'
        );
        process.stdout.write(
            '############################################################\n'
        );

        process.stdout.write(
            `Receiver #${receiverId}\n`
        );

        process.stdout.write(
            `Final ball position: ${point(
                simulationCore.state.ball.position
            )}\n`
        );

        process.stdout.write(
            `Final receiver position: ${point(
                findPlayer(
                    simulationCore.state,
                    receiverId
                ).position
            )}\n`
        );

        process.stdout.write(
            `Final distance: ${fmt(
                distance(
                    simulationCore.state.ball.position,
                    findPlayer(
                        simulationCore.state,
                        receiverId
                    ).position
                )
            )}\n`
        );
    }


    process.stdout.write('\n');
    process.stdout.write(
        '============================================================\n'
    );
    process.stdout.write(
        'DEBUG FINISHED\n'
    );
    process.stdout.write(
        '============================================================\n'
    );
}


runDebug();