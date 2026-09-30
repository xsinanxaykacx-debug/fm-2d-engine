import { describe, it, expect } from 'vitest';

import { MatchState } from '../src/core/state.js';


describe('MatchState', () => {

    function createPlayer(
        id,
        x = 100,
        y = 200
    ) {

        return {
            id,
            teamId: id === 1 ? 'A' : 'B',
            role: 'CM',
            position: {
                x,
                y
            },
            basePosition: {
                x,
                y
            }
        };
    }


    function createBall(
        x = 400,
        y = 300
    ) {

        return {
            position: {
                x,
                y
            },
            velocity: {
                x: 0,
                y: 0
            }
        };
    }


    // ------------------------------------------------------------
    // 1
    // ------------------------------------------------------------

    it('boş state oluşturulabilmeli', () => {

        const state =
            new MatchState();

        expect(state.players)
            .toEqual([]);

        expect(state.ball)
            .toBeNull();
    });


    // ------------------------------------------------------------
    // 2
    // ------------------------------------------------------------

    it('players doğru şekilde alınmalı', () => {

        const players = [
            createPlayer(1),
            createPlayer(2)
        ];

        const state =
            new MatchState({
                players
            });

        expect(state.players)
            .toHaveLength(2);

        expect(state.players[0].id)
            .toBe(1);

        expect(state.players[1].id)
            .toBe(2);
    });


    // ------------------------------------------------------------
    // 3
    // ------------------------------------------------------------

    it('ball doğru şekilde alınmalı', () => {

        const ball =
            createBall(500, 350);

        const state =
            new MatchState({
                ball
            });

        expect(state.ball.position)
            .toEqual({
                x: 500,
                y: 350
            });
    });


    // ------------------------------------------------------------
    // 4
    // ------------------------------------------------------------

    it('state immutable olmalı', () => {

        const state =
            new MatchState({
                players: [
                    createPlayer(1)
                ],
                ball: createBall()
            });

        expect(Object.isFrozen(state))
            .toBe(true);

        expect(Object.isFrozen(state.players[0]))
            .toBe(true);

        expect(Object.isFrozen(state.ball))
            .toBe(true);
    });


    // ------------------------------------------------------------
    // 5
    // ------------------------------------------------------------

    it('gelen player objesinin üst seviyesini kopyalamalı', () => {

        const player =
            createPlayer(1);

        const state =
            new MatchState({
                players: [player]
            });

        expect(state.players[0])
            .not.toBe(player);

        expect(state.players[0].id)
            .toBe(player.id);
    });


    // ------------------------------------------------------------
    // 6
    // ------------------------------------------------------------

    it('gelen ball objesinin üst seviyesini kopyalamalı', () => {

        const ball =
            createBall();

        const state =
            new MatchState({
                ball
            });

        expect(state.ball)
            .not.toBe(ball);

        expect(state.ball.position)
            .toEqual(ball.position);
    });


    // ------------------------------------------------------------
    // 7
    // ------------------------------------------------------------

    it('nextState yeni state üretmeli', () => {

        const player =
            createPlayer(1, 100, 200);

        const ball =
            createBall(400, 300);

        const state =
            new MatchState({
                players: [player],
                ball
            });

        const nextPlayers = [
            createPlayer(1, 150, 250)
        ];

        const nextBall =
            createBall(450, 350);

        const nextState =
            state.nextState(
                nextPlayers,
                nextBall
            );

        expect(nextState)
            .not.toBe(state);

        expect(nextState.players)
            .not.toBe(state.players);

        expect(nextState.ball)
            .not.toBe(state.ball);
    });


    // ------------------------------------------------------------
    // 8
    // ------------------------------------------------------------

    it('eski state nextState sonrasında değişmemeli', () => {

        const state =
            new MatchState({
                players: [
                    createPlayer(1, 100, 200)
                ],
                ball: createBall(400, 300)
            });

        const original =
            structuredClone(state);

        state.nextState(
            [
                createPlayer(1, 700, 500)
            ],
            createBall(800, 600)
        );

        expect(state.players[0].position)
            .toEqual(original.players[0].position);

        expect(state.ball.position)
            .toEqual(original.ball.position);
    });


    // ------------------------------------------------------------
    // 9
    // ------------------------------------------------------------

    it('nextState yeni oyuncu durumunu taşımalı', () => {

        const state =
            new MatchState({
                players: [
                    createPlayer(1, 100, 200)
                ]
            });

        const nextPlayers = [
            createPlayer(1, 500, 600)
        ];

        const nextState =
            state.nextState(
                nextPlayers,
                null
            );

        expect(nextState.players[0].position)
            .toEqual({
                x: 500,
                y: 600
            });
    });


    // ------------------------------------------------------------
    // 10
    // ------------------------------------------------------------

    it('nextState yeni top durumunu taşımalı', () => {

        const state =
            new MatchState({
                players: [
                    createPlayer(1)
                ],
                ball: createBall(100, 100)
            });

        const nextBall =
            createBall(700, 500);

        const nextState =
            state.nextState(
                state.players,
                nextBall
            );

        expect(nextState.ball.position)
            .toEqual({
                x: 700,
                y: 500
            });
    });


    // ------------------------------------------------------------
    // 11
    // ------------------------------------------------------------

    it('geçersiz players için hata vermeli', () => {

        expect(() => {

            new MatchState({
                players: null
            });

        }).toThrow(
            'players must be an array'
        );
    });


    // ------------------------------------------------------------
    // 12
    // ------------------------------------------------------------

    it('nextState geçersiz players için hata vermeli', () => {

        const state =
            new MatchState();

        expect(() => {

            state.nextState(
                null,
                null
            );

        }).toThrow(
            'players must be an array'
        );
    });


    // ------------------------------------------------------------
    // 13
    // ------------------------------------------------------------

    it('aynı input deterministik state üretmeli', () => {

        const players = [
            createPlayer(1, 100, 200),
            createPlayer(2, 300, 400)
        ];

        const ball =
            createBall(500, 600);

        const state1 =
            new MatchState({
                players,
                ball
            });

        const state2 =
            new MatchState({
                players,
                ball
            });

        expect(state1.players)
            .toEqual(state2.players);

        expect(state1.ball)
            .toEqual(state2.ball);
    });


    // ============================================================
    // DEEP IMMUTABILITY — NESTED OBJECT'LER
    // ============================================================

    // ------------------------------------------------------------
    // 14
    // ------------------------------------------------------------

    it('player.position deep-frozen olmalı', () => {

        const state =
            new MatchState({
                players: [
                    createPlayer(1, 100, 200)
                ]
            });

        expect(
            Object.isFrozen(
                state.players[0].position
            )
        ).toBe(true);
    });


    // ------------------------------------------------------------
    // 15
    // ------------------------------------------------------------

    it('player.basePosition deep-frozen olmalı', () => {

        const state =
            new MatchState({
                players: [
                    createPlayer(1, 100, 200)
                ]
            });

        expect(
            Object.isFrozen(
                state.players[0].basePosition
            )
        ).toBe(true);
    });


    // ------------------------------------------------------------
    // 16
    // ------------------------------------------------------------

    it('player.position mutasyonu TypeError fırlatmalı', () => {

        const state =
            new MatchState({
                players: [
                    createPlayer(1, 100, 200)
                ]
            });

        /*
         * ES module = strict mode.
         * Frozen objeye yazma denemesi TypeError fırlatır.
         */
        expect(() => {
            state.players[0].position.x = 999;
        }).toThrow(TypeError);
    });


    // ------------------------------------------------------------
    // 17
    // ------------------------------------------------------------

    it('ball.position deep-frozen olmalı', () => {

        const state =
            new MatchState({
                ball: createBall(500, 300)
            });

        expect(
            Object.isFrozen(
                state.ball.position
            )
        ).toBe(true);
    });


    // ------------------------------------------------------------
    // 18
    // ------------------------------------------------------------

    it('ball.velocity deep-frozen olmalı', () => {

        const state =
            new MatchState({
                ball: createBall(500, 300)
            });

        expect(
            Object.isFrozen(
                state.ball.velocity
            )
        ).toBe(true);
    });


    // ------------------------------------------------------------
    // 19
    // ------------------------------------------------------------

    it('ball.position mutasyonu TypeError fırlatmalı', () => {

        const state =
            new MatchState({
                ball: createBall(500, 300)
            });

        expect(() => {
            state.ball.position.x = 999;
        }).toThrow(TypeError);
    });


    // ------------------------------------------------------------
    // 20
    // ------------------------------------------------------------

    it('ball.velocity mutasyonu TypeError fırlatmalı', () => {

        const state =
            new MatchState({
                ball: {
                    position: { x: 500, y: 300 },
                    velocity: { x: 10, y: 5 }
                }
            });

        expect(() => {
            state.ball.velocity.x = 999;
        }).toThrow(TypeError);
    });

});