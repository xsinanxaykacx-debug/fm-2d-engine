// src/core/MatchEngine.js

export class MatchEngine {

    constructor({
        simulationCore,
        tickOrchestrator = null,
        timeStep = 1 / 60
    } = {}) {

        if (!simulationCore) {
            throw new TypeError(
                'MatchEngine: simulationCore is required.'
            );
        }

        if (
            tickOrchestrator !== null &&
            typeof tickOrchestrator.tick !== 'function'
        ) {
            throw new TypeError(
                'MatchEngine: tickOrchestrator.tick() is required.'
            );
        }

        if (
            !Number.isFinite(timeStep) ||
            timeStep <= 0
        ) {
            throw new TypeError(
                'MatchEngine: timeStep must be positive.'
            );
        }

        this.simulationCore =
            simulationCore;

        this.tickOrchestrator =
            tickOrchestrator;

        this.timeStep =
            timeStep;

        this.tickCount = 0;

        this.elapsedTime = 0;

        this.running = false;

        Object.seal(this);
    }


    get state() {

        return this.simulationCore.state;
    }


    tick(options = {}) {

        const previousState =
            this.simulationCore.state;


        /*
         * 1. TEMEL OYUNCU / FİZİK MOTORU
         *
         * Tactical
         * Behavior
         * Possession
         * PassTargetSelector
         * Decision
         * PassExecutor
         * PhysicsEngine
         * Collision
         * BallPhysics
         */
        const coreResult =
            this.simulationCore.tick(options);


        let finalState =
            coreResult.state;


        /*
         * 2. TOP OLAYLARI / ORKESTRASYON
         *
         * TickOrchestrator mevcut state
         * üzerinden çalışır.
         *
         * Fizik YAPMAZ.
         * Zaman İLERLETMEZ.
         */
        if (this.tickOrchestrator) {

            /*
             * Orchestrator options:
             *
             * Öncelik sırası:
             *   1. SimulationCore.passInfo (bu tick'te üretildi)
             *   2. Dışarıdan gelen options
             *   3. null
             *
             * Bu sayede aynı tick'te üretilen gerçek PASS
             * bilgisi, dışarıdan verilen eski/manuel değerle
             * ezilmez.
             */
            const orchestratorOptions = {
                passerTeamId:
                    coreResult.passInfo?.passerTeamId ??
                    options.passerTeamId ??
                    null,

                receivingTeamId:
                    coreResult.passInfo?.receivingTeamId ??
                    options.receivingTeamId ??
                    null,

                targetReceiverId:
                    coreResult.passInfo?.targetReceiverId ??
                    options.targetReceiverId ??
                    null
            };

            finalState =
                this.tickOrchestrator.tick(
                    finalState,
                    orchestratorOptions
                );

            /*
             * SimulationCore'un state'ini
             * orkestrasyon sonrası state'e
             * taşıyoruz.
             */
            this.simulationCore.setState(finalState);
        }


        this.tickCount++;

        this.elapsedTime +=
            this.timeStep;


        return {
            ...coreResult,

            previousState,

            state:
                finalState,

            tick:
                this.tickCount,

            elapsedTime:
                this.elapsedTime
        };
    }


    runTicks(count, options = {}) {

        if (
            !Number.isInteger(count) ||
            count < 0
        ) {
            throw new TypeError(
                'MatchEngine.runTicks: count must be a non-negative integer.'
            );
        }

        const results = [];

        for (
            let i = 0;
            i < count;
            i++
        ) {

            results.push(
                this.tick(options)
            );
        }

        return results;
    }


    runForSeconds(
        seconds,
        options = {}
    ) {

        if (
            !Number.isFinite(seconds) ||
            seconds < 0
        ) {
            throw new TypeError(
                'MatchEngine.runForSeconds: seconds must be non-negative.'
            );
        }

        const tickCount =
            Math.ceil(
                seconds / this.timeStep
            );

        return this.runTicks(
            tickCount,
            options
        );
    }


    start() {

        if (this.running) {
            return false;
        }

        this.running = true;

        return true;
    }


    stop() {

        if (!this.running) {
            return false;
        }

        this.running = false;

        return true;
    }


    reset() {

        this.tickCount = 0;

        this.elapsedTime = 0;

        this.running = false;
    }
}