// tests/decisionEngine.test.js

import { describe, it, expect } from 'vitest';

import { DecisionEngine } from '../src/engine/DecisionEngine.js';

import {
    Actions,
    Duties
} from '../src/core/types.js';


describe('DecisionEngine', () => {

    function createState({
        playerPosition = { x: 100, y: 100 },
        playerRole = 'CM',
        playerTeam = 'A'
    } = {}) {

        return {
            players: [
                {
                    id: 1,
                    teamId: playerTeam,
                    role: playerRole,
                    basePosition: {
                        x: 100,
                        y: 100
                    },
                    position: {
                        x: playerPosition.x,
                        y: playerPosition.y
                    }
                }
            ],

            ball: {
                position: {
                    x: 500,
                    y: 300
                }
            }
        };
    }


    function createTacticalSnapshot({
        playerId = 1,
        tacticalTarget = { x: 300, y: 300 }
    } = {}) {

        return [
            {
                playerId,
                tacticalTarget: {
                    x: tacticalTarget.x,
                    y: tacticalTarget.y
                }
            }
        ];
    }


    function createBehaviorSnapshot({
        playerId = 1,
        behavior = 'SUPPORT',
        target = { x: 350, y: 325 }
    } = {}) {

        return [
            {
                playerId,
                teamId: 'A',
                behavior,
                target: {
                    x: target.x,
                    y: target.y
                }
            }
        ];
    }


    function createPossessionSnapshot({
        ownerId = null,
        nearestOpponentId = null,
        nearestOpponentDistance = Infinity
    } = {}) {

        return {
            state: ownerId !== null ? 'CONTROLLED' : 'FREE',
            ownerId,
            nearestPlayerId: ownerId,
            distance: 0,
            nearestOpponentId,
            nearestOpponentDistance
        };
    }


    function createPassTargets(receiverIds = []) {
        return receiverIds.map(id => ({ receiverId: id }));
    }


    function createShotDecisions(decisions = []) {
        return decisions;
    }


    // ------------------------------------------------------------
    // 1 — MOTOR OLUŞTURMA
    // ------------------------------------------------------------

    it('motor oluşturulabilmeli', () => {

        const engine = new DecisionEngine();

        expect(engine)
            .toBeInstanceOf(DecisionEngine);
    });


    // ------------------------------------------------------------
    // 2 — BEHAVIOR TARGET KULLANILMALI
    // ------------------------------------------------------------

    it('behavior target varsa onu kullanmalı', () => {

        const engine = new DecisionEngine();

        const state = createState({
            playerPosition: { x: 100, y: 100 }
        });

        const tacticalSnapshots =
            createTacticalSnapshot({
                tacticalTarget: { x: 300, y: 300 }
            });

        const behaviorSnapshots =
            createBehaviorSnapshot({
                behavior: 'SUPPORT',
                target: { x: 350, y: 325 }
            });

        const result =
            engine.evaluate(
                state,
                tacticalSnapshots,
                behaviorSnapshots
            );

        expect(result)
            .toHaveLength(1);

        expect(result[0].target)
            .toEqual({ x: 350, y: 325 });
    });


    // ------------------------------------------------------------
    // 3 — BEHAVIOR YOKSA TACTICAL TARGET
    // ------------------------------------------------------------

    it('behavior snapshot yoksa tactical target kullanılmalı', () => {

        const engine = new DecisionEngine();

        const state = createState({
            playerPosition: { x: 100, y: 100 }
        });

        const tacticalSnapshots =
            createTacticalSnapshot({
                tacticalTarget: { x: 300, y: 300 }
            });

        const result =
            engine.evaluate(
                state,
                tacticalSnapshots,
                []
            );

        expect(result[0].target)
            .toEqual({ x: 300, y: 300 });
    });


    // ------------------------------------------------------------
    // 4 — UZAK HEDEF MOVE
    // ------------------------------------------------------------

    it('oyuncu hedefinden uzaktaysa MOVE üretmeli', () => {

        const engine = new DecisionEngine();

        const state = createState({
            playerPosition: { x: 100, y: 100 }
        });

        const tacticalSnapshots =
            createTacticalSnapshot({
                tacticalTarget: { x: 300, y: 300 }
            });

        const result =
            engine.evaluate(
                state,
                tacticalSnapshots,
                []
            );

        expect(result[0].action)
            .toBe(Actions.MOVE);
    });


    // ------------------------------------------------------------
    // 5 — HEDEFTE NONE
    // ------------------------------------------------------------

    it('oyuncu hedefindeyse NONE üretmeli', () => {

        const engine = new DecisionEngine();

        const state = createState({
            playerPosition: { x: 300, y: 300 }
        });

        const tacticalSnapshots =
            createTacticalSnapshot({
                tacticalTarget: { x: 300, y: 300 }
            });

        const result =
            engine.evaluate(
                state,
                tacticalSnapshots,
                []
            );

        expect(result[0].action)
            .toBe(Actions.NONE);
    });


    // ------------------------------------------------------------
    // 6 — DUTY
    // ------------------------------------------------------------

    it('decision HOLD_POSITION duty üretmeli', () => {

        const engine = new DecisionEngine();

        const state = createState();

        const tacticalSnapshots = createTacticalSnapshot();

        const result =
            engine.evaluate(
                state,
                tacticalSnapshots,
                []
            );

        expect(result[0].duty)
            .toBe(Duties.HOLD_POSITION);
    });


    // ------------------------------------------------------------
    // 7 — BEHAVIOR AKTARILMALI
    // ------------------------------------------------------------

    it('behavior bilgisi decision içine aktarılmalı', () => {

        const engine = new DecisionEngine();

        const state = createState();

        const tacticalSnapshots = createTacticalSnapshot();

        const behaviorSnapshots =
            createBehaviorSnapshot({
                behavior: 'PRESS',
                target: { x: 250, y: 250 }
            });

        const result =
            engine.evaluate(
                state,
                tacticalSnapshots,
                behaviorSnapshots
            );

        expect(result[0].behavior)
            .toBe('PRESS');
    });


    // ------------------------------------------------------------
    // 8 — PLAYER ID AKTARILMALI
    // ------------------------------------------------------------

    it('playerId korunmalı', () => {

        const engine = new DecisionEngine();

        const state = createState();

        const tacticalSnapshots = createTacticalSnapshot();

        const result =
            engine.evaluate(
                state,
                tacticalSnapshots,
                []
            );

        expect(result[0].playerId)
            .toBe(1);
    });


    // ------------------------------------------------------------
    // 9 — TARGET IMMUTABLE
    // ------------------------------------------------------------

    it('üretilen target immutable olmalı', () => {

        const engine = new DecisionEngine();

        const state = createState();

        const tacticalSnapshots = createTacticalSnapshot();

        const result =
            engine.evaluate(
                state,
                tacticalSnapshots,
                []
            );

        expect(Object.isFrozen(result[0].target))
            .toBe(true);
    });


    // ------------------------------------------------------------
    // 10 — STATE MUTATION YOK
    // ------------------------------------------------------------

    it('state üzerinde değişiklik yapmamalı', () => {

        const engine = new DecisionEngine();

        const state = createState({
            playerPosition: { x: 150, y: 180 }
        });

        const tacticalSnapshots =
            createTacticalSnapshot({
                tacticalTarget: { x: 400, y: 350 }
            });

        const behaviorSnapshots =
            createBehaviorSnapshot({
                behavior: 'SUPPORT',
                target: { x: 380, y: 330 }
            });

        const originalState = structuredClone(state);
        const originalTactical = structuredClone(tacticalSnapshots);
        const originalBehavior = structuredClone(behaviorSnapshots);

        engine.evaluate(
            state,
            tacticalSnapshots,
            behaviorSnapshots
        );

        expect(state).toEqual(originalState);
        expect(tacticalSnapshots).toEqual(originalTactical);
        expect(behaviorSnapshots).toEqual(originalBehavior);
    });


    // ------------------------------------------------------------
    // 11 — DETERMINISTIC
    // ------------------------------------------------------------

    it('aynı input deterministik sonuç üretmeli', () => {

        const engine = new DecisionEngine();

        const state = createState({
            playerPosition: { x: 150, y: 180 }
        });

        const tacticalSnapshots =
            createTacticalSnapshot({
                tacticalTarget: { x: 400, y: 350 }
            });

        const behaviorSnapshots =
            createBehaviorSnapshot({
                behavior: 'RUN_FORWARD',
                target: { x: 450, y: 350 }
            });

        const result1 =
            engine.evaluate(
                state,
                tacticalSnapshots,
                behaviorSnapshots
            );

        const result2 =
            engine.evaluate(
                state,
                tacticalSnapshots,
                behaviorSnapshots
            );

        expect(result1).toEqual(result2);
    });


    // ------------------------------------------------------------
    // 12 — DAVRANIŞ HEDEFİ KARAR HEDEFİNİ EZMELİ
    // ------------------------------------------------------------

    it('behavior target tactical targeti ezmeli', () => {

        const engine = new DecisionEngine();

        const state = createState({
            playerPosition: { x: 100, y: 100 }
        });

        const tacticalSnapshots =
            createTacticalSnapshot({
                tacticalTarget: { x: 200, y: 200 }
            });

        const behaviorSnapshots =
            createBehaviorSnapshot({
                behavior: 'MOVE_TO_BALL',
                target: { x: 500, y: 400 }
            });

        const result =
            engine.evaluate(
                state,
                tacticalSnapshots,
                behaviorSnapshots
            );

        expect(result[0].target).toEqual({ x: 500, y: 400 });
        expect(result[0].target).not.toEqual({ x: 200, y: 200 });
    });


    // ============================================================
    // PASS KARARI TESTLERİ
    // ============================================================

    // ------------------------------------------------------------
    // 13 — PASS KOŞULU
    // ------------------------------------------------------------

    it('owner + passTargets + rakip < 50 → PASS üretmeli', () => {

        const engine = new DecisionEngine();

        const state = createState();

        const tacticalSnapshots = createTacticalSnapshot();

        const possessionSnapshot = createPossessionSnapshot({
            ownerId: 1,
            nearestOpponentId: 99,
            nearestOpponentDistance: 30
        });

        const passTargets = createPassTargets([10]);

        const result = engine.evaluate(
            state,
            tacticalSnapshots,
            [],
            possessionSnapshot,
            passTargets
        );

        expect(result[0].action).toBe(Actions.PASS);
        expect(result[0].receiverId).toBe(10);
    });


    // ------------------------------------------------------------
    // 14 — OWNER DEĞİLSE PASS YOK
    // ------------------------------------------------------------

    it('oyuncu top sahibi değilse PASS üretmemeli', () => {

        const engine = new DecisionEngine();

        const state = createState();
        const tacticalSnapshots = createTacticalSnapshot();

        const possessionSnapshot = createPossessionSnapshot({
            ownerId: 99,
            nearestOpponentId: 99,
            nearestOpponentDistance: 30
        });

        const passTargets = createPassTargets([10]);

        const result = engine.evaluate(
            state,
            tacticalSnapshots,
            [],
            possessionSnapshot,
            passTargets
        );

        expect(result[0].action).not.toBe(Actions.PASS);
        expect(result[0].receiverId).toBeUndefined();
    });


    // ------------------------------------------------------------
    // 15 — PASS TARGET YOKSA PASS YOK
    // ------------------------------------------------------------

    it('passTargets boşsa PASS üretmemeli', () => {

        const engine = new DecisionEngine();

        const state = createState();
        const tacticalSnapshots = createTacticalSnapshot();

        const possessionSnapshot = createPossessionSnapshot({
            ownerId: 1,
            nearestOpponentId: 99,
            nearestOpponentDistance: 30
        });

        const result = engine.evaluate(
            state,
            tacticalSnapshots,
            [],
            possessionSnapshot,
            []
        );

        expect(result[0].action).not.toBe(Actions.PASS);
    });


    // ------------------------------------------------------------
    // 16 — RAKİP YOKSA PASS YOK
    // ------------------------------------------------------------

    it('nearestOpponentId null ise PASS üretmemeli', () => {

        const engine = new DecisionEngine();

        const state = createState();
        const tacticalSnapshots = createTacticalSnapshot();

        const possessionSnapshot = createPossessionSnapshot({
            ownerId: 1,
            nearestOpponentId: null,
            nearestOpponentDistance: Infinity
        });

        const passTargets = createPassTargets([10]);

        const result = engine.evaluate(
            state,
            tacticalSnapshots,
            [],
            possessionSnapshot,
            passTargets
        );

        expect(result[0].action).not.toBe(Actions.PASS);
    });


    // ------------------------------------------------------------
    // 17 — MESAFE 49.999 → PASS
    // ------------------------------------------------------------

    it('rakip mesafesi 49.999 ise PASS üretmeli', () => {

        const engine = new DecisionEngine();

        const state = createState();
        const tacticalSnapshots = createTacticalSnapshot();

        const possessionSnapshot = createPossessionSnapshot({
            ownerId: 1,
            nearestOpponentId: 99,
            nearestOpponentDistance: 49.999
        });

        const passTargets = createPassTargets([10]);

        const result = engine.evaluate(
            state,
            tacticalSnapshots,
            [],
            possessionSnapshot,
            passTargets
        );

        expect(result[0].action).toBe(Actions.PASS);
    });


    // ------------------------------------------------------------
    // 18 — MESAFE 50 → PASS DEĞİL
    // ------------------------------------------------------------

    it('rakip mesafesi 50 ise PASS üretmemeli', () => {

        const engine = new DecisionEngine();

        const state = createState();
        const tacticalSnapshots = createTacticalSnapshot();

        const possessionSnapshot = createPossessionSnapshot({
            ownerId: 1,
            nearestOpponentId: 99,
            nearestOpponentDistance: 50
        });

        const passTargets = createPassTargets([10]);

        const result = engine.evaluate(
            state,
            tacticalSnapshots,
            [],
            possessionSnapshot,
            passTargets
        );

        expect(result[0].action).not.toBe(Actions.PASS);
    });


    // ------------------------------------------------------------
    // 19 — MESAFE 50.001 → PASS DEĞİL
    // ------------------------------------------------------------

    it('rakip mesafesi 50.001 ise PASS üretmemeli', () => {

        const engine = new DecisionEngine();

        const state = createState();
        const tacticalSnapshots = createTacticalSnapshot();

        const possessionSnapshot = createPossessionSnapshot({
            ownerId: 1,
            nearestOpponentId: 99,
            nearestOpponentDistance: 50.001
        });

        const passTargets = createPassTargets([10]);

        const result = engine.evaluate(
            state,
            tacticalSnapshots,
            [],
            possessionSnapshot,
            passTargets
        );

        expect(result[0].action).not.toBe(Actions.PASS);
    });


    // ------------------------------------------------------------
    // 20 — PASS DIŞINDA receiverId YOK
    // ------------------------------------------------------------

    it('PASS değilse receiverId property oluşturulmamalı', () => {

        const engine = new DecisionEngine();

        const state = createState({
            playerPosition: { x: 100, y: 100 }
        });

        const tacticalSnapshots = createTacticalSnapshot({
            tacticalTarget: { x: 300, y: 300 }
        });

        const result = engine.evaluate(
            state,
            tacticalSnapshots,
            []
        );

        expect(result[0].action).toBe(Actions.MOVE);
        expect(result[0].receiverId).toBeUndefined();
    });


    // ------------------------------------------------------------
    // 21 — İLK PASS TARGET SEÇİLİR
    // ------------------------------------------------------------

    it('passTargets[0] receiverId olarak seçilmeli', () => {

        const engine = new DecisionEngine();

        const state = createState();
        const tacticalSnapshots = createTacticalSnapshot();

        const possessionSnapshot = createPossessionSnapshot({
            ownerId: 1,
            nearestOpponentId: 99,
            nearestOpponentDistance: 20
        });

        const passTargets = createPassTargets([15, 10, 20]);

        const result = engine.evaluate(
            state,
            tacticalSnapshots,
            [],
            possessionSnapshot,
            passTargets
        );

        expect(result[0].receiverId).toBe(15);
    });


    // ------------------------------------------------------------
    // 22 — PASS KARARINDA behavior KORUNUR
    // ------------------------------------------------------------

    it('PASS kararında behavior aynen taşınmalı', () => {

        const engine = new DecisionEngine();

        const state = createState();
        const tacticalSnapshots = createTacticalSnapshot();

        const behaviorSnapshots = createBehaviorSnapshot({
            behavior: 'SUPPORT',
            target: { x: 350, y: 325 }
        });

        const possessionSnapshot = createPossessionSnapshot({
            ownerId: 1,
            nearestOpponentId: 99,
            nearestOpponentDistance: 20
        });

        const passTargets = createPassTargets([10]);

        const result = engine.evaluate(
            state,
            tacticalSnapshots,
            behaviorSnapshots,
            possessionSnapshot,
            passTargets
        );

        expect(result[0].behavior).toBe('SUPPORT');
    });


    // ------------------------------------------------------------
    // 23 — PASS KARARINDA target KORUNUR
    // ------------------------------------------------------------

    it('PASS kararında target korunmalı', () => {

        const engine = new DecisionEngine();

        const state = createState();
        const tacticalSnapshots = createTacticalSnapshot({
            tacticalTarget: { x: 300, y: 300 }
        });

        const behaviorSnapshots = createBehaviorSnapshot({
            behavior: 'SUPPORT',
            target: { x: 350, y: 325 }
        });

        const possessionSnapshot = createPossessionSnapshot({
            ownerId: 1,
            nearestOpponentId: 99,
            nearestOpponentDistance: 20
        });

        const passTargets = createPassTargets([10]);

        const result = engine.evaluate(
            state,
            tacticalSnapshots,
            behaviorSnapshots,
            possessionSnapshot,
            passTargets
        );

        expect(result[0].target).toEqual({ x: 350, y: 325 });
    });


    // ------------------------------------------------------------
    // 24 — GEÇERSİZ passTargets → TypeError
    // ------------------------------------------------------------

    it('passTargets dizi değilse TypeError fırlatmalı', () => {

        const engine = new DecisionEngine();

        const state = createState();
        const tacticalSnapshots = createTacticalSnapshot();

        expect(() => {
            engine.evaluate(
                state,
                tacticalSnapshots,
                [],
                null,
                'not-an-array'
            );
        }).toThrow(TypeError);
    });


    // ============================================================
    // SHOT KARARI TESTLERİ
    // ============================================================

    // ------------------------------------------------------------
    // 25 — SHOT DECISIONS OPSİYONEL
    // ------------------------------------------------------------

    it('shotDecisions verilmezse mevcut davranış korunmalı', () => {

        const engine = new DecisionEngine();

        const state = createState({
            playerPosition: { x: 100, y: 100 }
        });

        const tacticalSnapshots = createTacticalSnapshot({
            tacticalTarget: { x: 300, y: 300 }
        });

        // shotDecisions YOK
        const result = engine.evaluate(
            state,
            tacticalSnapshots,
            []
        );

        expect(result[0].action).toBe(Actions.MOVE);
    });


    // ------------------------------------------------------------
    // 26 — GEÇERLİ SHOT → Actions.SHOT
    // ------------------------------------------------------------

    it('canShoot true olan oyuncu Actions.SHOT üretmeli', () => {

        const engine = new DecisionEngine();

        const state = createState();
        const tacticalSnapshots = createTacticalSnapshot();

        const shotDecisions = createShotDecisions([
            {
                playerId: 1,
                canShoot: true,
                targetPosition: { x: 105, y: 34 },
                shotType: 'GROUND'
            }
        ]);

        const result = engine.evaluate(
            state,
            tacticalSnapshots,
            [],
            null,
            [],
            shotDecisions
        );

        expect(result[0].action).toBe(Actions.SHOT);
    });


    // ------------------------------------------------------------
    // 27 — SHOT targetPosition KORUNUR
    // ------------------------------------------------------------

    it('SHOT kararında targetPosition aynen korunmalı', () => {

        const engine = new DecisionEngine();

        const state = createState();
        const tacticalSnapshots = createTacticalSnapshot();

        const shotDecisions = createShotDecisions([
            {
                playerId: 1,
                canShoot: true,
                targetPosition: { x: 105, y: 30 },
                shotType: 'GROUND'
            }
        ]);

        const result = engine.evaluate(
            state,
            tacticalSnapshots,
            [],
            null,
            [],
            shotDecisions
        );

        expect(result[0].targetPosition).toEqual({ x: 105, y: 30 });
    });


    // ------------------------------------------------------------
    // 28 — SHOT shotType KORUNUR
    // ------------------------------------------------------------

    it('SHOT kararında shotType aynen korunmalı', () => {

        const engine = new DecisionEngine();

        const state = createState();
        const tacticalSnapshots = createTacticalSnapshot();

        const shotDecisions = createShotDecisions([
            {
                playerId: 1,
                canShoot: true,
                targetPosition: { x: 105, y: 34 },
                shotType: 'LOB'
            }
        ]);

        const result = engine.evaluate(
            state,
            tacticalSnapshots,
            [],
            null,
            [],
            shotDecisions
        );

        expect(result[0].shotType).toBe('LOB');
    });


    // ------------------------------------------------------------
    // 29 — SHOT ÖNCELİKLİ (PASS'E GÖRE)
    // ------------------------------------------------------------

    it('SHOT ve PASS aynı anda mümkünse SHOT kazanmalı', () => {

        const engine = new DecisionEngine();

        const state = createState();
        const tacticalSnapshots = createTacticalSnapshot();

        const possessionSnapshot = createPossessionSnapshot({
            ownerId: 1,
            nearestOpponentId: 99,
            nearestOpponentDistance: 20
        });

        const passTargets = createPassTargets([10]);

        const shotDecisions = createShotDecisions([
            {
                playerId: 1,
                canShoot: true,
                targetPosition: { x: 105, y: 34 },
                shotType: 'GROUND'
            }
        ]);

        const result = engine.evaluate(
            state,
            tacticalSnapshots,
            [],
            possessionSnapshot,
            passTargets,
            shotDecisions
        );

        expect(result[0].action).toBe(Actions.SHOT);
        expect(result[0].receiverId).toBeUndefined();
    });


    // ------------------------------------------------------------
    // 30 — canShoot:false → PASS DEVAM EDER
    // ------------------------------------------------------------

    it('canShoot false ise ve PASS koşulu varsa PASS üretmeli', () => {

        const engine = new DecisionEngine();

        const state = createState();
        const tacticalSnapshots = createTacticalSnapshot();

        const possessionSnapshot = createPossessionSnapshot({
            ownerId: 1,
            nearestOpponentId: 99,
            nearestOpponentDistance: 20
        });

        const passTargets = createPassTargets([10]);

        const shotDecisions = createShotDecisions([
            {
                playerId: 1,
                canShoot: false,
                reason: 'TOO_FAR'
            }
        ]);

        const result = engine.evaluate(
            state,
            tacticalSnapshots,
            [],
            possessionSnapshot,
            passTargets,
            shotDecisions
        );

        expect(result[0].action).toBe(Actions.PASS);
        expect(result[0].receiverId).toBe(10);
    });


    // ------------------------------------------------------------
    // 31 — SHOT YOK + PASS YOK → MOVE/NONE
    // ------------------------------------------------------------

    it('SHOT ve PASS yoksa mevcut MOVE/NONE davranışı korunmalı', () => {

        const engine = new DecisionEngine();

        const state = createState({
            playerPosition: { x: 100, y: 100 }
        });

        const tacticalSnapshots = createTacticalSnapshot({
            tacticalTarget: { x: 300, y: 300 }
        });

        const shotDecisions = createShotDecisions([
            {
                playerId: 1,
                canShoot: false,
                reason: 'TOO_FAR'
            }
        ]);

        const result = engine.evaluate(
            state,
            tacticalSnapshots,
            [],
            null,
            [],
            shotDecisions
        );

        expect(result[0].action).toBe(Actions.MOVE);
    });


    // ------------------------------------------------------------
    // 32 — SHOT KARARI SADECE İLGİLİ OYUNCUYU ETKİLER
    // ------------------------------------------------------------

    it('SHOT kararı sadece ilgili playerId için uygulanmalı', () => {

        const engine = new DecisionEngine();

        const state = {
            players: [
                {
                    id: 1,
                    teamId: 'A',
                    role: 'ST',
                    basePosition: { x: 100, y: 100 },
                    position: { x: 100, y: 100 }
                },
                {
                    id: 2,
                    teamId: 'A',
                    role: 'CM',
                    basePosition: { x: 200, y: 200 },
                    position: { x: 200, y: 200 }
                }
            ],
            ball: { position: { x: 500, y: 300 } }
        };

        const tacticalSnapshots = [
            { playerId: 1, tacticalTarget: { x: 300, y: 300 } },
            { playerId: 2, tacticalTarget: { x: 400, y: 400 } }
        ];

        const shotDecisions = createShotDecisions([
            {
                playerId: 1,
                canShoot: true,
                targetPosition: { x: 105, y: 34 },
                shotType: 'GROUND'
            }
        ]);

        const result = engine.evaluate(
            state,
            tacticalSnapshots,
            [],
            null,
            [],
            shotDecisions
        );

        expect(result[0].action).toBe(Actions.SHOT);
        expect(result[1].action).toBe(Actions.MOVE);
    });


    // ------------------------------------------------------------
    // 33 — STATE MUTATE EDİLMEZ (SHOT)
    // ------------------------------------------------------------

    it('SHOT kararı state mutate etmemeli', () => {

        const engine = new DecisionEngine();

        const state = createState();
        const tacticalSnapshots = createTacticalSnapshot();

        const shotDecisions = createShotDecisions([
            {
                playerId: 1,
                canShoot: true,
                targetPosition: { x: 105, y: 34 },
                shotType: 'GROUND'
            }
        ]);

        const originalState = structuredClone(state);
        const originalShotDecisions = structuredClone(shotDecisions);

        engine.evaluate(
            state,
            tacticalSnapshots,
            [],
            null,
            [],
            shotDecisions
        );

        expect(state).toEqual(originalState);
        expect(shotDecisions).toEqual(originalShotDecisions);
    });


    // ------------------------------------------------------------
    // 34 — DETERMİNİZM (SHOT)
    // ------------------------------------------------------------

    it('SHOT kararı deterministik olmalı', () => {

        const engine = new DecisionEngine();

        const state = createState();
        const tacticalSnapshots = createTacticalSnapshot();

        const shotDecisions = createShotDecisions([
            {
                playerId: 1,
                canShoot: true,
                targetPosition: { x: 105, y: 34 },
                shotType: 'GROUND'
            }
        ]);

        const result1 = engine.evaluate(
            state,
            tacticalSnapshots,
            [],
            null,
            [],
            shotDecisions
        );

        const result2 = engine.evaluate(
            state,
            tacticalSnapshots,
            [],
            null,
            [],
            shotDecisions
        );

        expect(result1).toEqual(result2);
    });


    // ------------------------------------------------------------
    // 35 — GEÇERSİZ shotDecisions → TypeError
    // ------------------------------------------------------------

    it('shotDecisions dizi değilse TypeError fırlatmalı', () => {

        const engine = new DecisionEngine();

        const state = createState();
        const tacticalSnapshots = createTacticalSnapshot();

        expect(() => {
            engine.evaluate(
                state,
                tacticalSnapshots,
                [],
                null,
                [],
                'not-an-array'
            );
        }).toThrow(TypeError);
    });

});