// src/engine/PossessionEngine.js

export class PossessionEngine {
    constructor({
        controlRadius = 12.0
    } = {}) {
        this.config = Object.freeze({
            controlRadius
        });

        Object.freeze(this);
    }

    /**
     * Pure possession evaluation.
     *
     * INPUT:
     *   MatchState
     *
     * OUTPUT:
     *   PossessionSnapshot
     *
     * Bu sınıf:
     *   - MatchState mutate etmez
     *   - Ball mutate etmez
     *   - Player mutate etmez
     *   - ball.ownerId değiştirmez
     *   - Pas / tackle / şut kararı vermez
     */
    evaluate(state) {
        if (
            !state ||
            !state.ball ||
            !state.players ||
            state.players.length === 0
        ) {
            return Object.freeze({
                state: 'FREE',
                ownerId: null,
                nearestPlayerId: null,
                distance: Infinity,
                nearestOpponentId: null,
                nearestOpponentDistance: Infinity
            });
        }

        const ballPos = state.ball.position;

        let nearestPlayer = null;
        let minDistance = Infinity;

        // 1. Topa en yakın oyuncuyu bul
        //
        // Tie-breaker: Eşit mesafede küçük ID kazanır.
        // Determinizm için kritik — dizi sırası sonucu değiştirmemelidir.
        for (let i = 0; i < state.players.length; i++) {
            const player = state.players[i];

            const dx = player.position.x - ballPos.x;
            const dy = player.position.y - ballPos.y;

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (
                distance < minDistance ||
                (
                    nearestPlayer !== null &&
                    Math.abs(distance - minDistance) < 1e-9 &&
                    player.id < nearestPlayer.id
                )
            ) {
                minDistance = distance;
                nearestPlayer = player;
            }
        }

        if (!nearestPlayer) {
            return Object.freeze({
                state: 'FREE',
                ownerId: null,
                nearestPlayerId: null,
                distance: Infinity,
                nearestOpponentId: null,
                nearestOpponentDistance: Infinity
            });
        }

        // 2. En yakın rakip oyuncuyu bul
        //
        // Tie-breaker: Eşit mesafede küçük ID kazanır.
        let nearestOpponent = null;
        let minOpponentDistance = Infinity;

        for (let i = 0; i < state.players.length; i++) {
            const player = state.players[i];

            if (player.teamId === nearestPlayer.teamId) {
                continue;
            }

            const dx = player.position.x - ballPos.x;
            const dy = player.position.y - ballPos.y;

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (
                distance < minOpponentDistance ||
                (
                    nearestOpponent !== null &&
                    Math.abs(distance - minOpponentDistance) < 1e-9 &&
                    player.id < nearestOpponent.id
                )
            ) {
                minOpponentDistance = distance;
                nearestOpponent = player;
            }
        }

        // 3. Possession durumu kararı
        const isControlled = minDistance <= this.config.controlRadius;
        const possessionState = isControlled ? 'CONTROLLED' : 'FREE';
        const ownerId = isControlled ? nearestPlayer.id : null;

        return Object.freeze({
            state: possessionState,
            ownerId,
            nearestPlayerId: nearestPlayer.id,
            distance: minDistance,
            nearestOpponentId: nearestOpponent ? nearestOpponent.id : null,
            nearestOpponentDistance: minOpponentDistance
        });
    }
}