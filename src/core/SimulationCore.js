// src/core/SimulationCore.js

import { MatchState } from './state.js';

export class SimulationCore {

    constructor({
        initialPlayers = [],
        initialBall = null,

        tacticalEngine = null,
        behaviorEngine = null,
        possessionEngine = null,
        possessionStateTransition = null,
        passTargetSelector = null,
        shotDecisionEngine = null,
        decisionEngine = null,
        passExecutor = null,
        shotExecutor = null,

        physicsEngine = null,
        collisionDetector = null,
        collisionStateTransition = null,
        ballPhysics = null,

        timeStep = 1 / 60
    } = {}) {

        this.state = new MatchState({
            players: initialPlayers,
            ball: initialBall
        });

        this.tacticalEngine = tacticalEngine;
        this.behaviorEngine = behaviorEngine;
        this.possessionEngine = possessionEngine;
        this.possessionStateTransition = possessionStateTransition;
        this.passTargetSelector = passTargetSelector;
        this.shotDecisionEngine = shotDecisionEngine;
        this.decisionEngine = decisionEngine;
        this.passExecutor = passExecutor;
        this.shotExecutor = shotExecutor;

        this.physicsEngine = physicsEngine;
        this.collisionDetector = collisionDetector;
        this.collisionStateTransition = collisionStateTransition;
        this.ballPhysics = ballPhysics;

        this.timeStep = timeStep;

        Object.seal(this);
    }


    setState(newState) {

        if (!(newState instanceof MatchState)) {
            throw new TypeError(
                'SimulationCore.setState: newState must be a MatchState instance.'
            );
        }

        this.state = newState;
    }


    tick(options = {}) {

        let currentState = this.state;


        /*
         * 1. TAKTİK
         */
        const tacticalSnapshots =
            this.tacticalEngine
                ? this.tacticalEngine.evaluate(currentState)
                : [];


        /*
         * 2. BEHAVIOR
         */
        const behaviorSnapshots =
            this.behaviorEngine
                ? this.behaviorEngine.evaluate(
                    currentState,
                    tacticalSnapshots
                )
                : [];


        /*
         * 3. POSSESSION
         */
        const possessionSnapshot =
            this.possessionEngine
                ? this.possessionEngine.evaluate(currentState)
                : null;


        /*
         * 3a. POSSESSION STATE TRANSITION
         *
         * PossessionStateTransition yalnızca duran top için
         * gerçek sahipliği başlatabilir.
         *
         * Uçan topun sahipliği:
         *   ReceiverStateTransition
         *   InterceptionStateTransition
         *
         * tarafından belirlenir.
         */
        if (
            possessionSnapshot &&
            this.possessionStateTransition &&
            currentState.ball
        ) {
            const velocity = currentState.ball.velocity ?? { x: 0, y: 0 };

            const ballSpeed = Math.hypot(
                velocity.x,
                velocity.y
            );

            if (ballSpeed < 0.01) {
                const nextBall =
                    this.possessionStateTransition.apply(
                        currentState.ball,
                        possessionSnapshot
                    );

                if (nextBall !== currentState.ball) {
                    currentState = currentState.nextState(
                        currentState.players,
                        nextBall
                    );
                }
            }
        }


        /*
         * 4. PASS TARGET SELECTION
         */
        const passTargets =
            this.passTargetSelector && possessionSnapshot
                ? this.passTargetSelector.select(
                    currentState,
                    possessionSnapshot,
                    behaviorSnapshots
                )
                : [];


        /*
         * 5. SHOT DECISION
         */
        const shotDecisions =
            this.shotDecisionEngine && possessionSnapshot
                ? this.shotDecisionEngine.evaluate(
                    currentState,
                    possessionSnapshot
                )
                : [];


        /*
         * 6. DECISION
         */
        const decisions =
            this.decisionEngine
                ? this.decisionEngine.evaluate(
                    currentState,
                    tacticalSnapshots,
                    behaviorSnapshots,
                    possessionSnapshot,
                    passTargets,
                    shotDecisions
                )
                : [];


        /*
         * 7. EFFECTIVE DECISIONS (playerId bazında override)
         */
        let effectiveDecisions = decisions;

        if (options.shotDecision) {

            const manualShot = options.shotDecision;

            effectiveDecisions = decisions.map(decision =>
                decision.playerId === manualShot.playerId
                    ? manualShot
                    : decision
            );

            const exists = decisions.some(
                decision =>
                    decision.playerId === manualShot.playerId
            );

            if (!exists) {
                effectiveDecisions = [
                    ...effectiveDecisions,
                    manualShot
                ];
            }
        }


        /*
         * 8. PASS EXECUTION
         */
        const stateAfterPass =
            this.passExecutor && possessionSnapshot
                ? this.passExecutor.execute(
                    currentState,
                    effectiveDecisions,
                    possessionSnapshot
                )
                : currentState;

        currentState = stateAfterPass;


        /*
         * 9. SHOT EXECUTION
         */
        const stateAfterShot =
            this.shotExecutor && possessionSnapshot
                ? this.shotExecutor.execute(
                    currentState,
                    effectiveDecisions,
                    possessionSnapshot,
                    {
                        targetPosition: options.targetPosition
                    }
                )
                : currentState;

        currentState = stateAfterShot;


        /*
         * 10. PLAYER PHYSICS
         */
        const movedPlayers =
            this.physicsEngine
                ? this.physicsEngine.step(
                    currentState.players,
                    effectiveDecisions,
                    this.timeStep
                )
                : currentState.players;


        /*
         * 11. COLLISION
         */
        let resolvedPlayers = movedPlayers;

        if (this.collisionDetector) {

            const collisions =
                this.collisionDetector.detectPlayerOverlaps(
                    movedPlayers
                );

            if (
                this.collisionStateTransition &&
                collisions.length > 0
            ) {

                resolvedPlayers =
                    this.collisionStateTransition.apply(
                        movedPlayers,
                        collisions
                    );
            }
        }


        /*
         * 12. BALL PHYSICS
         */
        const newBall =
            this.ballPhysics && currentState.ball
                ? this.ballPhysics.step(
                    currentState.ball,
                    this.timeStep
                )
                : currentState.ball;


        /*
         * 13. NEW STATE
         */
        const nextState =
            currentState.nextState(
                resolvedPlayers,
                newBall
            );

        this.setState(nextState);


        /*
         * 14. PASS INFO
         */
        const passDecision =
            effectiveDecisions.find(
                decision => decision.action === 'PASS'
            );

        let passInfo;

        if (passDecision) {

            const passer = currentState.players.find(
                player => player.id === passDecision.playerId
            );

            const passerTeamId =
                passer ? passer.teamId : null;

            passInfo = {
                passerTeamId,
                receivingTeamId: passerTeamId,
                targetReceiverId:
                    passDecision.receiverId ?? null
            };

        } else {

            passInfo = {
                passerTeamId: null,
                receivingTeamId: null,
                targetReceiverId: null
            };
        }


        /*
         * 15. TICK RESULT
         */
        return {
            state: this.state,
            tacticalSnapshots,
            behaviorSnapshots,
            possessionSnapshot,
            passTargets,
            shotDecisions,
            decisions: effectiveDecisions,
            passInfo
        };
    }
}