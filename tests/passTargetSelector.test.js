// tests/passTargetSelector.test.js

import { describe, it, expect } from 'vitest';

import {
    PassTargetSelector
} from '../src/engine/PassTargetSelector.js';


describe('PassTargetSelector', () => {

    // ------------------------------------------------------------
    // YARDIMCI FONKSİYONLAR
    // ------------------------------------------------------------

    function createPlayer({
        id,
        teamId = 'A',
        role = 'CM',
        x = 0,
        y = 0
    } = {}) {

        return {
            id,
            teamId,
            role,
            position: { x, y },
            basePosition: { x, y }
        };
    }


    function createState({
        players = [],
        ball = { ownerId: null, position: { x: 0, y: 0 } }
    } = {}) {

        return {
            players,
            ball
        };
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


    function createBehaviorSnapshot({
        playerId,
        behavior = 'SUPPORT',
        target = null
    } = {}) {

        return {
            playerId,
            teamId: 'A',
            behavior,
            target,
            distanceToBall: 0,
            distanceToOpponent: Infinity
        };
    }


    // ------------------------------------------------------------
    // 1 — MOTOR OLUŞTURMA
    // ------------------------------------------------------------

    it('motor oluşturulabilmeli', () => {

        const selector = new PassTargetSelector();

        expect(selector)
            .toBeInstanceOf(PassTargetSelector);
    });


    // ------------------------------------------------------------
    // 2 — AYNI TAKIM SEÇİLİR
    // ------------------------------------------------------------

    it('sadece aynı takımdaki oyuncuları aday gösterir', () => {

        const selector = new PassTargetSelector();

        const players = [
            createPlayer({ id: 7, teamId: 'A', role: 'CM', x: 0, y: 0 }),
            createPlayer({ id: 10, teamId: 'A', role: 'CM', x: 100, y: 0 }),
            createPlayer({ id: 99, teamId: 'B', role: 'CM', x: 50, y: 0 })
        ];

        const state = createState({ players });
        const possession = createPossessionSnapshot({ ownerId: 7 });

        const targets = selector.select(state, possession, []);

        expect(targets)
            .toHaveLength(1);

        expect(targets[0].receiverId)
            .toBe(10);
    });


    // ------------------------------------------------------------
    // 3 — PASÖR ADAY OLAMAZ
    // ------------------------------------------------------------

    it('pasör kendi kendine aday olamaz', () => {

        const selector = new PassTargetSelector();

        const players = [
            createPlayer({ id: 7, teamId: 'A', role: 'CM', x: 0, y: 0 }),
            createPlayer({ id: 10, teamId: 'A', role: 'CM', x: 100, y: 0 })
        ];

        const state = createState({ players });
        const possession = createPossessionSnapshot({ ownerId: 7 });

        const targets = selector.select(state, possession, []);

        expect(
            targets.some(t => t.receiverId === 7)
        ).toBe(false);
    });


    // ------------------------------------------------------------
    // 4 — GK ADAY OLAMAZ
    // ------------------------------------------------------------

    it('kaleci (GK) aday olamaz', () => {

        const selector = new PassTargetSelector();

        const players = [
            createPlayer({ id: 7, teamId: 'A', role: 'CM', x: 0, y: 0 }),
            createPlayer({ id: 1, teamId: 'A', role: 'GK', x: 100, y: 0 }),
            createPlayer({ id: 10, teamId: 'A', role: 'CM', x: 200, y: 0 })
        ];

        const state = createState({ players });
        const possession = createPossessionSnapshot({ ownerId: 7 });

        const targets = selector.select(state, possession, []);

        expect(
            targets.some(t => t.receiverId === 1)
        ).toBe(false);

        expect(
            targets.some(t => t.receiverId === 10)
        ).toBe(true);
    });


    // ------------------------------------------------------------
    // 5 — EN YÜKSEK RAKİP MESAFESİ ÖNCELİK
    // ------------------------------------------------------------

    it('en yüksek rakip mesafesi (en az baskı) önce gelir', () => {

        const selector = new PassTargetSelector();

        const players = [
            createPlayer({ id: 7, teamId: 'A', role: 'CM', x: 0, y: 0 }),

            // 10 numara — yakınında rakip var (baskı yüksek)
            createPlayer({ id: 10, teamId: 'A', role: 'CM', x: 100, y: 0 }),

            // 11 numara — rakip yok (baskı düşük)
            createPlayer({ id: 11, teamId: 'A', role: 'CM', x: 200, y: 0 }),

            // 99 numara — 10 numaraya çok yakın
            createPlayer({ id: 99, teamId: 'B', role: 'CM', x: 105, y: 0 })
        ];

        const state = createState({ players });
        const possession = createPossessionSnapshot({ ownerId: 7 });

        const targets = selector.select(state, possession, []);

        expect(targets[0].receiverId)
            .toBe(11);

        expect(targets[1].receiverId)
            .toBe(10);
    });


    // ------------------------------------------------------------
    // 6 — BEHAVIOR TARGET TIE-BREAK
    // ------------------------------------------------------------

    it('eşit rakip mesafesinde behavior.target\'e yakın olan önce gelir', () => {

        const selector = new PassTargetSelector();

        const players = [
            createPlayer({ id: 7, teamId: 'A', role: 'CM', x: 0, y: 0 }),
            createPlayer({ id: 10, teamId: 'A', role: 'CM', x: 100, y: 0 }),
            createPlayer({ id: 11, teamId: 'A', role: 'CM', x: 200, y: 0 })
        ];

        const state = createState({ players });
        const possession = createPossessionSnapshot({ ownerId: 7 });

        // Her iki adayın rakip mesafesi aynı (rakip yok → Infinity)
        // Behavior target'ları farklı
        const behaviorSnapshots = [
            createBehaviorSnapshot({
                playerId: 10,
                target: { x: 500, y: 500 }  // uzak
            }),
            createBehaviorSnapshot({
                playerId: 11,
                target: { x: 200, y: 0 }    // kendi pozisyonunda → mesafe 0
            })
        ];

        const targets = selector.select(state, possession, behaviorSnapshots);

        expect(targets[0].receiverId)
            .toBe(11);

        expect(targets[1].receiverId)
            .toBe(10);
    });


    // ------------------------------------------------------------
    // 7 — ID TIE-BREAK
    // ------------------------------------------------------------

    it('tüm kriterler eşitse küçük ID önce gelir', () => {

        const selector = new PassTargetSelector();

        const players = [
            createPlayer({ id: 7, teamId: 'A', role: 'CM', x: 0, y: 0 }),
            createPlayer({ id: 20, teamId: 'A', role: 'CM', x: 100, y: 0 }),
            createPlayer({ id: 15, teamId: 'A', role: 'CM', x: 100, y: 0 })
        ];

        const state = createState({ players });
        const possession = createPossessionSnapshot({ ownerId: 7 });

        // Behavior target yok → her ikisi için Infinity
        // Rakip yok → her ikisi için Infinity
        const targets = selector.select(state, possession, []);

        expect(targets[0].receiverId)
            .toBe(15);

        expect(targets[1].receiverId)
            .toBe(20);
    });


    // ------------------------------------------------------------
    // 8 — OWNER YOKSA BOŞ
    // ------------------------------------------------------------

    it('ownerId null ise boş dizi döner', () => {

        const selector = new PassTargetSelector();

        const players = [
            createPlayer({ id: 7, teamId: 'A', role: 'CM', x: 0, y: 0 }),
            createPlayer({ id: 10, teamId: 'A', role: 'CM', x: 100, y: 0 })
        ];

        const state = createState({ players });
        const possession = createPossessionSnapshot({ ownerId: null });

        const targets = selector.select(state, possession, []);

        expect(targets)
            .toEqual([]);
    });


    // ------------------------------------------------------------
    // 9 — DETERMINISTIK
    // ------------------------------------------------------------

    it('aynı input deterministik sonuç üretmeli', () => {

        const selector = new PassTargetSelector();

        const players = [
            createPlayer({ id: 7, teamId: 'A', role: 'CM', x: 0, y: 0 }),
            createPlayer({ id: 10, teamId: 'A', role: 'CM', x: 100, y: 0 }),
            createPlayer({ id: 11, teamId: 'A', role: 'CM', x: 200, y: 0 }),
            createPlayer({ id: 99, teamId: 'B', role: 'CM', x: 105, y: 0 })
        ];

        const state = createState({ players });
        const possession = createPossessionSnapshot({ ownerId: 7 });

        const targetsA = selector.select(state, possession, []);
        const targetsB = selector.select(state, possession, []);

        expect(targetsA)
            .toEqual(targetsB);
    });


    // ------------------------------------------------------------
    // 10 — INPUT MUTATE EDİLMEZ
    // ------------------------------------------------------------

    it('state, possessionSnapshot ve behaviorSnapshots mutate edilmemeli', () => {

        const selector = new PassTargetSelector();

        const players = [
            createPlayer({ id: 7, teamId: 'A', role: 'CM', x: 0, y: 0 }),
            createPlayer({ id: 10, teamId: 'A', role: 'CM', x: 100, y: 0 })
        ];

        const state = createState({ players });
        const possession = createPossessionSnapshot({ ownerId: 7 });
        const behaviorSnapshots = [
            createBehaviorSnapshot({
                playerId: 10,
                target: { x: 200, y: 0 }
            })
        ];

        const stateClone = structuredClone(state);
        const possessionClone = structuredClone(possession);
        const behaviorClone = structuredClone(behaviorSnapshots);

        selector.select(state, possession, behaviorSnapshots);

        expect(state)
            .toEqual(stateClone);

        expect(possession)
            .toEqual(possessionClone);

        expect(behaviorSnapshots)
            .toEqual(behaviorClone);
    });


    // ------------------------------------------------------------
    // 11 — ÇIKTI IMMUTABLE
    // ------------------------------------------------------------

    it('döndürülen dizi ve elemanlar immutable olmalı', () => {

        const selector = new PassTargetSelector();

        const players = [
            createPlayer({ id: 7, teamId: 'A', role: 'CM', x: 0, y: 0 }),
            createPlayer({ id: 10, teamId: 'A', role: 'CM', x: 100, y: 0 })
        ];

        const state = createState({ players });
        const possession = createPossessionSnapshot({ ownerId: 7 });

        const targets = selector.select(state, possession, []);

        expect(Object.isFrozen(targets))
            .toBe(true);

        expect(Object.isFrozen(targets[0]))
            .toBe(true);
    });


    // ------------------------------------------------------------
    // 12 — GEÇERSİZ BEHAVIOR TARGET → INFINITY
    // ------------------------------------------------------------

    it('geçersiz behavior.target tie-break\'te Infinity kabul edilmeli', () => {

        const selector = new PassTargetSelector();

        const players = [
            createPlayer({ id: 7, teamId: 'A', role: 'CM', x: 0, y: 0 }),
            createPlayer({ id: 10, teamId: 'A', role: 'CM', x: 100, y: 0 }),
            createPlayer({ id: 11, teamId: 'A', role: 'CM', x: 200, y: 0 })
        ];

        const state = createState({ players });
        const possession = createPossessionSnapshot({ ownerId: 7 });

        const behaviorSnapshots = [
            createBehaviorSnapshot({
                playerId: 10,
                target: { x: NaN, y: 0 }    // geçersiz
            }),
            createBehaviorSnapshot({
                playerId: 11,
                target: { x: 200, y: 0 }    // geçerli, kendi pozisyonu
            })
        ];

        const targets = selector.select(state, possession, behaviorSnapshots);

        // 11 önce gelir — çünkü 10'un target'ı geçersiz (Infinity)
        expect(targets[0].receiverId)
            .toBe(11);

        expect(targets[1].receiverId)
            .toBe(10);
    });


    // ------------------------------------------------------------
    // 13 — GEÇERSİZ POSITION → ELENİR
    // ------------------------------------------------------------

    it('geçersiz position\'a sahip oyuncular elenir', () => {

        const selector = new PassTargetSelector();

        const players = [
            createPlayer({ id: 7, teamId: 'A', role: 'CM', x: 0, y: 0 }),

            {
                id: 10,
                teamId: 'A',
                role: 'CM',
                position: { x: NaN, y: 0 },     // geçersiz
                basePosition: { x: 100, y: 0 }
            },

            createPlayer({ id: 11, teamId: 'A', role: 'CM', x: 200, y: 0 })
        ];

        const state = createState({ players });
        const possession = createPossessionSnapshot({ ownerId: 7 });

        const targets = selector.select(state, possession, []);

        expect(
            targets.some(t => t.receiverId === 10)
        ).toBe(false);

        expect(
            targets.some(t => t.receiverId === 11)
        ).toBe(true);
    });


    // ------------------------------------------------------------
    // 14 — MESAFE 0 → ELENİR
    // ------------------------------------------------------------

    it('pasörle aynı pozisyondaki oyuncular elenir', () => {

        const selector = new PassTargetSelector();

        const players = [
            createPlayer({ id: 7, teamId: 'A', role: 'CM', x: 100, y: 100 }),
            createPlayer({ id: 10, teamId: 'A', role: 'CM', x: 100, y: 100 }),  // aynı pozisyon
            createPlayer({ id: 11, teamId: 'A', role: 'CM', x: 200, y: 0 })
        ];

        const state = createState({ players });
        const possession = createPossessionSnapshot({ ownerId: 7 });

        const targets = selector.select(state, possession, []);

        expect(
            targets.some(t => t.receiverId === 10)
        ).toBe(false);

        expect(
            targets.some(t => t.receiverId === 11)
        ).toBe(true);
    });


    // ------------------------------------------------------------
    // 15 — RAKİP YOK → INFINITY (EN YÜKSEK ÖNCELİK)
    // ------------------------------------------------------------

    it('rakip yoksa oyuncunun rakip mesafesi Infinity olur ve en yüksek önceliği alır', () => {

        const selector = new PassTargetSelector();

        const players = [
            createPlayer({ id: 7, teamId: 'A', role: 'CM', x: 0, y: 0 }),
            createPlayer({ id: 10, teamId: 'A', role: 'CM', x: 100, y: 0 })
        ];

        const state = createState({ players });
        const possession = createPossessionSnapshot({ ownerId: 7 });

        const targets = selector.select(state, possession, []);

        expect(targets)
            .toHaveLength(1);

        expect(targets[0].receiverId)
            .toBe(10);
    });


    // ------------------------------------------------------------
    // 16 — GEÇERSİZ INPUT → TypeError
    // ------------------------------------------------------------

    it('geçersiz input TypeError fırlatmalı', () => {

        const selector = new PassTargetSelector();

        const validState = createState({
            players: [
                createPlayer({ id: 7, teamId: 'A', role: 'CM', x: 0, y: 0 })
            ]
        });

        const validPossession = createPossessionSnapshot({ ownerId: 7 });

        expect(() => selector.select(null, validPossession, []))
            .toThrow(TypeError);

        expect(() => selector.select(validState, null, []))
            .toThrow(TypeError);

        expect(() => selector.select(validState, validPossession, null))
            .toThrow(TypeError);

        expect(() => selector.select({ players: null }, validPossession, []))
            .toThrow(TypeError);
    });


    // ------------------------------------------------------------
    // 17 — calculateOpponentDistance DOĞRU HESAPLAR
    // ------------------------------------------------------------

    it('calculateOpponentDistance en yakın rakip mesafesini doğru hesaplar', () => {

        const selector = new PassTargetSelector();

        const player = createPlayer({
            id: 10,
            teamId: 'A',
            role: 'CM',
            x: 100,
            y: 100
        });

        const players = [
            player,
            createPlayer({ id: 99, teamId: 'B', role: 'CM', x: 130, y: 100 }),  // 30 birim
            createPlayer({ id: 88, teamId: 'B', role: 'CM', x: 200, y: 100 })   // 100 birim
        ];

        const distance = selector.calculateOpponentDistance(player, players);

        expect(distance)
            .toBe(30);
    });

});