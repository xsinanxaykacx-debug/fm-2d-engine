// tests/tacticalEngine.test.js

import { describe, it, expect } from 'vitest';
import { TacticalEngine } from '../src/engine/TacticalEngine.js';
import { PitchContext } from '../src/engine/PitchContext.js';

describe('TacticalEngine', () => {

    // ------------------------------------------------------------
    // 1 — MOTOR OLUŞTURMA
    // ------------------------------------------------------------

    it('motor oluşturulabilmeli', () => {

        const engine = new TacticalEngine();

        expect(engine).toBeInstanceOf(TacticalEngine);
    });


    // ------------------------------------------------------------
    // 2 — PITCHCONTEXT OLMADAN
    // ------------------------------------------------------------

    it('pitchContext olmadan da çalışmalı', () => {

        const engine = new TacticalEngine();

        expect(engine.pitchContext).toBeNull();
    });


    // ------------------------------------------------------------
    // 3 — PITCHCONTEXT CONSTRUCTOR ÜZERİNDEN
    // ------------------------------------------------------------

    it('pitchContext constructor üzerinden alınabilmeli', () => {

        const pitchContext = new PitchContext();

        const engine =
            new TacticalEngine({
                pitchContext
            });

        expect(engine.pitchContext).toBe(
            pitchContext
        );
    });


    // ------------------------------------------------------------
    // 4 — TEK OYUNCU
    // ------------------------------------------------------------

    it('tek oyuncu tek snapshot üretmeli', () => {

        const engine = new TacticalEngine();

        const state = {
            players: [
                {
                    id: 1,
                    basePosition: {
                        x: 20,
                        y: 30
                    }
                }
            ]
        };

        const snapshots =
            engine.evaluate(state);

        expect(snapshots).toHaveLength(1);

        expect(snapshots[0].playerId).toBe(1);
    });


    // ------------------------------------------------------------
    // 5 — ÇOKLU OYUNCU
    // ------------------------------------------------------------

    it('çoklu oyuncu için çoklu snapshot üretmeli', () => {

        const engine = new TacticalEngine();

        const state = {
            players: [
                {
                    id: 1,
                    basePosition: {
                        x: 10,
                        y: 20
                    }
                },
                {
                    id: 2,
                    basePosition: {
                        x: 30,
                        y: 40
                    }
                },
                {
                    id: 3,
                    basePosition: {
                        x: 50,
                        y: 60
                    }
                }
            ]
        };

        const snapshots =
            engine.evaluate(state);

        expect(snapshots).toHaveLength(3);

        expect(
            snapshots.map(snapshot => snapshot.playerId)
        ).toEqual([1, 2, 3]);
    });


    // ------------------------------------------------------------
    // 6 — TACTICALTARGET BASE POSITION İLE AYNI
    // ------------------------------------------------------------

    it('tacticalTarget basePosition ile aynı olmalı', () => {

        const engine = new TacticalEngine();

        const state = {
            players: [
                {
                    id: 10,
                    basePosition: {
                        x: 55,
                        y: 34
                    }
                }
            ]
        };

        const snapshots =
            engine.evaluate(state);

        expect(
            snapshots[0].tacticalTarget
        ).toEqual({
            x: 55,
            y: 34
        });
    });


    // ------------------------------------------------------------
    // 7 — SNAPSHOT IMMUTABLE
    // ------------------------------------------------------------

    it('snapshot immutable olmalı', () => {

        const engine = new TacticalEngine();

        const state = {
            players: [
                {
                    id: 1,
                    basePosition: {
                        x: 20,
                        y: 30
                    }
                }
            ]
        };

        const snapshots =
            engine.evaluate(state);

        expect(
            Object.isFrozen(snapshots)
        ).toBe(true);

        expect(
            Object.isFrozen(snapshots[0])
        ).toBe(true);

        expect(
            Object.isFrozen(
                snapshots[0].tacticalTarget
            )
        ).toBe(true);
    });


    // ------------------------------------------------------------
    // 8 — STATE MUTATE EDİLMEZ
    // ------------------------------------------------------------

    it('state mutate edilmemeli', () => {

        const engine = new TacticalEngine();

        const basePosition = {
            x: 20,
            y: 30
        };

        const player = {
            id: 1,
            basePosition
        };

        const state = {
            players: [player]
        };

        const before =
            JSON.stringify(state);

        engine.evaluate(state);

        const after =
            JSON.stringify(state);

        expect(after).toBe(before);

        expect(player.basePosition).toBe(
            basePosition
        );
    });


    // ------------------------------------------------------------
    // 9 — DETERMİNİZM
    // ------------------------------------------------------------

    it('aynı input deterministik sonuç üretmeli', () => {

        const engine = new TacticalEngine();

        const state = {
            players: [
                {
                    id: 1,
                    basePosition: {
                        x: 15,
                        y: 25
                    }
                },
                {
                    id: 2,
                    basePosition: {
                        x: 70,
                        y: 45
                    }
                }
            ]
        };

        const result1 =
            engine.evaluate(state);

        const result2 =
            engine.evaluate(state);

        expect(result1).toEqual(result2);
    });


    // ------------------------------------------------------------
    // 10 — GEÇERSİZ STATE
    // ------------------------------------------------------------

    it('geçersiz state TypeError vermeli', () => {

        const engine = new TacticalEngine();

        expect(() => {
            engine.evaluate(null);
        }).toThrow(TypeError);

        expect(() => {
            engine.evaluate({});
        }).toThrow(TypeError);

        expect(() => {
            engine.evaluate({
                players: 'invalid'
            });
        }).toThrow(TypeError);
    });


    // ------------------------------------------------------------
    // 11 — EKSİK VEYA GEÇERSİZ BASEPOSITION
    // ------------------------------------------------------------

    it('eksik veya geçersiz basePosition TypeError vermeli', () => {

        const engine = new TacticalEngine();

        expect(() => {
            engine.evaluate({
                players: [
                    {
                        id: 1
                    }
                ]
            });
        }).toThrow(TypeError);

        expect(() => {
            engine.evaluate({
                players: [
                    {
                        id: 1,
                        basePosition: {
                            x: 20
                        }
                    }
                ]
            });
        }).toThrow(TypeError);

        expect(() => {
            engine.evaluate({
                players: [
                    {
                        id: 1,
                        basePosition: {
                            x: '20',
                            y: 30
                        }
                    }
                ]
            });
        }).toThrow(TypeError);
    });

});