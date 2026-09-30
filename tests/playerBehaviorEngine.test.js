import { describe, it, expect } from 'vitest';

import {
    PlayerBehaviorEngine,
    BEHAVIORS
} from '../src/engine/PlayerBehaviorEngine.js';


describe('PlayerBehaviorEngine', () => {

    // ------------------------------------------------------------
    // YARDIMCI FONKSİYONLAR
    // ------------------------------------------------------------

    function createState({
        playerPosition = { x: 200, y: 200 },
        playerRole = 'CM',
        playerTeam = 'A',
        opponentPosition = { x: 800, y: 400 },
        ballPosition = { x: 400, y: 300 }
    } = {}) {

        return {
            players: [
                {
                    id: 1,
                    teamId: playerTeam,
                    role: playerRole,
                    position: {
                        x: playerPosition.x,
                        y: playerPosition.y
                    }
                },
                {
                    id: 2,
                    teamId: playerTeam === 'A' ? 'B' : 'A',
                    role: 'CM',
                    position: {
                        x: opponentPosition.x,
                        y: opponentPosition.y
                    }
                }
            ],

            ball: {
                position: {
                    x: ballPosition.x,
                    y: ballPosition.y
                }
            }
        };
    }


    function createTacticalSnapshots({
        tacticalTarget = { x: 300, y: 300 },
        opponentTarget = { x: 800, y: 400 }
    } = {}) {

        return [
            {
                playerId: 1,
                tacticalTarget: {
                    x: tacticalTarget.x,
                    y: tacticalTarget.y
                }
            },
            {
                playerId: 2,
                tacticalTarget: {
                    x: opponentTarget.x,
                    y: opponentTarget.y
                }
            }
        ];
    }


    // ------------------------------------------------------------
    // 1 — MOTOR OLUŞTURMA
    // ------------------------------------------------------------

    it('motor oluşturulabilmeli', () => {

        const engine = new PlayerBehaviorEngine();

        expect(engine)
            .toBeInstanceOf(PlayerBehaviorEngine);
    });


    // ------------------------------------------------------------
    // 2 — KALECİ
    // ------------------------------------------------------------

    it('kaleci HOLD_POSITION üretmeli', () => {

        const engine = new PlayerBehaviorEngine();

        const state = createState({
            playerRole: 'GK',
            playerPosition: { x: 100, y: 300 },
            ballPosition: { x: 400, y: 300 }
        });

        const tacticalSnapshots =
            createTacticalSnapshots({
                tacticalTarget: {
                    x: 100,
                    y: 300
                }
            });

        const result =
            engine.evaluate(
                state,
                tacticalSnapshots
            );

        expect(result[0].behavior)
            .toBe(BEHAVIORS.HOLD_POSITION);
    });


    // ------------------------------------------------------------
    // 3 — TOP ÇOK UZAK
    // ------------------------------------------------------------

    it('top çok uzaktaysa RECOVER_POSITION üretmeli', () => {

        const engine = new PlayerBehaviorEngine();

        const state = createState({
            playerPosition: {
                x: 100,
                y: 100
            },

            ballPosition: {
                x: 600,
                y: 600
            }
        });

        const tacticalSnapshots =
            createTacticalSnapshots();

        const result =
            engine.evaluate(
                state,
                tacticalSnapshots
            );

        expect(result[0].behavior)
            .toBe(BEHAVIORS.RECOVER_POSITION);
    });


    // ------------------------------------------------------------
    // 4 — TOP YAKIN
    // ------------------------------------------------------------

    it('top yakınsa MOVE_TO_BALL üretmeli', () => {

        const engine = new PlayerBehaviorEngine();

        const state = createState({
            playerPosition: {
                x: 300,
                y: 300
            },

            ballPosition: {
                x: 350,
                y: 300
            },

            opponentPosition: {
                x: 800,
                y: 600
            }
        });

        const tacticalSnapshots =
            createTacticalSnapshots();

        const result =
            engine.evaluate(
                state,
                tacticalSnapshots
            );

        expect(result[0].behavior)
            .toBe(BEHAVIORS.MOVE_TO_BALL);
    });


    // ------------------------------------------------------------
    // 5 — YAKIN RAKİP
    // ------------------------------------------------------------

    it('yakın rakip varsa PRESS üretmeli', () => {

        const engine = new PlayerBehaviorEngine();

        const state = createState({
            playerPosition: {
                x: 300,
                y: 300
            },

            opponentPosition: {
                x: 350,
                y: 300
            },

            ballPosition: {
                x: 340,
                y: 300
            }
        });

        const tacticalSnapshots =
            createTacticalSnapshots();

        const result =
            engine.evaluate(
                state,
                tacticalSnapshots
            );

        expect(result[0].behavior)
            .toBe(BEHAVIORS.PRESS);
    });


    // ------------------------------------------------------------
    // 6 — HÜCUM OYUNCUSU
    // ------------------------------------------------------------

    it('hücum oyuncusu RUN_FORWARD üretebilmeli', () => {

        const engine = new PlayerBehaviorEngine();

        const state = createState({
            playerRole: 'ST',

            playerPosition: {
                x: 200,
                y: 300
            },

            ballPosition: {
                x: 450,
                y: 300
            },

            opponentPosition: {
                x: 900,
                y: 500
            }
        });

        const tacticalSnapshots =
            createTacticalSnapshots({
                tacticalTarget: {
                    x: 300,
                    y: 300
                }
            });

        const result =
            engine.evaluate(
                state,
                tacticalSnapshots
            );

        expect(result[0].behavior)
            .toBe(BEHAVIORS.RUN_FORWARD);
    });


    // ------------------------------------------------------------
    // 7 — SUPPORT HEDEF HESABI
    // ------------------------------------------------------------

    it('SUPPORT hedefi taktik hedef ile top etkisini doğru birleştirmeli', () => {

        const engine = new PlayerBehaviorEngine();

        const state = createState({

            playerPosition: {
                x: 200,
                y: 200
            },

            playerRole: 'CM',

            ballPosition: {
                x: 400,
                y: 300
            },

            opponentPosition: {
                x: 900,
                y: 600
            }
        });

        const tacticalSnapshots =
            createTacticalSnapshots({

                tacticalTarget: {
                    x: 300,
                    y: 300
                }
            });

        const result =
            engine.evaluate(
                state,
                tacticalSnapshots
            );

        expect(result[0].behavior)
            .toBe(BEHAVIORS.SUPPORT);

        /*
         * calculateSupportPosition():

         * x = 300 + (400 - 200) * 0.25
         *   = 350
         *
         * y = 300 + (300 - 200) * 0.25
         *   = 325
         */

        expect(result[0].target.x)
            .toBe(350);

        expect(result[0].target.y)
            .toBe(325);
    });


    // ------------------------------------------------------------
    // 8 — EN YAKIN RAKİP
    // ------------------------------------------------------------

    it('en yakın rakibi bulmalı', () => {

        const engine = new PlayerBehaviorEngine();

        const player = {
            id: 1,
            teamId: 'A',
            role: 'CM',
            position: {
                x: 100,
                y: 100
            }
        };

        const players = [

            player,

            {
                id: 2,
                teamId: 'B',
                role: 'CM',
                position: {
                    x: 300,
                    y: 100
                }
            },

            {
                id: 3,
                teamId: 'B',
                role: 'CM',
                position: {
                    x: 150,
                    y: 100
                }
            },

            {
                id: 4,
                teamId: 'A',
                role: 'CM',
                position: {
                    x: 110,
                    y: 100
                }
            }
        ];

        const opponent =
            engine.findNearestOpponent(
                player,
                players
            );

        expect(opponent)
            .not.toBeNull();

        expect(opponent.id)
            .toBe(3);
    });


    // ------------------------------------------------------------
    // 9 — DETERMINISTIC
    // ------------------------------------------------------------

    it('aynı input deterministik sonuç üretmeli', () => {

        const engine = new PlayerBehaviorEngine();

        const state = createState({
            playerPosition: {
                x: 250,
                y: 220
            },

            ballPosition: {
                x: 430,
                y: 280
            },

            opponentPosition: {
                x: 900,
                y: 500
            }
        });

        const tacticalSnapshots =
            createTacticalSnapshots({
                tacticalTarget: {
                    x: 320,
                    y: 310
                }
            });

        const result1 =
            engine.evaluate(
                state,
                tacticalSnapshots
            );

        const result2 =
            engine.evaluate(
                state,
                tacticalSnapshots
            );

        expect(result1)
            .toEqual(result2);
    });


    // ------------------------------------------------------------
    // 10 — STATE MUTATION YOK
    // ------------------------------------------------------------

    it('state üzerinde değişiklik yapmamalı', () => {

        const engine = new PlayerBehaviorEngine();

        const state = createState({
            playerPosition: {
                x: 200,
                y: 200
            },

            ballPosition: {
                x: 400,
                y: 300
            }
        });

        const tacticalSnapshots =
            createTacticalSnapshots();

        const originalState =
            structuredClone(state);

        const originalSnapshots =
            structuredClone(tacticalSnapshots);

        engine.evaluate(
            state,
            tacticalSnapshots
        );

        expect(state)
            .toEqual(originalState);

        expect(tacticalSnapshots)
            .toEqual(originalSnapshots);
    });


    // ------------------------------------------------------------
    // 11 — TACTICAL SNAPSHOT EKSİK
    // ------------------------------------------------------------

    it('eksik tactical snapshot için hata vermeli', () => {

        const engine = new PlayerBehaviorEngine();

        const state = createState();

        const tacticalSnapshots = [];

        expect(() => {

            engine.evaluate(
                state,
                tacticalSnapshots
            );

        }).toThrow(
            'Missing tactical snapshot'
        );
    });


    // ------------------------------------------------------------
    // 12 — GEÇERSİZ STATE
    // ------------------------------------------------------------

    it('geçersiz state için hata vermeli', () => {

        const engine = new PlayerBehaviorEngine();

        expect(() => {

            engine.evaluate(
                null,
                []
            );

        }).toThrow(
            'Valid state is required'
        );
    });


    // ------------------------------------------------------------
    // 13 — BALL YOK
    // ------------------------------------------------------------

    it('ball olmadan çalışmamalı', () => {

        const engine = new PlayerBehaviorEngine();

        const state = {
            players: [
                {
                    id: 1,
                    teamId: 'A',
                    role: 'CM',
                    position: {
                        x: 100,
                        y: 100
                    }
                }
            ]
        };

        const tacticalSnapshots = [
            {
                playerId: 1,
                tacticalTarget: {
                    x: 200,
                    y: 200
                }
            }
        ];

        expect(() => {

            engine.evaluate(
                state,
                tacticalSnapshots
            );

        }).toThrow(
            'state.ball is required'
        );
    });


    // ------------------------------------------------------------
    // 14 — TIE-BREAKER: EŞİT MESAFEDE KÜÇÜK ID KAZANIR
    // ------------------------------------------------------------

    it('eşit mesafedeki rakipler arasında küçük ID kazanmalı (tie-breaker)', () => {

        const engine = new PlayerBehaviorEngine();

        const player = {
            id: 1,
            teamId: 'A',
            role: 'CM',
            position: {
                x: 100,
                y: 100
            }
        };

        /*
         * Rakip #7 ve #3, oyuncuya tam olarak eşit mesafede.
         * İkisi de 100 birim uzakta.
         *
         * Beklenen: küçük ID (#3) seçilmeli.
         */
        const players = [

            player,

            {
                id: 7,
                teamId: 'B',
                role: 'CM',
                position: {
                    x: 200,
                    y: 100
                }
            },

            {
                id: 3,
                teamId: 'B',
                role: 'CM',
                position: {
                    x: 0,
                    y: 100
                }
            }
        ];

        const nearest =
            engine.findNearestOpponent(
                player,
                players
            );

        expect(nearest)
            .not.toBeNull();

        expect(nearest.id)
            .toBe(3);
    });


    // ------------------------------------------------------------
    // 15 — TIE-BREAKER: DİZİ SIRASI DEĞİŞSE BİLE KÜÇÜK ID KAZANIR
    // ------------------------------------------------------------

    it('dizi sırası değişse bile eşit mesafede küçük ID kazanmalı (determinizm)', () => {

        const engine = new PlayerBehaviorEngine();

        const player = {
            id: 1,
            teamId: 'A',
            role: 'CM',
            position: {
                x: 100,
                y: 100
            }
        };

        /*
         * Bu sefer küçük ID (#3) dizide önce geliyor.
         * Sonuç yine #3 olmalı.
         */
        const playersOrderA = [

            player,

            {
                id: 3,
                teamId: 'B',
                role: 'CM',
                position: {
                    x: 0,
                    y: 100
                }
            },

            {
                id: 7,
                teamId: 'B',
                role: 'CM',
                position: {
                    x: 200,
                    y: 100
                }
            }
        ];

        /*
         * Ve ters sıra: büyük ID önce.
         * Sonuç yine #3 olmalı.
         */
        const playersOrderB = [

            player,

            {
                id: 7,
                teamId: 'B',
                role: 'CM',
                position: {
                    x: 200,
                    y: 100
                }
            },

            {
                id: 3,
                teamId: 'B',
                role: 'CM',
                position: {
                    x: 0,
                    y: 100
                }
            }
        ];

        const nearestA =
            engine.findNearestOpponent(
                player,
                playersOrderA
            );

        const nearestB =
            engine.findNearestOpponent(
                player,
                playersOrderB
            );

        expect(nearestA.id)
            .toBe(3);

        expect(nearestB.id)
            .toBe(3);

        expect(nearestA.id)
            .toBe(nearestB.id);
    });


    // ------------------------------------------------------------
    // 16 — HOME FORWARD RUN YÖNÜ
    // ------------------------------------------------------------

    it('HOME takımı RUN_FORWARD sırasında ileri yönde hareket etmeli', () => {

        const engine = new PlayerBehaviorEngine({
            forwardRunDistance: 120
        });

        const state = createState({
            playerRole: 'ST',
            playerTeam: 'HOME',

            playerPosition: {
                x: 200,
                y: 300
            },

            ballPosition: {
                x: 450,
                y: 300
            },

            opponentPosition: {
                x: 900,
                y: 500
            }
        });

        const tacticalSnapshots =
            createTacticalSnapshots({
                tacticalTarget: {
                    x: 300,
                    y: 300
                }
            });

        const result =
            engine.evaluate(
                state,
                tacticalSnapshots
            );

        expect(result[0].behavior)
            .toBe(BEHAVIORS.RUN_FORWARD);

        expect(result[0].target.x)
            .toBe(420);

        expect(result[0].target.y)
            .toBe(300);
    });


    // ------------------------------------------------------------
    // 17 — AWAY FORWARD RUN YÖNÜ
    // ------------------------------------------------------------

    it('AWAY takımı RUN_FORWARD sırasında geriye doğru hareket etmeli', () => {

        const engine = new PlayerBehaviorEngine({
            forwardRunDistance: 120
        });

        const state = createState({
            playerRole: 'ST',
            playerTeam: 'AWAY',

            playerPosition: {
                x: 800,
                y: 300
            },

            ballPosition: {
                x: 550,
                y: 300
            },

            opponentPosition: {
                x: 100,
                y: 500
            }
        });

        const tacticalSnapshots =
            createTacticalSnapshots({
                tacticalTarget: {
                    x: 700,
                    y: 300
                }
            });

        const result =
            engine.evaluate(
                state,
                tacticalSnapshots
            );

        expect(result[0].behavior)
            .toBe(BEHAVIORS.RUN_FORWARD);

        expect(result[0].target.x)
            .toBe(580);

        expect(result[0].target.y)
            .toBe(300);
    });

});