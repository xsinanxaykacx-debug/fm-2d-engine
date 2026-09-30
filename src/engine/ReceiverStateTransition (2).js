// src/engine/ReceiverStateTransition.js

export class ReceiverStateTransition {
    constructor() {
        Object.freeze(this);
    }

    /**
     * Applies receiver ball control to MatchState based on ReceiverSnapshot.
     *
     * @param {Object} state - Current MatchState object
     * @param {Object} snapshot - ReceiverSnapshot object from ReceiverDetector
     * @returns {Object} Updated MatchState object or identical state reference if no change
     */
    apply(state, snapshot) {

        // Guard 1: Strict State validation
        if (!state || typeof state !== 'object') {
            throw new TypeError(
                'ReceiverStateTransition.apply: "state" must be a valid object.'
            );
        }

        if (!state.ball || typeof state.ball !== 'object') {
            throw new TypeError(
                'ReceiverStateTransition.apply: "state.ball" is missing or invalid.'
            );
        }

        if (!Array.isArray(state.players)) {
            throw new TypeError(
                'ReceiverStateTransition.apply: "state.players" must be an array.'
            );
        }

        if (typeof state.nextState !== 'function') {
            throw new TypeError(
                'ReceiverStateTransition.apply: "state.nextState" method is required.'
            );
        }

        // Guard 2: Snapshot validation
        if (!snapshot || typeof snapshot !== 'object') {
            throw new TypeError(
                'ReceiverStateTransition.apply: "snapshot" must be a valid object.'
            );
        }

        // Rule: If no receiver, state remains untouched
        if (!snapshot.hasReceiver) {
            return state;
        }

        // Guard 3: Strict receiver validation
        const { receiverId } = snapshot;

        if (receiverId === null || receiverId === undefined) {
            throw new Error(
                'ReceiverStateTransition.apply: "snapshot.receiverId" is required when hasReceiver is true.'
            );
        }

        const receiverPlayer = state.players.find(
            p => p.id === receiverId
        );

        if (!receiverPlayer) {
            throw new Error(
                `ReceiverStateTransition.apply: Receiver player with ID "${receiverId}" not found in state.players.`
            );
        }

        // Ball transition: cloneWith varsa kullan, yoksa plain clone fallback
        const ballChanges = {
            ownerId: receiverPlayer.id,
            velocity: { x: 0, y: 0 },
            position: {
                x: receiverPlayer.position.x,
                y: receiverPlayer.position.y
            }
        };

        let newBall;

        if (typeof state.ball.cloneWith === 'function') {
            newBall = state.ball.cloneWith(ballChanges);
        } else {
            newBall = Object.freeze({
                ...state.ball,
                ownerId: ballChanges.ownerId,
                velocity: Object.freeze({ ...ballChanges.velocity }),
                position: Object.freeze({ ...ballChanges.position })
            });
        }

        return state.nextState(state.players, newBall);
    }
}