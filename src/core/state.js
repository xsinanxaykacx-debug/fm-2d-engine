export class MatchState {

    constructor({
        players = [],
        ball = null
    } = {}) {

        if (!Array.isArray(players)) {
            throw new TypeError(
                'MatchState: players must be an array.'
            );
        }

        this.players = players.map(player =>
            MatchState.freezePlayer(player)
        );

        this.ball = ball
            ? MatchState.freezeBall(ball)
            : null;

        Object.freeze(this);
    }


    /**
     * Player objesini deep-freeze eder.
     *
     * Üst seviye + position + basePosition
     * (varsa) nested objeler dondurulur.
     */
    static freezePlayer(player) {

        if (
            !player ||
            typeof player !== 'object'
        ) {
            throw new TypeError(
                'MatchState: Each player must be an object.'
            );
        }

        const frozen = {
            ...player
        };

        if (
            frozen.position &&
            typeof frozen.position === 'object'
        ) {
            frozen.position = Object.freeze({
                ...frozen.position
            });
        }

        if (
            frozen.basePosition &&
            typeof frozen.basePosition === 'object'
        ) {
            frozen.basePosition = Object.freeze({
                ...frozen.basePosition
            });
        }

        return Object.freeze(frozen);
    }


    /**
     * Ball objesini deep-freeze eder.
     *
     * Üst seviye + position + velocity +
     * exitPosition (varsa) dondurulur.
     */
    static freezeBall(ball) {

        if (
            !ball ||
            typeof ball !== 'object'
        ) {
            throw new TypeError(
                'MatchState: ball must be an object.'
            );
        }

        const frozen = {
            ...ball
        };

        if (
            frozen.position &&
            typeof frozen.position === 'object'
        ) {
            frozen.position = Object.freeze({
                ...frozen.position
            });
        }

        if (
            frozen.velocity &&
            typeof frozen.velocity === 'object'
        ) {
            frozen.velocity = Object.freeze({
                ...frozen.velocity
            });
        }

        if (
            frozen.exitPosition &&
            typeof frozen.exitPosition === 'object'
        ) {
            frozen.exitPosition = Object.freeze({
                ...frozen.exitPosition
            });
        }

        return Object.freeze(frozen);
    }


    nextState(
        players = this.players,
        ball = this.ball
    ) {

        if (!Array.isArray(players)) {
            throw new TypeError(
                'MatchState.nextState: players must be an array.'
            );
        }

        return new MatchState({
            players,
            ball
        });
    }
}