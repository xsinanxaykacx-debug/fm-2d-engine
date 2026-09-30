// tests/pitchContext.test.js

import { describe, it, expect } from 'vitest';
import { PitchContext } from '../src/engine/PitchContext.js';


describe('PitchContext', () => {

    // ------------------------------------------------------------
    // 1 — MOTOR OLUŞTURMA
    // ------------------------------------------------------------

    it('motor varsayılan boyutlarla oluşturulabilmeli', () => {

        const pitch = new PitchContext();

        expect(pitch.width).toBe(105);
        expect(pitch.height).toBe(68);
        expect(pitch.goalWidth).toBe(7.32);
        expect(pitch.homeAttackingSide).toBe('RIGHT');
    });


    // ------------------------------------------------------------
    // 2 — ÖZEL BOYUTLAR
    // ------------------------------------------------------------

    it('özel boyutlarla oluşturulabilmeli', () => {

        const pitch = new PitchContext({
            width: 100,
            height: 60,
            goalWidth: 8,
            homeAttackingSide: 'LEFT'
        });

        expect(pitch.width).toBe(100);
        expect(pitch.height).toBe(60);
        expect(pitch.goalWidth).toBe(8);
        expect(pitch.homeAttackingSide).toBe('LEFT');
    });


    // ------------------------------------------------------------
    // 3 — KALE MERKEZLERİ
    // ------------------------------------------------------------

    it('kale merkezleri doğru hesaplanmalı', () => {

        const pitch = new PitchContext();

        expect(pitch.leftGoalCenter).toEqual({ x: 0, y: 34 });
        expect(pitch.rightGoalCenter).toEqual({ x: 105, y: 34 });
    });


    // ------------------------------------------------------------
    // 4 — KALE DİREKLERİ
    // ------------------------------------------------------------

    it('kale direkleri doğru hesaplanmalı', () => {

        const pitch = new PitchContext();

        expect(pitch.leftGoalTop).toEqual({ x: 0, y: 34 - 3.66 });
        expect(pitch.leftGoalBottom).toEqual({ x: 0, y: 34 + 3.66 });
        expect(pitch.rightGoalTop).toEqual({ x: 105, y: 34 - 3.66 });
        expect(pitch.rightGoalBottom).toEqual({ x: 105, y: 34 + 3.66 });
    });


    // ------------------------------------------------------------
    // 5 — HÜCUM KALESİ (homeAttackingSide = RIGHT)
    // ------------------------------------------------------------

    it('RIGHT yönünde HOME sağ kaleye hücum etmeli', () => {

        const pitch = new PitchContext({
            homeAttackingSide: 'RIGHT'
        });

        expect(pitch.getAttackingGoalCenter('HOME'))
            .toEqual({ x: 105, y: 34 });

        expect(pitch.getAttackingGoalCenter('AWAY'))
            .toEqual({ x: 0, y: 34 });
    });


    // ------------------------------------------------------------
    // 6 — HÜCUM KALESİ (homeAttackingSide = LEFT)
    // ------------------------------------------------------------

    it('LEFT yönünde HOME sol kaleye hücum etmeli', () => {

        const pitch = new PitchContext({
            homeAttackingSide: 'LEFT'
        });

        expect(pitch.getAttackingGoalCenter('HOME'))
            .toEqual({ x: 0, y: 34 });

        expect(pitch.getAttackingGoalCenter('AWAY'))
            .toEqual({ x: 105, y: 34 });
    });


    // ------------------------------------------------------------
    // 7 — SAVUNMA KALESİ
    // ------------------------------------------------------------

    it('savunma kalesi doğru hesaplanmalı', () => {

        const pitch = new PitchContext({
            homeAttackingSide: 'RIGHT'
        });

        expect(pitch.getDefendingGoalCenter('HOME'))
            .toEqual({ x: 0, y: 34 });

        expect(pitch.getDefendingGoalCenter('AWAY'))
            .toEqual({ x: 105, y: 34 });
    });


    // ------------------------------------------------------------
    // 8 — ŞUT HEDEFİ (varsayılan)
    // ------------------------------------------------------------

    it('varsayılan şut hedefi kale merkezi olmalı', () => {

        const pitch = new PitchContext({
            homeAttackingSide: 'RIGHT'
        });

        expect(pitch.getShotTarget('HOME'))
            .toEqual({ x: 105, y: 34 });
    });


    // ------------------------------------------------------------
    // 9 — ŞUT HEDEFİ (özel y)
    // ------------------------------------------------------------

    it('özel y ile şut hedefi doğru hesaplanmalı', () => {

        const pitch = new PitchContext({
            homeAttackingSide: 'RIGHT'
        });

        expect(pitch.getShotTarget('HOME', 31))
            .toEqual({ x: 105, y: 31 });
    });


    // ------------------------------------------------------------
    // 10 — CEZA SAHASI
    // ------------------------------------------------------------

    it('ceza sahası doğru hesaplanmalı', () => {

        const pitch = new PitchContext({
            homeAttackingSide: 'RIGHT'
        });

        const homePenalty = pitch.getPenaltyArea('HOME');
        const awayPenalty = pitch.getPenaltyArea('AWAY');

        expect(homePenalty.x).toBe(105 - 16.5);
        expect(homePenalty.width).toBe(16.5);
        expect(homePenalty.height).toBe(40.32);

        expect(awayPenalty.x).toBe(0);
        expect(awayPenalty.width).toBe(16.5);
    });


    // ------------------------------------------------------------
    // 11 — CEZA SAHASI KONTROLÜ
    // ------------------------------------------------------------

    it('isInPenaltyArea doğru sonuç döndürmeli', () => {

        const pitch = new PitchContext({
            homeAttackingSide: 'RIGHT'
        });

        expect(pitch.isInPenaltyArea({ x: 95, y: 34 }, 'HOME'))
            .toBe(true);

        expect(pitch.isInPenaltyArea({ x: 50, y: 34 }, 'HOME'))
            .toBe(false);

        expect(pitch.isInPenaltyArea({ x: 5, y: 34 }, 'AWAY'))
            .toBe(true);
    });


    // ------------------------------------------------------------
    // 12 — KALE ALANI
    // ------------------------------------------------------------

    it('kale alanı doğru hesaplanmalı', () => {

        const pitch = new PitchContext({
            homeAttackingSide: 'RIGHT'
        });

        const homeGoalArea = pitch.getGoalArea('HOME');

        expect(homeGoalArea.x).toBe(105 - 5.5);
        expect(homeGoalArea.width).toBe(5.5);
        expect(homeGoalArea.height).toBe(5.5);
    });


    // ------------------------------------------------------------
    // 13 — GEÇERSİZ BOYUTLAR
    // ------------------------------------------------------------

    it('geçersiz boyutlar hata fırlatmalı', () => {

        expect(() => new PitchContext({ width: 0 }))
            .toThrow(TypeError);

        expect(() => new PitchContext({ width: -10 }))
            .toThrow(TypeError);

        expect(() => new PitchContext({ width: NaN }))
            .toThrow(TypeError);

        expect(() => new PitchContext({ height: 0 }))
            .toThrow(TypeError);

        expect(() => new PitchContext({ goalWidth: -1 }))
            .toThrow(TypeError);
    });


    // ------------------------------------------------------------
    // 14 — GEÇERSİZ EV SAHİBİ YÖNÜ
    // ------------------------------------------------------------

    it('geçersiz homeAttackingSide hata fırlatmalı', () => {

        expect(() => new PitchContext({ homeAttackingSide: 'UP' }))
            .toThrow(TypeError);

        expect(() => new PitchContext({ homeAttackingSide: 'DOWN' }))
            .toThrow(TypeError);

        expect(() => new PitchContext({ homeAttackingSide: null }))
            .toThrow(TypeError);
    });


    // ------------------------------------------------------------
    // 15 — IMMUTABLE + DETERMİNİZM
    // ------------------------------------------------------------

    it('instance immutable ve deterministik olmalı', () => {

        const pitchA = new PitchContext();
        const pitchB = new PitchContext();

        expect(Object.isFrozen(pitchA)).toBe(true);

        expect(pitchA.getAttackingGoalCenter('HOME'))
            .toEqual(pitchB.getAttackingGoalCenter('HOME'));

        expect(pitchA.getPenaltyArea('HOME'))
            .toEqual(pitchB.getPenaltyArea('HOME'));
    });

});