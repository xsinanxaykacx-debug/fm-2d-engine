import { describe, it, expect } from 'vitest';

import { PhysicsEngine } from '../src/engine/PhysicsEngine.js';


describe('PhysicsEngine', () => {

    function createPlayer({
        id = 1,
        x = 100,
        y = 100
    } = {}) {

        return {
            id,
            teamId: 'A',
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


    function createDecision({
        playerId = 1,
        action = 'MOVE',
        x = 200,
        y = 100
    } = {}) {

        return {
            playerId,
            action,
            target: {
                x,
                y
            }
        };
    }


    // ------------------------------------------------------------
    // 1
    // ------------------------------------------------------------

    it('motor oluşturulabilmeli', () => {

        const engine =
            new PhysicsEngine();

        expect(engine)
            .toBeInstanceOf(PhysicsEngine);
    });


    // ------------------------------------------------------------
    // 2
    // ------------------------------------------------------------

    it('oyuncuyu hedefe doğru hareket ettirmeli', () => {

        const engine =
            new PhysicsEngine({
                playerSpeed: 120
            });

        const players = [
            createPlayer({
                x: 100,
                y: 100
            })
        ];

        const decisions = [
            createDecision({
                x: 200,
                y: 100
            })
        ];

        const result =
            engine.step(
                players,
                decisions,
                1 / 60
            );

        expect(result[0].position.x)
            .toBe(102);

        expect(result[0].position.y)
            .toBe(100);
    });


    // ------------------------------------------------------------
    // 3
    // ------------------------------------------------------------

    it('Y ekseninde doğru hareket etmeli', () => {

        const engine =
            new PhysicsEngine({
                playerSpeed: 120
            });

        const players = [
            createPlayer({
                x: 100,
                y: 100
            })
        ];

        const decisions = [
            createDecision({
                x: 100,
                y: 200
            })
        ];

        const result =
            engine.step(
                players,
                decisions,
                1 / 60
            );

        expect(result[0].position.x)
            .toBe(100);

        expect(result[0].position.y)
            .toBe(102);
    });


    // ------------------------------------------------------------
    // 4
    // ------------------------------------------------------------

    it('çapraz hareket doğru hesaplanmalı', () => {

        const engine =
            new PhysicsEngine({
                playerSpeed: 120
            });

        const players = [
            createPlayer({
                x: 0,
                y: 0
            })
        ];

        const decisions = [
            createDecision({
                x: 100,
                y: 100
            })
        ];

        const result =
            engine.step(
                players,
                decisions,
                1 / 60
            );

        const expected =
            2 / Math.sqrt(2);

        expect(result[0].position.x)
            .toBeCloseTo(expected, 10);

        expect(result[0].position.y)
            .toBeCloseTo(expected, 10);
    });


    // ------------------------------------------------------------
    // 5
    // ------------------------------------------------------------

    it('hedefe ulaşıldığında hedefi geçmemeli', () => {

        const engine =
            new PhysicsEngine({
                playerSpeed: 120
            });

        const players = [
            createPlayer({
                x: 100,
                y: 100
            })
        ];

        const decisions = [
            createDecision({
                x: 101,
                y: 100
            })
        ];

        const result =
            engine.step(
                players,
                decisions,
                1 / 60
            );

        expect(result[0].position.x)
            .toBe(101);

        expect(result[0].position.y)
            .toBe(100);
    });


    // ------------------------------------------------------------
    // 6
    // ------------------------------------------------------------

    it('MOVE olmayan karar oyuncuyu hareket ettirmemeli', () => {

        const engine =
            new PhysicsEngine();

        const players = [
            createPlayer({
                x: 100,
                y: 100
            })
        ];

        const decisions = [
            createDecision({
                action: 'NONE',
                x: 500,
                y: 500
            })
        ];

        const result =
            engine.step(
                players,
                decisions,
                1 / 60
            );

        expect(result[0].position)
            .toEqual({
                x: 100,
                y: 100
            });
    });


    // ------------------------------------------------------------
    // 7
    // ------------------------------------------------------------

    it('kararı olmayan oyuncu yerinde kalmalı', () => {

        const engine =
            new PhysicsEngine();

        const players = [
            createPlayer({
                id: 1,
                x: 100,
                y: 100
            }),
            createPlayer({
                id: 2,
                x: 300,
                y: 300
            })
        ];

        const decisions = [
            createDecision({
                playerId: 1,
                x: 500,
                y: 500
            })
        ];

        const result =
            engine.step(
                players,
                decisions,
                1 / 60
            );

        expect(result[0].position.x)
            .not.toBe(100);

        expect(result[1].position)
            .toEqual({
                x: 300,
                y: 300
            });
    });


    // ------------------------------------------------------------
    // 8
    // ------------------------------------------------------------

    it('oyuncu sayısı korunmalı', () => {

        const engine =
            new PhysicsEngine();

        const players = [
            createPlayer({ id: 1 }),
            createPlayer({
                id: 2,
                x: 200,
                y: 200
            }),
            createPlayer({
                id: 3,
                x: 300,
                y: 300
            })
        ];

        const decisions = [
            createDecision({
                playerId: 1,
                x: 500,
                y: 500
            })
        ];

        const result =
            engine.step(
                players,
                decisions,
                1 / 60
            );

        expect(result)
            .toHaveLength(3);
    });


    // ------------------------------------------------------------
    // 9
    // ------------------------------------------------------------

    it('state üzerinde değişiklik yapmamalı', () => {

        const engine =
            new PhysicsEngine();

        const players = [
            createPlayer({
                x: 100,
                y: 100
            })
        ];

        const decisions = [
            createDecision({
                x: 500,
                y: 500
            })
        ];

        const originalPlayers =
            structuredClone(players);

        const originalDecisions =
            structuredClone(decisions);

        engine.step(
            players,
            decisions,
            1 / 60
        );

        expect(players)
            .toEqual(originalPlayers);

        expect(decisions)
            .toEqual(originalDecisions);
    });


    // ------------------------------------------------------------
    // 10
    // ------------------------------------------------------------

    it('aynı input deterministik sonuç üretmeli', () => {

        const engine =
            new PhysicsEngine();

        const players = [
            createPlayer({
                x: 100,
                y: 150
            })
        ];

        const decisions = [
            createDecision({
                x: 500,
                y: 400
            })
        ];

        const result1 =
            engine.step(
                players,
                decisions,
                1 / 60
            );

        const result2 =
            engine.step(
                players,
                decisions,
                1 / 60
            );

        expect(result1)
            .toEqual(result2);
    });


    // ------------------------------------------------------------
    // 11
    // ------------------------------------------------------------

    it('sonuç oyuncu objesini yeniden üretmeli', () => {

        const engine =
            new PhysicsEngine();

        const player =
            createPlayer();

        const result =
            engine.step(
                [player],
                [
                    createDecision()
                ],
                1 / 60
            );

        expect(result[0])
            .not.toBe(player);
    });


    // ------------------------------------------------------------
    // 12
    // ------------------------------------------------------------

    it('pozisyon immutable olmalı', () => {

        const engine =
            new PhysicsEngine();

        const result =
            engine.step(
                [
                    createPlayer()
                ],
                [
                    createDecision()
                ],
                1 / 60
            );

        expect(
            Object.isFrozen(
                result[0].position
            )
        ).toBe(true);
    });


    // ------------------------------------------------------------
    // 13
    // ------------------------------------------------------------

    it('geçersiz timestep için hata vermeli', () => {

        const engine =
            new PhysicsEngine();

        expect(() => {

            engine.step(
                [
                    createPlayer()
                ],
                [
                    createDecision()
                ],
                0
            );

        }).toThrow(
            'timeStep must be positive'
        );
    });


    // ------------------------------------------------------------
    // 14
    // ------------------------------------------------------------

    it('geçersiz players için hata vermeli', () => {

        const engine =
            new PhysicsEngine();

        expect(() => {

            engine.step(
                null,
                [],
                1 / 60
            );

        }).toThrow(
            'players must be an array'
        );
    });


    // ------------------------------------------------------------
    // 15
    // ------------------------------------------------------------

    it('geçersiz decisions için hata vermeli', () => {

        const engine =
            new PhysicsEngine();

        expect(() => {

            engine.step(
                [
                    createPlayer()
                ],
                null,
                1 / 60
            );

        }).toThrow(
            'decisions must be an array'
        );
    });


    // ============================================================
    // BOUNDARY CLAMPING TESTLERİ (YENİ)
    // ============================================================

    // ------------------------------------------------------------
    // 16 — Sağ sınır tam kenarda durmalı
    // ------------------------------------------------------------

    it('oyuncu sağ sınırda tam olarak durmalı', () => {

        const engine = new PhysicsEngine({
            playerSpeed: 120,
            pitchWidth: 105,
            pitchHeight: 68
        });

        const players = [
            createPlayer({
                x: 104,
                y: 34
            })
        ];

        const decisions = [
            createDecision({
                x: 200,
                y: 34
            })
        ];

        const result = engine.step(players, decisions, 1 / 60);

        // 104 + 2 = 106 → clamp → 105
        expect(result[0].position.x).toBe(105);
        expect(result[0].position.y).toBe(34);
    });


    // ------------------------------------------------------------
    // 17 — Sol sınır tam kenarda durmalı
    // ------------------------------------------------------------

    it('oyuncu sol sınırda tam olarak durmalı', () => {

        const engine = new PhysicsEngine({
            playerSpeed: 120,
            pitchWidth: 105,
            pitchHeight: 68
        });

        const players = [
            createPlayer({
                x: 1,
                y: 34
            })
        ];

        const decisions = [
            createDecision({
                x: -100,
                y: 34
            })
        ];

        const result = engine.step(players, decisions, 1 / 60);

        // 1 - 2 = -1 → clamp → 0
        expect(result[0].position.x).toBe(0);
    });


    // ------------------------------------------------------------
    // 18 — Alt sınır
    // ------------------------------------------------------------

    it('oyuncu alt sınırda tam olarak durmalı', () => {

        const engine = new PhysicsEngine({
            playerSpeed: 120,
            pitchWidth: 105,
            pitchHeight: 68
        });

        const players = [
            createPlayer({
                x: 50,
                y: 67
            })
        ];

        const decisions = [
            createDecision({
                x: 50,
                y: 200
            })
        ];

        const result = engine.step(players, decisions, 1 / 60);

        // 67 + 2 = 69 → clamp → 68
        expect(result[0].position.y).toBe(68);
    });


    // ------------------------------------------------------------
    // 19 — Üst sınır
    // ------------------------------------------------------------

    it('oyuncu üst sınırda tam olarak durmalı', () => {

        const engine = new PhysicsEngine({
            playerSpeed: 120,
            pitchWidth: 105,
            pitchHeight: 68
        });

        const players = [
            createPlayer({
                x: 50,
                y: 1
            })
        ];

        const decisions = [
            createDecision({
                x: 50,
                y: -100
            })
        ];

        const result = engine.step(players, decisions, 1 / 60);

        // 1 - 2 = -1 → clamp → 0
        expect(result[0].position.y).toBe(0);
    });


    // ------------------------------------------------------------
    // 20 — Başlangıç pozisyonu zaten saha dışı
    // ------------------------------------------------------------

    it('başlangıç pozisyonu saha dışıysa clamp edilmeli', () => {

        const engine = new PhysicsEngine({
            playerSpeed: 120,
            pitchWidth: 105,
            pitchHeight: 68
        });

        const players = [
            createPlayer({
                x: 150,
                y: 34
            })
        ];

        const decisions = [];

        const result = engine.step(players, decisions, 1 / 60);

        // 150 → clamp → 105
        expect(result[0].position.x).toBe(105);
    });


    // ------------------------------------------------------------
    // 21 — Köşe sınırı (hem X hem Y)
    // ------------------------------------------------------------

    it('oyuncu köşede tam olarak durmalı', () => {

        const engine = new PhysicsEngine({
            playerSpeed: 120,
            pitchWidth: 105,
            pitchHeight: 68
        });

        const players = [
            createPlayer({
                x: 104,
                y: 67
            })
        ];

        const decisions = [
            createDecision({
                x: 200,
                y: 200
            })
        ];

        const result = engine.step(players, decisions, 1 / 60);

        // 104+2=106→105, 67+2=69→68
        expect(result[0].position.x).toBe(105);
        expect(result[0].position.y).toBe(68);
    });


    // ------------------------------------------------------------
    // 22 — Boundary devre dışıysa (pitchWidth verilmedi) clamp yok
    // ------------------------------------------------------------

    it('pitchWidth ve pitchHeight verilmezse clamp uygulanmamalı', () => {

        const engine = new PhysicsEngine({
            playerSpeed: 120
        });

        const players = [
            createPlayer({
                x: 104,
                y: 34
            })
        ];

        const decisions = [
            createDecision({
                x: 500,
                y: 34
            })
        ];

        const result = engine.step(players, decisions, 1 / 60);

        // Sınır yok → 104 + 2 = 106
        expect(result[0].position.x).toBe(106);
    });


    // ------------------------------------------------------------
    // 23 — Geçersiz pitchWidth → TypeError
    // ------------------------------------------------------------

    it('geçersiz pitchWidth için hata vermeli', () => {

        expect(() => new PhysicsEngine({ pitchWidth: 0 }))
            .toThrow(TypeError);

        expect(() => new PhysicsEngine({ pitchWidth: -1 }))
            .toThrow(TypeError);

        expect(() => new PhysicsEngine({ pitchWidth: NaN }))
            .toThrow(TypeError);
    });


    // ------------------------------------------------------------
    // 24 — Geçersiz pitchHeight → TypeError
    // ------------------------------------------------------------

    it('geçersiz pitchHeight için hata vermeli', () => {

        expect(() => new PhysicsEngine({ pitchHeight: 0 }))
            .toThrow(TypeError);

        expect(() => new PhysicsEngine({ pitchHeight: -1 }))
            .toThrow(TypeError);

        expect(() => new PhysicsEngine({ pitchHeight: NaN }))
            .toThrow(TypeError);
    });

});