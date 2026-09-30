// src/engine/TacticalEngine.js

export class TacticalEngine {

    /**
     * @param {Object} [options]
     * @param {Object|null} [options.pitchContext=null]
     */
    constructor({ pitchContext = null } = {}) {

        if (
            pitchContext !== null &&
            typeof pitchContext !== 'object'
        ) {
            throw new TypeError(
                'TacticalEngine: pitchContext must be an object or null.'
            );
        }

        this.pitchContext = pitchContext;

        Object.freeze(this);
    }


    /**
     * TacticalSnapshot[] üretir.
     *
     * Sorumluluk:
     *   MatchState + players (basePosition) → tacticalTarget[]
     *
     * Sorumluluk DIŞI:
     *   - Oyuncuyu hareket ettirmez
     *   - PASS / SHOT kararı vermez
     *   - State değiştirmez
     *   - Role henüz kullanılmaz
     *   - PitchContext bu sürümde doğrulama dışında kullanılmaz
     *
     * @param {Object} state - MatchState
     * @returns {Array} Immutable TacticalSnapshot[]
     */
    evaluate(state) {

        if (!state || typeof state !== 'object') {
            throw new TypeError(
                'TacticalEngine.evaluate: Valid state is required.'
            );
        }

        if (!Array.isArray(state.players)) {
            throw new TypeError(
                'TacticalEngine.evaluate: state.players must be an array.'
            );
        }

        return Object.freeze(
            state.players.map(player => {

                if (!player || typeof player !== 'object') {
                    throw new TypeError(
                        'TacticalEngine.evaluate: Invalid player.'
                    );
                }

                if (
                    player.id === undefined ||
                    player.id === null
                ) {
                    throw new TypeError(
                        'TacticalEngine.evaluate: Player id is required.'
                    );
                }

                if (
                    !player.basePosition ||
                    typeof player.basePosition !== 'object'
                ) {
                    throw new TypeError(
                        `TacticalEngine.evaluate: Player ${player.id} missing basePosition.`
                    );
                }

                const { x, y } =
                    player.basePosition;

                if (
                    !Number.isFinite(x) ||
                    !Number.isFinite(y)
                ) {
                    throw new TypeError(
                        `TacticalEngine.evaluate: Player ${player.id} has invalid basePosition.`
                    );
                }

                return Object.freeze({
                    playerId: player.id,

                    tacticalTarget: Object.freeze({
                        x,
                        y
                    })
                });
            })
        );
    }
}