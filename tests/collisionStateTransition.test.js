import { describe, it, expect } from 'vitest';

import {
    CollisionStateTransition
} from '../src/engine/CollisionStateTransition.js';


describe('CollisionStateTransition', () => {

    function createPlayer({
        id,
        x,
        y,
        teamId = 'A'
    }) {

        return {
            id,
            teamId,
            position: {
                x,
                y
            }
        };
    }


    function createCollision({
        playerAId,
        playerBId,
        distance
    }) {

        return {
            playerAId,
            playerBId,
            distance
        };
    }


    // ------------------------------------------------------------
    // 1
    // ------------------------------------------------------------

    it('motor oluşturulabilmeli', () => {

        const transition =
            new CollisionStateTransition();

        expect(transition)
            .toBeInstanceOf(
                CollisionStateTransition
            );
    });


    // ------------------------------------------------------------
    // 2
    // ------------------------------------------------------------

    it('çarpışan oyuncuları birbirinden ayırmalı', () => {

        const transition =
            new CollisionStateTransition({
                collisionDistance: 30
            });

        const players = [
            createPlayer({
                id: 1,
                x: 100,
                y: 100
            }),
            createPlayer({
                id: 2,
                x: 120,
                y: 100
            })
        ];

        const collisions = [
            createCollision({
                playerAId: 1,
                playerBId: 2,
                distance: 20
            })
        ];

        const result =
            transition.apply(
                players,
                collisions
            );

        expect(result[0].position.x)
            .toBe(95);

        expect(result[1].position.x)
            .toBe(125);
    });


    // ------------------------------------------------------------
    // 3
    // ------------------------------------------------------------

    it('çarpışma sonrasında minimum mesafeyi sağlamalı', () => {

        const transition =
            new CollisionStateTransition({
                collisionDistance: 30
            });

        const players = [
            createPlayer({
                id: 1,
                x: 100,
                y: 100
            }),
            createPlayer({
                id: 2,
                x: 120,
                y: 100
            })
        ];

        const result =
            transition.apply(
                players,
                [
                    createCollision({
                        playerAId: 1,
                        playerBId: 2,
                        distance: 20
                    })
                ]
            );

        const dx =
            result[1].position.x -
            result[0].position.x;

        const dy =
            result[1].position.y -
            result[0].position.y;

        const distance =
            Math.hypot(dx, dy);

        expect(distance)
            .toBeCloseTo(30, 10);
    });


    // ------------------------------------------------------------
    // 4
    // ------------------------------------------------------------

    it('Y eksenindeki çarpışmayı doğru çözmeli', () => {

        const transition =
            new CollisionStateTransition({
                collisionDistance: 30
            });

        const players = [
            createPlayer({
                id: 1,
                x: 100,
                y: 100
            }),
            createPlayer({
                id: 2,
                x: 100,
                y: 120
            })
        ];

        const result =
            transition.apply(
                players,
                [
                    createCollision({
                        playerAId: 1,
                        playerBId: 2,
                        distance: 20
                    })
                ]
            );

        expect(result[0].position.y)
            .toBe(95);

        expect(result[1].position.y)
            .toBe(125);
    });


    // ------------------------------------------------------------
    // 5
    // ------------------------------------------------------------

    it('çapraz çarpışmayı doğru çözmeli', () => {

        const transition =
            new CollisionStateTransition({
                collisionDistance: 50
            });

        const players = [
            createPlayer({
                id: 1,
                x: 100,
                y: 100
            }),
            createPlayer({
                id: 2,
                x: 130,
                y: 140
            })
        ];

        const result =
            transition.apply(
                players,
                [
                    createCollision({
                        playerAId: 1,
                        playerBId: 2,
                        distance: 50
                    })
                ]
            );

        expect(result[0].position.x)
            .toBe(100);

        expect(result[0].position.y)
            .toBe(100);

        expect(result[1].position.x)
            .toBe(130);

        expect(result[1].position.y)
            .toBe(140);
    });


    // ------------------------------------------------------------
    // 6
    // ------------------------------------------------------------

    it('tam sınırdaki oyuncuların pozisyonunu değiştirmemeli', () => {

        const transition =
            new CollisionStateTransition({
                collisionDistance: 30
            });

        const players = [
            createPlayer({
                id: 1,
                x: 100,
                y: 100
            }),
            createPlayer({
                id: 2,
                x: 130,
                y: 100
            })
        ];

        const result =
            transition.apply(
                players,
                [
                    createCollision({
                        playerAId: 1,
                        playerBId: 2,
                        distance: 30
                    })
                ]
            );

        expect(result[0].position)
            .toEqual({
                x: 100,
                y: 100
            });

        expect(result[1].position)
            .toEqual({
                x: 130,
                y: 100
            });
    });


    // ------------------------------------------------------------
    // 7
    // ------------------------------------------------------------

    it('aynı pozisyondaki oyuncuları deterministik olarak ayırmalı', () => {

        const transition =
            new CollisionStateTransition({
                collisionDistance: 30
            });

        const players = [
            createPlayer({
                id: 1,
                x: 100,
                y: 100
            }),
            createPlayer({
                id: 2,
                x: 100,
                y: 100
            })
        ];

        const result =
            transition.apply(
                players,
                [
                    createCollision({
                        playerAId: 1,
                        playerBId: 2,
                        distance: 0
                    })
                ]
            );

        expect(result[0].position.x)
            .toBe(85);

        expect(result[1].position.x)
            .toBe(115);

        expect(result[0].position.y)
            .toBe(100);

        expect(result[1].position.y)
            .toBe(100);
    });


    // ------------------------------------------------------------
    // 8
    // ------------------------------------------------------------

    it('çarpışma yoksa oyuncuların pozisyonları korunmalı', () => {

        const transition =
            new CollisionStateTransition();

        const players = [
            createPlayer({
                id: 1,
                x: 100,
                y: 100
            }),
            createPlayer({
                id: 2,
                x: 200,
                y: 200
            })
        ];

        const result =
            transition.apply(
                players,
                []
            );

        expect(result[0].position)
            .toEqual({
                x: 100,
                y: 100
            });

        expect(result[1].position)
            .toEqual({
                x: 200,
                y: 200
            });
    });


    // ------------------------------------------------------------
    // 9
    // ------------------------------------------------------------

    it('orijinal players dizisini değiştirmemeli', () => {

        const transition =
            new CollisionStateTransition();

        const players = [
            createPlayer({
                id: 1,
                x: 100,
                y: 100
            }),
            createPlayer({
                id: 2,
                x: 120,
                y: 100
            })
        ];

        const original =
            structuredClone(players);

        transition.apply(
            players,
            [
                createCollision({
                    playerAId: 1,
                    playerBId: 2,
                    distance: 20
                })
            ]
        );

        expect(players)
            .toEqual(original);
    });


    // ------------------------------------------------------------
    // 10
    // ------------------------------------------------------------

    it('sonuç yeni oyuncu objeleri üretmeli', () => {

        const transition =
            new CollisionStateTransition();

        const players = [
            createPlayer({
                id: 1,
                x: 100,
                y: 100
            }),
            createPlayer({
                id: 2,
                x: 120,
                y: 100
            })
        ];

        const result =
            transition.apply(
                players,
                [
                    createCollision({
                        playerAId: 1,
                        playerBId: 2,
                        distance: 20
                    })
                ]
            );

        expect(result[0])
            .not.toBe(players[0]);

        expect(result[1])
            .not.toBe(players[1]);
    });


    // ------------------------------------------------------------
    // 11
    // ------------------------------------------------------------

    it('pozisyon objeleri immutable olmalı', () => {

        const transition =
            new CollisionStateTransition();

        const players = [
            createPlayer({
                id: 1,
                x: 100,
                y: 100
            }),
            createPlayer({
                id: 2,
                x: 120,
                y: 100
            })
        ];

        const result =
            transition.apply(
                players,
                [
                    createCollision({
                        playerAId: 1,
                        playerBId: 2,
                        distance: 20
                    })
                ]
            );

        expect(
            Object.isFrozen(
                result[0].position
            )
        ).toBe(true);

        expect(
            Object.isFrozen(
                result[1].position
            )
        ).toBe(true);
    });


    // ------------------------------------------------------------
    // 12
    // ------------------------------------------------------------

    it('birden fazla çarpışmayı uygulayabilmeli', () => {

        const transition =
            new CollisionStateTransition({
                collisionDistance: 30
            });

        const players = [
            createPlayer({
                id: 1,
                x: 100,
                y: 100
            }),
            createPlayer({
                id: 2,
                x: 120,
                y: 100
            }),
            createPlayer({
                id: 3,
                x: 140,
                y: 100
            })
        ];

        const collisions = [
            createCollision({
                playerAId: 1,
                playerBId: 2,
                distance: 20
            }),
            createCollision({
                playerAId: 2,
                playerBId: 3,
                distance: 20
            })
        ];

        const result =
            transition.apply(
                players,
                collisions
            );

        expect(result)
            .toHaveLength(3);

        for (const player of result) {

            expect(
                Number.isFinite(
                    player.position.x
                )
            ).toBe(true);

            expect(
                Number.isFinite(
                    player.position.y
                )
            ).toBe(true);
        }
    });


    // ------------------------------------------------------------
    // 13
    // ------------------------------------------------------------

    it('geçersiz players için hata vermeli', () => {

        const transition =
            new CollisionStateTransition();

        expect(() => {

            transition.apply(
                null,
                []
            );

        }).toThrow(
            'players must be an array'
        );
    });


    // ------------------------------------------------------------
    // 14
    // ------------------------------------------------------------

    it('geçersiz collisions için hata vermeli', () => {

        const transition =
            new CollisionStateTransition();

        expect(() => {

            transition.apply(
                [],
                null
            );

        }).toThrow(
            'collisions must be an array'
        );
    });


    // ------------------------------------------------------------
    // 15
    // ------------------------------------------------------------

    it('geçersiz collision nesnesi için hata vermeli', () => {

        const transition =
            new CollisionStateTransition();

        const players = [
            createPlayer({
                id: 1,
                x: 100,
                y: 100
            })
        ];

        expect(() => {

            transition.apply(
                players,
                [{}]
            );

        }).toThrow(
            'Invalid collision'
        );
    });


    // ------------------------------------------------------------
    // 16
    // ------------------------------------------------------------

    it('olmayan oyuncu ID içeren collision sistemin çökmesine neden olmamalı', () => {

        const transition =
            new CollisionStateTransition();

        const players = [
            createPlayer({
                id: 1,
                x: 100,
                y: 100
            })
        ];

        const result =
            transition.apply(
                players,
                [
                    createCollision({
                        playerAId: 1,
                        playerBId: 999,
                        distance: 10
                    })
                ]
            );

        expect(result)
            .toHaveLength(1);

        expect(result[0].position)
            .toEqual({
                x: 100,
                y: 100
            });
    });


    // ------------------------------------------------------------
    // 17
    // ------------------------------------------------------------

    it('aynı input deterministik sonuç üretmeli', () => {

        const transition =
            new CollisionStateTransition({
                collisionDistance: 30
            });

        const players = [
            createPlayer({
                id: 1,
                x: 100,
                y: 100
            }),
            createPlayer({
                id: 2,
                x: 120,
                y: 100
            })
        ];

        const collisions = [
            createCollision({
                playerAId: 1,
                playerBId: 2,
                distance: 20
            })
        ];

        const result1 =
            transition.apply(
                players,
                collisions
            );

        const result2 =
            transition.apply(
                players,
                collisions
            );

        expect(result1)
            .toEqual(result2);
    });


    // ============================================================
    // BOUNDARY CLAMPING TESTLERİ (YENİ)
    // ============================================================

    // ------------------------------------------------------------
    // 18 — Sağ sınır clamp
    // ------------------------------------------------------------

    it('çarpışma sonrası oyuncu sağ sınırda kalmalı', () => {

        const transition = new CollisionStateTransition({
            collisionDistance: 30,
            pitchWidth: 105,
            pitchHeight: 68
        });

        const players = [
            createPlayer({
                id: 1,
                x: 104,
                y: 34
            }),
            createPlayer({
                id: 2,
                x: 103,
                y: 34
            })
        ];

        const result = transition.apply(players, [
            createCollision({
                playerAId: 1,
                playerBId: 2,
                distance: 1
            })
        ]);

        // Çarpışma iter → id=1 sağa, id=2 sola
        // Ama sağdaki sağ sınırı geçmemeli
        expect(result[0].position.x).toBeLessThanOrEqual(105);
        expect(result[1].position.x).toBeLessThanOrEqual(105);
    });


    // ------------------------------------------------------------
    // 19 — Sol sınır clamp
    // ------------------------------------------------------------

    it('çarpışma sonrası oyuncu sol sınırda kalmalı', () => {

        const transition = new CollisionStateTransition({
            collisionDistance: 30,
            pitchWidth: 105,
            pitchHeight: 68
        });

        const players = [
            createPlayer({
                id: 1,
                x: 1,
                y: 34
            }),
            createPlayer({
                id: 2,
                x: 2,
                y: 34
            })
        ];

        const result = transition.apply(players, [
            createCollision({
                playerAId: 1,
                playerBId: 2,
                distance: 1
            })
        ]);

        // id=1 sola itilir → 0'dan aşağı inmemeli
        expect(result[0].position.x).toBeGreaterThanOrEqual(0);
        expect(result[1].position.x).toBeGreaterThanOrEqual(0);
    });


    // ------------------------------------------------------------
    // 20 — Alt sınır clamp
    // ------------------------------------------------------------

    it('çarpışma sonrası oyuncu alt sınırda kalmalı', () => {

        const transition = new CollisionStateTransition({
            collisionDistance: 30,
            pitchWidth: 105,
            pitchHeight: 68
        });

        const players = [
            createPlayer({
                id: 1,
                x: 50,
                y: 67
            }),
            createPlayer({
                id: 2,
                x: 50,
                y: 66
            })
        ];

        const result = transition.apply(players, [
            createCollision({
                playerAId: 1,
                playerBId: 2,
                distance: 1
            })
        ]);

        expect(result[0].position.y).toBeLessThanOrEqual(68);
        expect(result[1].position.y).toBeLessThanOrEqual(68);
    });


    // ------------------------------------------------------------
    // 21 — Üst sınır clamp
    // ------------------------------------------------------------

    it('çarpışma sonrası oyuncu üst sınırda kalmalı', () => {

        const transition = new CollisionStateTransition({
            collisionDistance: 30,
            pitchWidth: 105,
            pitchHeight: 68
        });

        const players = [
            createPlayer({
                id: 1,
                x: 50,
                y: 1
            }),
            createPlayer({
                id: 2,
                x: 50,
                y: 2
            })
        ];

        const result = transition.apply(players, [
            createCollision({
                playerAId: 1,
                playerBId: 2,
                distance: 1
            })
        ]);

        expect(result[0].position.y).toBeGreaterThanOrEqual(0);
        expect(result[1].position.y).toBeGreaterThanOrEqual(0);
    });


    // ------------------------------------------------------------
    // 22 — Boundary devre dışıysa (pitch verilmedi) clamp yok
    // ------------------------------------------------------------

    it('pitchWidth ve pitchHeight verilmezse mevcut davranış korunmalı', () => {

        const transition = new CollisionStateTransition({
            collisionDistance: 30
        });

        const players = [
            createPlayer({
                id: 1,
                x: 104,
                y: 34
            }),
            createPlayer({
                id: 2,
                x: 103,
                y: 34
            })
        ];

        const result = transition.apply(players, [
            createCollision({
                playerAId: 1,
                playerBId: 2,
                distance: 1
            })
        ]);

        // Clamp yok → 104 + 14.5 = 118.5
        expect(result[0].position.x).toBeGreaterThan(105);
    });


    // ------------------------------------------------------------
    // 23 — Geçersiz pitchWidth
    // ------------------------------------------------------------

    it('geçersiz pitchWidth için hata vermeli', () => {

        expect(() => new CollisionStateTransition({ pitchWidth: 0 }))
            .toThrow(TypeError);

        expect(() => new CollisionStateTransition({ pitchWidth: -1 }))
            .toThrow(TypeError);

        expect(() => new CollisionStateTransition({ pitchWidth: NaN }))
            .toThrow(TypeError);
    });


    // ------------------------------------------------------------
    // 24 — Geçersiz pitchHeight
    // ------------------------------------------------------------

    it('geçersiz pitchHeight için hata vermeli', () => {

        expect(() => new CollisionStateTransition({ pitchHeight: 0 }))
            .toThrow(TypeError);

        expect(() => new CollisionStateTransition({ pitchHeight: -1 }))
            .toThrow(TypeError);

        expect(() => new CollisionStateTransition({ pitchHeight: NaN }))
            .toThrow(TypeError);
    });


    // ------------------------------------------------------------
    // 25 — pitchWidth ve pitchHeight birlikte verilmeli
    // ------------------------------------------------------------

    it('sadece pitchWidth verilirse hata vermeli', () => {

        expect(() => new CollisionStateTransition({
            pitchWidth: 105
        })).toThrow(TypeError);
    });


    it('sadece pitchHeight verilirse hata vermeli', () => {

        expect(() => new CollisionStateTransition({
            pitchHeight: 68
        })).toThrow(TypeError);
    });

});