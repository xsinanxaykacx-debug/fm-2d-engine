// src/engine/TickOrchestrator.js

export class TickOrchestrator {

    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.interceptionDetector
     * @param {Object} dependencies.interceptionStateTransition
     * @param {Object} dependencies.receiverDetector
     * @param {Object} dependencies.receiverStateTransition
     */
    constructor(dependencies = {}) {

        const {
            interceptionDetector,
            interceptionStateTransition,
            receiverDetector,
            receiverStateTransition
        } = dependencies;

        if (
            !interceptionDetector ||
            typeof interceptionDetector.evaluate !== 'function'
        ) {
            throw new TypeError(
                'TickOrchestrator: "interceptionDetector" with evaluate() is required.'
            );
        }

        if (
            !interceptionStateTransition ||
            typeof interceptionStateTransition.apply !== 'function'
        ) {
            throw new TypeError(
                'TickOrchestrator: "interceptionStateTransition" with apply() is required.'
            );
        }

        if (
            !receiverDetector ||
            typeof receiverDetector.evaluate !== 'function'
        ) {
            throw new TypeError(
                'TickOrchestrator: "receiverDetector" with evaluate() is required.'
            );
        }

        if (
            !receiverStateTransition ||
            typeof receiverStateTransition.apply !== 'function'
        ) {
            throw new TypeError(
                'TickOrchestrator: "receiverStateTransition" with apply() is required.'
            );
        }

        this.interceptionDetector = interceptionDetector;
        this.interceptionStateTransition = interceptionStateTransition;
        this.receiverDetector = receiverDetector;
        this.receiverStateTransition = receiverStateTransition;

        Object.freeze(this);
    }


    /**
     * State[t+1] üzerinde top olaylarını uygular.
     *
     * Fiziksel zamanı İLERLETMEZ.
     * dt parametresi YOKTUR.
     *
     * @param {Object} state
     * @param {Object} [options={}]
     * @param {string|number|null} [options.passerTeamId=null]
     * @param {string|number|null} [options.receivingTeamId=null]
     * @param {string|number|null} [options.targetReceiverId=null]
     * @returns {Object} State[t+1'] — olay uygulanmış hali
     */
    tick(state, options = {}) {

        // Guard 1: State integrity
        if (
            !state ||
            typeof state !== 'object' ||
            !state.ball ||
            !Array.isArray(state.players)
        ) {
            throw new TypeError(
                'TickOrchestrator.tick: Valid "state" with ball and players is required.'
            );
        }

        if (typeof state.nextState !== 'function') {
            throw new TypeError(
                'TickOrchestrator.tick: "state.nextState" method is required.'
            );
        }

        const {
            passerTeamId = null,
            receivingTeamId = null,
            targetReceiverId = null
        } = options;

        /*
         * passerTeamId fallback:
         *
         * Eğer passerTeamId verilmediyse ama receivingTeamId
         * verildiyse, ikisi aynı takım olduğu için
         * receivingTeamId'yi passerTeamId olarak kullan.
         *
         * Bu, mevcut testlerin (yalnızca receivingTeamId
         * gönderen) kırılmamasını sağlar.
         */
        const resolvedPasserTeamId =
            passerTeamId !== null
                ? passerTeamId
                : receivingTeamId;

        const currentState = state;
        const currentBall = currentState.ball;

        /*
         * Sadece top sahipsizken (FREE BALL)
         * interception ve receiver olayları değerlendirilir.
         */
        if (currentBall.ownerId === null) {

            // STEP 1: Interception (öncelikli)
            if (resolvedPasserTeamId !== null) {

                const interceptionSnap =
                    this.interceptionDetector.evaluate(
                        currentState,
                        resolvedPasserTeamId
                    );

                if (
                    interceptionSnap &&
                    interceptionSnap.hasCandidate
                ) {

                    const nextBall =
                        this.interceptionStateTransition.apply(
                            currentBall,
                            interceptionSnap
                        );

                    return currentState.nextState(
                        currentState.players,
                        nextBall
                    );
                }
            }

            // STEP 2: Receiver (interception yoksa)
            if (receivingTeamId !== null) {

                const receiverSnap =
                    this.receiverDetector.evaluate(
                        currentState,
                        receivingTeamId,
                        targetReceiverId
                    );

                if (
                    receiverSnap &&
                    receiverSnap.hasReceiver
                ) {
                    return this.receiverStateTransition.apply(
                        currentState,
                        receiverSnap
                    );
                }
            }
        }

        /*
         * Hiçbir olay yoksa state aynen döner.
         */
        return currentState;
    }
}