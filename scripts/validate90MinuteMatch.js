// scripts/validate90MinuteMatch.js
//
// ... (yorum aynı)

import { createHash } from 'node:crypto';

import { MatchEngine } from '../src/core/MatchEngine.js';
import { SimulationCore } from '../src/core/SimulationCore.js';

import { PitchContext } from '../src/engine/PitchContext.js';
import { TacticalEngine } from '../src/engine/TacticalEngine.js';
import { PlayerBehaviorEngine } from '../src/engine/PlayerBehaviorEngine.js';
import { PossessionEngine } from '../src/engine/PossessionEngine.js';
import { PossessionStateTransition } from '../src/engine/PossessionStateTransition.js';

import { PassTargetSelector } from '../src/engine/PassTargetSelector.js';
import { ShotDecisionEngine } from '../src/engine/ShotDecisionEngine.js';
import { DecisionEngine } from '../src/engine/DecisionEngine.js';

import { PassEngine } from '../src/engine/PassEngine.js';
import { PassExecutor } from '../src/engine/PassExecutor.js';

import { ShotEngine } from '../src/engine/ShotEngine.js';
import { ShotExecutor } from '../src/engine/ShotExecutor.js';

import { PhysicsEngine } from '../src/engine/PhysicsEngine.js';

import { CollisionDetector } from '../src/engine/CollisionDetector.js';
import { CollisionStateTransition } from '../src/engine/CollisionStateTransition.js';

import { BallPhysics } from '../src/engine/BallPhysics.js';

import { InterceptionDetector } from '../src/engine/InterceptionDetector.js';
import { InterceptionStateTransition } from '../src/engine/InterceptionStateTransition.js';

import { ReceiverDetector } from '../src/engine/ReceiverDetector.js';
import { ReceiverStateTransition } from '../src/engine/ReceiverStateTransition.js';

import { TickOrchestrator } from '../src/engine/TickOrchestrator.js';

import { BoundaryDetector } from '../src/engine/BoundaryDetector.js';
import { GoalDetector } from '../src/engine/GoalDetector.js';


// ============================================================
// CONFIG
// ============================================================

const FPS = 60;
const MATCH_MINUTES = 90;
const MATCH_SECONDS = MATCH_MINUTES * 60;
const TOTAL_TICKS = MATCH_SECONDS * FPS;
const TIME_STEP = 1 / FPS;
const PITCH_WIDTH = 105;
const PITCH_HEIGHT = 68;
const PROGRESS_EVERY = 600;


// ============================================================
// CREATE PLAYERS
// ============================================================

function createPlayers() {
    const players = [];

    const homePositions = [
        { x: 5, y: 34 },
        { x: 15, y: 12 }, { x: 15, y: 28 }, { x: 15, y: 40 }, { x: 15, y: 56 },
        { x: 32, y: 15 }, { x: 32, y: 30 }, { x: 32, y: 38 }, { x: 32, y: 53 },
        { x: 42, y: 25 }, { x: 42, y: 43 }
    ];

    const awayPositions = [
        { x: 100, y: 34 },
        { x: 90, y: 12 }, { x: 90, y: 28 }, { x: 90, y: 40 }, { x: 90, y: 56 },
        { x: 73, y: 15 }, { x: 73, y: 30 }, { x: 73, y: 38 }, { x: 73, y: 53 },
        { x: 63, y: 25 }, { x: 63, y: 43 }
    ];

    const roles = [
        'GK',
        'LB', 'LCB', 'RCB', 'RB',
        'LM', 'LCM', 'RCM', 'RM',
        'ST', 'ST'
    ];

    for (let i = 0; i < 11; i++) {
        players.push({
            id: i + 1,
            teamId: 'HOME',
            role: roles[i],
            position: { x: homePositions[i].x, y: homePositions[i].y },
            basePosition: { x: homePositions[i].x, y: homePositions[i].y }
        });
    }

    for (let i = 0; i < 11; i++) {
        players.push({
            id: i + 12,
            teamId: 'AWAY',
            role: roles[i],
            position: { x: awayPositions[i].x, y: awayPositions[i].y },
            basePosition: { x: awayPositions[i].x, y: awayPositions[i].y }
        });
    }

    return players;
}


// ============================================================
// INITIAL BALL
// ============================================================

function createInitialBall() {
    return {
        position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
        velocity: { x: 0, y: 0 },
        ownerId: null
    };
}


// ============================================================
// CANONICAL STATE / HASH
// ============================================================

function createCanonicalState(state) {
    const players = [...state.players]
        .sort((a, b) => Number(a.id) - Number(b.id))
        .map(player => ({
            id: player.id,
            teamId: player.teamId ?? null,
            role: player.role ?? null,
            x: player.position?.x ?? null,
            y: player.position?.y ?? null,
            baseX: player.basePosition?.x ?? null,
            baseY: player.basePosition?.y ?? null
        }));

    const ball = state.ball
        ? {
            ownerId: state.ball.ownerId ?? null,
            x: state.ball.position?.x ?? null,
            y: state.ball.position?.y ?? null,
            vx: state.ball.velocity?.x ?? null,
            vy: state.ball.velocity?.y ?? null
        }
        : null;

    return { players, ball };
}

function hashState(state) {
    return createHash('sha256')
        .update(JSON.stringify(createCanonicalState(state)))
        .digest('hex');
}


// ============================================================
// NUMERIC HELPERS
// ============================================================

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function inspectStateNumbers(state) {
    let invalidCount = 0;

    if (!state || !Array.isArray(state.players)) {
        return { valid: false, invalidCount: 1 };
    }

    for (const player of state.players) {
        if (!player.position) { invalidCount++; continue; }
        if (!isFiniteNumber(player.position.x) || !isFiniteNumber(player.position.y)) invalidCount++;
        if (player.basePosition) {
            if (!isFiniteNumber(player.basePosition.x) || !isFiniteNumber(player.basePosition.y)) invalidCount++;
        }
    }

    if (state.ball) {
        if (!state.ball.position) invalidCount++;
        else if (!isFiniteNumber(state.ball.position.x) || !isFiniteNumber(state.ball.position.y)) invalidCount++;

        if (!state.ball.velocity) invalidCount++;
        else if (!isFiniteNumber(state.ball.velocity.x) || !isFiniteNumber(state.ball.velocity.y)) invalidCount++;
    }

    return { valid: invalidCount === 0, invalidCount };
}

function distance(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
}


// ============================================================
// CREATE MATCH ENGINE
// ============================================================

function createMatchEngine() {
    const players = createPlayers();
    const ball = createInitialBall();

    const pitchContext = new PitchContext({ width: PITCH_WIDTH, height: PITCH_HEIGHT });
    const tacticalEngine = new TacticalEngine({ pitchContext });
    const behaviorEngine = new PlayerBehaviorEngine();
    const possessionEngine = new PossessionEngine({ controlRadius: 15 });
    const possessionStateTransition = new PossessionStateTransition();
    const passTargetSelector = new PassTargetSelector();
    const shotDecisionEngine = new ShotDecisionEngine({ pitchContext });
    const decisionEngine = new DecisionEngine();

    const passEngine = new PassEngine();
    const passExecutor = new PassExecutor({ passEngine, possessionStateTransition });

    const shotEngine = new ShotEngine();
    const shotExecutor = new ShotExecutor({ shotEngine, possessionStateTransition });

    const physicsEngine = new PhysicsEngine({
        playerSpeed: 120,
        pitchWidth: 105,
        pitchHeight: 68
    });

    const collisionDetector = new CollisionDetector({ collisionDistance: 2 });
    const collisionStateTransition = new CollisionStateTransition({
        pitchWidth: 105,
        pitchHeight: 68
    });

    const ballPhysics = new BallPhysics();

    const interceptionDetector = new InterceptionDetector();
    const interceptionStateTransition = new InterceptionStateTransition();
    const receiverDetector = new ReceiverDetector();
    const receiverStateTransition = new ReceiverStateTransition();

    const tickOrchestrator = new TickOrchestrator({
        interceptionDetector,
        interceptionStateTransition,
        receiverDetector,
        receiverStateTransition
    });

    const simulationCore = new SimulationCore({
        initialPlayers: players,
        initialBall: ball,
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

    const matchEngine = new MatchEngine({
        simulationCore,
        tickOrchestrator,
        timeStep: TIME_STEP
    });

    return { matchEngine, pitchContext };
}


// ============================================================
// RUN ONE MATCH
// ============================================================

function runOnce(runNumber) {

    const { matchEngine } = createMatchEngine();

    const boundaryDetector = new BoundaryDetector({ width: PITCH_WIDTH, height: PITCH_HEIGHT });
    const goalDetector = new GoalDetector();

    const goalContext = {
        width: PITCH_WIDTH,
        height: PITCH_HEIGHT,
        homeTeamId: 'HOME',
        awayTeamId: 'AWAY',
        homeAttackingSide: 'RIGHT'
    };

    // --------------------------------------------------------
    // STATS
    // --------------------------------------------------------

    const stats = {
        ticks: 0,
        errors: 0,
        invalidNumbers: 0,
        invalidOwner: 0,

        possessionTicks: { HOME: 0, AWAY: 0, NONE: 0 },
        uniqueOwners: new Set(),

        passDecisions: 0,
        completedPasses: 0,
        completedPassesToTarget: 0,
        interceptions: 0,

        shotCandidates: 0,
        actualShotDecisions: 0,
        actualPassDecisions: 0,
        actualMoveDecisions: 0,
        actualNoneDecisions: 0,

        // ---- YENİ: Possession decision ticks ----
        possessionDecisionTicks: 0,
        possessionPassDecisions: 0,
        possessionShotDecisions: 0,
        possessionMoveDecisions: 0,
        possessionNoneDecisions: 0,

        goals: 0,
        goalTransitions: 0,

        boundaryExits: 0,
        boundaryTransitions: 0,

        playerOutOfBoundsTicks: 0,

        stuckPlayerIncidents: 0,
        stuckBallIncidents: 0,

        maxBallSpeed: 0,
        totalBallDistance: 0,
        maxPlayerSpeed: 0,

        finalState: null,
        finalHash: null
    };

    let previousGoal = false;
    let previousOutOfBounds = false;

    const playerStillTicks = new Map();
    let ballStillTicks = 0;

    let previousBallPosition = {
        x: matchEngine.state.ball.position.x,
        y: matchEngine.state.ball.position.y
    };


    // ========================================================
    // MAIN LOOP
    // ========================================================

    for (let tickIndex = 0; tickIndex < TOTAL_TICKS; tickIndex++) {

        let result;

        try {
            result = matchEngine.tick();
        } catch (error) {
            stats.errors++;
            process.stdout.write(
                `\nRUN ${runNumber} ERROR at tick ${tickIndex + 1}:\n${error?.stack || error}\n`
            );
            continue;
        }

        stats.ticks++;

        const state = result.state;

        // ----------------------------------------------------
        // NUMERIC HEALTH
        // ----------------------------------------------------
        const numericHealth = inspectStateNumbers(state);
        if (!numericHealth.valid) stats.invalidNumbers += numericHealth.invalidCount;

        // ----------------------------------------------------
        // BALL
        // ----------------------------------------------------
        if (state.ball) {
            const ballPosition = state.ball.position;
            const ballVelocity = state.ball.velocity;

            const ballSpeed = Math.hypot(ballVelocity.x, ballVelocity.y);
            if (Number.isFinite(ballSpeed)) {
                if (ballSpeed > stats.maxBallSpeed) stats.maxBallSpeed = ballSpeed;
            } else {
                stats.invalidNumbers++;
            }

            const ballDistance = distance(previousBallPosition, ballPosition);
            if (Number.isFinite(ballDistance)) {
                stats.totalBallDistance += ballDistance;
            } else {
                stats.invalidNumbers++;
            }

            previousBallPosition = { x: ballPosition.x, y: ballPosition.y };

            if (Math.abs(ballVelocity.x) < 0.001 && Math.abs(ballVelocity.y) < 0.001) {
                ballStillTicks++;
            } else {
                ballStillTicks = 0;
            }

            if (ballStillTicks === FPS * 10) stats.stuckBallIncidents++;
        }

        // ----------------------------------------------------
        // POSSESSION
        // ----------------------------------------------------
        const ownerId = state.ball?.ownerId ?? null;

        if (ownerId === null) {
            stats.possessionTicks.NONE++;
        } else {
            const owner = state.players.find(p => p.id === ownerId);
            if (!owner) {
                stats.invalidOwner++;
            } else {
                if (owner.teamId === 'HOME') stats.possessionTicks.HOME++;
                else if (owner.teamId === 'AWAY') stats.possessionTicks.AWAY++;
                else stats.invalidOwner++;
                stats.uniqueOwners.add(ownerId);
            }
        }

        // ----------------------------------------------------
        // PASS
        // ----------------------------------------------------
        const passDecision = result.decisions?.find(d => d.action === 'PASS');

        if (passDecision) {
            stats.passDecisions++;

            const passInfo = result.passInfo;
            const previousState = result.previousState;
            const previousOwner = previousState.ball?.ownerId ?? null;
            const currentOwner = state.ball?.ownerId ?? null;

            if (
                previousOwner === null &&
                currentOwner !== null &&
                passInfo &&
                passInfo.passerTeamId !== null
            ) {
                const currentReceiver = state.players.find(p => p.id === currentOwner);
                if (currentReceiver) {
                    if (currentReceiver.teamId === passInfo.passerTeamId) {
                        stats.completedPasses++;
                        if (currentOwner === passInfo.targetReceiverId) {
                            stats.completedPassesToTarget++;
                        }
                    } else {
                        stats.interceptions++;
                    }
                }
            }
        }

        // ----------------------------------------------------
        // SHOT — CANDIDATES
        // ----------------------------------------------------
        const shotDecisionCount = Array.isArray(result.shotDecisions)
            ? result.shotDecisions.filter(d => d && d.canShoot === true).length
            : 0;

        stats.shotCandidates += shotDecisionCount;

        // ----------------------------------------------------
        // ACTUAL DECISIONS
        // ----------------------------------------------------
        if (Array.isArray(result.decisions)) {
            for (const decision of result.decisions) {
                if (!decision) continue;
                if (decision.action === 'SHOT') stats.actualShotDecisions++;
                else if (decision.action === 'PASS') stats.actualPassDecisions++;
                else if (decision.action === 'MOVE') stats.actualMoveDecisions++;
                else if (decision.action === 'NONE') stats.actualNoneDecisions++;
            }
        }

        // ----------------------------------------------------
        // YENİ: POSSESSION DECISION TICKS
        // ----------------------------------------------------
        if (result.possessionSnapshot?.ownerId != null) {

            stats.possessionDecisionTicks++;

            const ownerDecision = result.decisions?.find(
                decision => decision.playerId === result.possessionSnapshot.ownerId
            );

            if (ownerDecision) {
                if (ownerDecision.action === 'PASS') stats.possessionPassDecisions++;
                else if (ownerDecision.action === 'SHOT') stats.possessionShotDecisions++;
                else if (ownerDecision.action === 'MOVE') stats.possessionMoveDecisions++;
                else if (ownerDecision.action === 'NONE') stats.possessionNoneDecisions++;
            }
        }

        // ----------------------------------------------------
        // GOAL
        // ----------------------------------------------------
        if (state.ball) {
            const goalSnapshot = goalDetector.detect(state.ball, goalContext);
            const currentGoal = Boolean(goalSnapshot?.isGoal);

            if (!previousGoal && currentGoal) {
                stats.goals++;
                stats.goalTransitions++;
            }

            previousGoal = currentGoal;
        }

        // ----------------------------------------------------
        // BOUNDARY
        // ----------------------------------------------------
        if (state.ball) {
            const boundarySnapshot = boundaryDetector.evaluate(state.ball);
            const currentOutOfBounds = Boolean(boundarySnapshot?.isOutOfBounds);

            if (!previousOutOfBounds && currentOutOfBounds) {
                stats.boundaryExits++;
                stats.boundaryTransitions++;
            }

            previousOutOfBounds = currentOutOfBounds;
        }

        // ----------------------------------------------------
        // PLAYER BOUNDARY + STUCK
        // ----------------------------------------------------
        for (const player of state.players) {
            const x = player.position.x;
            const y = player.position.y;

            const outside = (x < 0 || x > PITCH_WIDTH || y < 0 || y > PITCH_HEIGHT);
            if (outside) stats.playerOutOfBoundsTicks++;

            const key = String(player.id);
            const previous = playerStillTicks.get(key) ?? { x, y, ticks: 0 };
            const moved = Math.hypot(x - previous.x, y - previous.y);

            if (moved < 0.0001) previous.ticks++;
            else previous.ticks = 0;

            previous.x = x;
            previous.y = y;
            playerStillTicks.set(key, previous);

            if (previous.ticks === FPS * 30) stats.stuckPlayerIncidents++;
        }

        // ----------------------------------------------------
        // PLAYER SPEED
        // ----------------------------------------------------
        const previousPlayers = result.previousState.players;

        for (const player of state.players) {
            const previousPlayer = previousPlayers.find(p => p.id === player.id);
            if (!previousPlayer) continue;

            const dx = player.position.x - previousPlayer.position.x;
            const dy = player.position.y - previousPlayer.position.y;
            const speed = Math.hypot(dx, dy) / TIME_STEP;

            if (Number.isFinite(speed)) {
                if (speed > stats.maxPlayerSpeed) stats.maxPlayerSpeed = speed;
            } else {
                stats.invalidNumbers++;
            }
        }

        // ----------------------------------------------------
        // PROGRESS
        // ----------------------------------------------------
        if ((tickIndex + 1) % PROGRESS_EVERY === 0) {
            const minutes = ((tickIndex + 1) / FPS / 60).toFixed(1);

            process.stdout.write(
                `RUN ${runNumber} | ` +
                `${minutes} dk | ` +
                `Pass:${stats.passDecisions} | ` +
                `PassOK:${stats.completedPasses} | ` +
                `INT:${stats.interceptions} | ` +
                `Shot:${stats.actualShotDecisions} | ` +
                `Goal:${stats.goals}\n`
            );
        }
    }

    // --------------------------------------------------------
    // FINAL STATE
    // --------------------------------------------------------
    stats.finalState = matchEngine.state;
    stats.finalHash = hashState(stats.finalState);

    return stats;
}


// ============================================================
// PRINT SUMMARY
// ============================================================

function printSummary(label, stats) {

    process.stdout.write(`\n============================================================\n`);
    process.stdout.write(`${label}\n`);
    process.stdout.write(`============================================================\n`);

    process.stdout.write(`Ticks                     : ${stats.ticks}\n`);
    process.stdout.write(`Tick errors               : ${stats.errors}\n`);
    process.stdout.write(`NaN / Infinity            : ${stats.invalidNumbers}\n`);
    process.stdout.write(`Invalid ball owner        : ${stats.invalidOwner}\n`);

    process.stdout.write(`\nPOSSESSION\n`);
    process.stdout.write(`HOME possession ticks     : ${stats.possessionTicks.HOME}\n`);
    process.stdout.write(`AWAY possession ticks     : ${stats.possessionTicks.AWAY}\n`);
    process.stdout.write(`FREE ball ticks           : ${stats.possessionTicks.NONE}\n`);
    process.stdout.write(`Unique owners             : ${stats.uniqueOwners.size}\n`);

    process.stdout.write(`\nPASS\n`);
    process.stdout.write(`PASS decisions            : ${stats.passDecisions}\n`);
    process.stdout.write(`Completed passes          : ${stats.completedPasses}\n`);
    process.stdout.write(`Completed to target       : ${stats.completedPassesToTarget}\n`);
    process.stdout.write(`Interceptions             : ${stats.interceptions}\n`);

    process.stdout.write(`\nSHOT / GOAL\n`);
    process.stdout.write(`Shot candidates           : ${stats.shotCandidates}\n`);
    process.stdout.write(`Actual SHOT decisions     : ${stats.actualShotDecisions}\n`);
    process.stdout.write(`Actual PASS decisions     : ${stats.actualPassDecisions}\n`);
    process.stdout.write(`Actual MOVE decisions     : ${stats.actualMoveDecisions}\n`);
    process.stdout.write(`Actual NONE decisions     : ${stats.actualNoneDecisions}\n`);
    process.stdout.write(`Goals detected            : ${stats.goals}\n`);
    process.stdout.write(`Goal transitions          : ${stats.goalTransitions}\n`);

    // ---- YENİ: POSSESSION DECISIONS ----
    process.stdout.write(`\nPOSSESSION DECISIONS\n`);
    process.stdout.write(`Possession decision ticks : ${stats.possessionDecisionTicks}\n`);
    process.stdout.write(`PASS                      : ${stats.possessionPassDecisions}\n`);
    process.stdout.write(`SHOT                      : ${stats.possessionShotDecisions}\n`);
    process.stdout.write(`MOVE                      : ${stats.possessionMoveDecisions}\n`);
    process.stdout.write(`NONE                      : ${stats.possessionNoneDecisions}\n`);

    process.stdout.write(`\nBOUNDARY\n`);
    process.stdout.write(`Boundary exits            : ${stats.boundaryExits}\n`);
    process.stdout.write(`Boundary transitions      : ${stats.boundaryTransitions}\n`);
    process.stdout.write(`Player out-of-bounds ticks: ${stats.playerOutOfBoundsTicks}\n`);

    process.stdout.write(`\nMOTION\n`);
    process.stdout.write(`Total ball distance       : ${stats.totalBallDistance.toFixed(2)}\n`);
    process.stdout.write(`Max ball speed            : ${stats.maxBallSpeed.toFixed(2)}\n`);
    process.stdout.write(`Max player speed          : ${stats.maxPlayerSpeed.toFixed(2)}\n`);

    process.stdout.write(`\nSTUCK CHECK\n`);
    process.stdout.write(`Stuck player incidents    : ${stats.stuckPlayerIncidents}\n`);
    process.stdout.write(`Stuck ball incidents      : ${stats.stuckBallIncidents}\n`);

    process.stdout.write(`\nFINAL STATE HASH\n`);
    process.stdout.write(`${stats.finalHash}\n`);
}


// ============================================================
// MAIN
// ============================================================

process.stdout.write(`\n============================================================\n`);
process.stdout.write(`90 MINUTE MATCH ENGINE VALIDATION\n`);
process.stdout.write(`============================================================\n`);
process.stdout.write(`Duration : ${MATCH_MINUTES} minutes\n`);
process.stdout.write(`FPS      : ${FPS}\n`);
process.stdout.write(`Ticks    : ${TOTAL_TICKS}\n`);
process.stdout.write(`Runs     : 2\n`);
process.stdout.write(`============================================================\n\n`);

const run1 = runOnce(1);
printSummary('RUN 1 SUMMARY', run1);

const run2 = runOnce(2);
printSummary('RUN 2 SUMMARY', run2);

const deterministic = run1.finalHash === run2.finalHash;

process.stdout.write(`\n============================================================\n`);
process.stdout.write(`DETERMINISM CHECK\n`);
process.stdout.write(`============================================================\n`);
process.stdout.write(`Run 1 hash: ${run1.finalHash}\n`);
process.stdout.write(`Run 2 hash: ${run2.finalHash}\n`);
process.stdout.write(`Identical  : ${deterministic ? 'YES' : 'NO'}\n`);

const coreHealthPass = (
    run1.ticks === TOTAL_TICKS &&
    run2.ticks === TOTAL_TICKS &&
    run1.errors === 0 && run2.errors === 0 &&
    run1.invalidNumbers === 0 && run2.invalidNumbers === 0 &&
    run1.invalidOwner === 0 && run2.invalidOwner === 0 &&
    deterministic
);

process.stdout.write(`\n============================================================\n`);
process.stdout.write(`ENGINE CORE HEALTH\n`);
process.stdout.write(`============================================================\n`);
process.stdout.write(`90 minute run 1 complete : ${run1.ticks === TOTAL_TICKS ? 'YES' : 'NO'}\n`);
process.stdout.write(`90 minute run 2 complete : ${run2.ticks === TOTAL_TICKS ? 'YES' : 'NO'}\n`);
process.stdout.write(`Runtime errors            : ${run1.errors + run2.errors}\n`);
process.stdout.write(`NaN / Infinity            : ${run1.invalidNumbers + run2.invalidNumbers}\n`);
process.stdout.write(`Invalid owner             : ${run1.invalidOwner + run2.invalidOwner}\n`);
process.stdout.write(`Deterministic             : ${deterministic ? 'YES' : 'NO'}\n`);
process.stdout.write(`\nENGINE CORE HEALTH: ${coreHealthPass ? 'PASS' : 'FAIL'}\n`);

process.stdout.write(`\n============================================================\n`);
process.stdout.write(`OBSERVATIONAL PHYSICS REPORT\n`);
process.stdout.write(`============================================================\n`);
process.stdout.write(`Goal detector context     : HOME vs AWAY\n`);
process.stdout.write(`HOME attacking side       : RIGHT\n`);
process.stdout.write(`Restart system            : NOT EXECUTED\n`);
process.stdout.write(`Boundary restart          : NOT EXECUTED\n`);
process.stdout.write(`Goal restart              : NOT EXECUTED\n`);
process.stdout.write(`Goal count method         : NO-GOAL -> GOAL transition\n`);
process.stdout.write(`Boundary count method     : IN-BOUNDS -> OUT transition\n`);
process.stdout.write(`State mutation by test   : NONE\n`);

process.stdout.write(`\n============================================================\n`);
process.stdout.write(`VALIDATION FINISHED\n`);
process.stdout.write(`============================================================\n`);