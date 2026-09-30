import { describe, it, expect } from 'vitest';

import { CollisionDetector }
    from '../src/engine/CollisionDetector.js';


describe('CollisionDetector', () => {

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


    // ------------------------------------------------------------
    // 1
    // ------------------------------------------------------------

    it('motor oluşturulabilmeli', () => {

        const detector =
            new CollisionDetector();

        expect(detector)
            .toBeInstanceOf(CollisionDetector);
    });


    // ------------------------------------------------------------
    // 2
    // ------------------------------------------------------------

    it('çarpışma mesafesindeki iki oyuncuyu tespit etmeli', () => {

        const detector =
            new CollisionDetector({
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

        const collisions =
            detector.detectPlayerOverlaps(players);

        expect(collisions)
            .toHaveLength(1);

        expect(collisions[0].playerAId)
            .toBe(1);

        expect(collisions[0].playerBId)
            .toBe(2);

        expect(collisions[0].distance)
            .toBe(20);
    });


    // ------------------------------------------------------------
    // 3
    // ------------------------------------------------------------

    it('çarpışma mesafesinin dışındaki oyuncuları tespit etmemeli', () => {

        const detector =
            new CollisionDetector({
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
                x: 200,
                y: 100
            })
        ];

        const collisions =
            detector.detectPlayerOverlaps(players);

        expect(collisions)
            .toHaveLength(0);
    });


    // ------------------------------------------------------------
    // 4
    // ------------------------------------------------------------

    it('tam sınırdaki mesafeyi çarpışma kabul etmeli', () => {

        const detector =
            new CollisionDetector({
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

        const collisions =
            detector.detectPlayerOverlaps(players);

        expect(collisions)
            .toHaveLength(1);

        expect(collisions[0].distance)
            .toBe(30);
    });


    // ------------------------------------------------------------
    // 5
    // ------------------------------------------------------------

    it('çapraz mesafeyi doğru hesaplamalı', () => {

        const detector =
            new CollisionDetector({
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

        const collisions =
            detector.detectPlayerOverlaps(players);

        expect(collisions)
            .toHaveLength(1);

        expect(collisions[0].distance)
            .toBe(50);
    });


    // ------------------------------------------------------------
    // 6
    // ------------------------------------------------------------

    it('birden fazla çarpışmayı tespit etmeli', () => {

        const detector =
            new CollisionDetector({
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

        const collisions =
            detector.detectPlayerOverlaps(players);

        expect(collisions)
            .toHaveLength(2);
    });


    // ------------------------------------------------------------
    // 7
    // ------------------------------------------------------------

    it('aynı çarpışmayı iki kez raporlamamalı', () => {

        const detector =
            new CollisionDetector({
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

        const collisions =
            detector.detectPlayerOverlaps(players);

        expect(collisions)
            .toHaveLength(1);

        expect(
            collisions.some(
                collision =>
                    collision.playerAId === 2 &&
                    collision.playerBId === 1
            )
        ).toBe(false);
    });


    // ------------------------------------------------------------
    // 8
    // ------------------------------------------------------------

    it('aynı pozisyondaki iki oyuncuyu çarpışma kabul etmeli', () => {

        const detector =
            new CollisionDetector({
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

        const collisions =
            detector.detectPlayerOverlaps(players);

        expect(collisions)
            .toHaveLength(1);

        expect(collisions[0].distance)
            .toBe(0);
    });


    // ------------------------------------------------------------
    // 9
    // ------------------------------------------------------------

    it('aynı takımdaki oyuncular arasındaki çarpışmayı da tespit etmeli', () => {

        const detector =
            new CollisionDetector({
                collisionDistance: 30
            });

        const players = [
            createPlayer({
                id: 1,
                teamId: 'A',
                x: 100,
                y: 100
            }),
            createPlayer({
                id: 2,
                teamId: 'A',
                x: 120,
                y: 100
            })
        ];

        const collisions =
            detector.detectPlayerOverlaps(players);

        expect(collisions)
            .toHaveLength(1);
    });


    // ------------------------------------------------------------
    // 10
    // ------------------------------------------------------------

    it('farklı takımlardaki oyuncular arasındaki çarpışmayı tespit etmeli', () => {

        const detector =
            new CollisionDetector({
                collisionDistance: 30
            });

        const players = [
            createPlayer({
                id: 1,
                teamId: 'A',
                x: 100,
                y: 100
            }),
            createPlayer({
                id: 2,
                teamId: 'B',
                x: 120,
                y: 100
            })
        ];

        const collisions =
            detector.detectPlayerOverlaps(players);

        expect(collisions)
            .toHaveLength(1);
    });


    // ------------------------------------------------------------
    // 11
    // ------------------------------------------------------------

    it('oyuncu listesi boşsa boş sonuç dönmeli', () => {

        const detector =
            new CollisionDetector();

        const collisions =
            detector.detectPlayerOverlaps([]);

        expect(collisions)
            .toEqual([]);
    });


    // ------------------------------------------------------------
    // 12
    // ------------------------------------------------------------

    it('tek oyuncu varsa çarpışma olmamalı', () => {

        const detector =
            new CollisionDetector();

        const players = [
            createPlayer({
                id: 1,
                x: 100,
                y: 100
            })
        ];

        const collisions =
            detector.detectPlayerOverlaps(players);

        expect(collisions)
            .toEqual([]);
    });


    // ------------------------------------------------------------
    // 13
    // ------------------------------------------------------------

    it('oyuncu pozisyonlarını değiştirmemeli', () => {

        const detector =
            new CollisionDetector();

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

        detector.detectPlayerOverlaps(players);

        expect(players)
            .toEqual(original);
    });


    // ------------------------------------------------------------
    // 14
    // ------------------------------------------------------------

    it('collision sonucu immutable olmalı', () => {

        const detector =
            new CollisionDetector();

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

        const collisions =
            detector.detectPlayerOverlaps(players);

        expect(
            Object.isFrozen(collisions[0])
        ).toBe(true);
    });


    // ------------------------------------------------------------
    // 15
    // ------------------------------------------------------------

    it('geçersiz oyuncu listesinde hata vermeli', () => {

        const detector =
            new CollisionDetector();

        expect(() => {

            detector.detectPlayerOverlaps(null);

        }).toThrow(
            'players must be an array'
        );
    });


    // ------------------------------------------------------------
    // 16
    // ------------------------------------------------------------

    it('geçersiz collisionDistance için hata vermeli', () => {

        expect(() => {

            new CollisionDetector({
                collisionDistance: -1
            });

        }).toThrow(
            'collisionDistance must be non-negative'
        );
    });


    // ------------------------------------------------------------
    // 17
    // ------------------------------------------------------------

    it('geçersiz oyuncu pozisyonunda hata vermeli', () => {

        const detector =
            new CollisionDetector();

        const players = [
            {
                id: 1,
                position: {
                    x: 100,
                    y: 100
                }
            },
            {
                id: 2,
                position: {
                    x: NaN,
                    y: 100
                }
            }
        ];

        expect(() => {

            detector.detectPlayerOverlaps(players);

        }).toThrow(
            'Invalid position'
        );
    });

});