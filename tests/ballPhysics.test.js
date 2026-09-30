// tests/ballPhysics.test.js

import { describe, it, expect } from 'vitest';

import { BallPhysics } from '../src/engine/BallPhysics.js';


describe('BallPhysics', () => {

    // ------------------------------------------------------------
    // YARDIMCI FONKSİYONLAR
    // ------------------------------------------------------------

    function createBall({
        ownerId = null,
        velocity = { x: 0, y: 0 },
        position = { x: 100, y: 100 }
    } = {}) {

        return {
            ownerId,
            velocity: { ...velocity },
            position: { ...position },
            cloneWith(changes = {}) {
                return createBall({
                    ownerId: changes.ownerId !== undefined
                        ? changes.ownerId
                        : this.ownerId,
                    velocity: changes.velocity !== undefined
                        ? changes.velocity
                        : this.velocity,
                    position: changes.position !== undefined
                        ? changes.position
                        : this.position
                });
            }
        };
    }


    // ------------------------------------------------------------
    // 1 — OLUŞTURMA
    // ------------------------------------------------------------

    it('motor oluşturulabilmeli', () => {

        const physics = new BallPhysics();

        expect(physics)
            .toBeInstanceOf(BallPhysics);
    });


    // ------------------------------------------------------------
    // 2 — GEÇERSİZ BALL → TypeError
    // ------------------------------------------------------------

    it('geçersiz ball → TypeError', () => {

        const physics = new BallPhysics();

        expect(() => physics.step(null, 1 / 60))
            .toThrow(TypeError);

        expect(() => physics.step({}, 1 / 60))
            .toThrow(TypeError);

        expect(() => physics.step({
            position: { x: 0, y: 0 }
        }, 1 / 60))
            .toThrow(TypeError);

        expect(() => physics.step({
            position: { x: 0, y: 0 },
            velocity: { x: 'a', y: 0 }
        }, 1 / 60))
            .toThrow(TypeError);
    });


    // ------------------------------------------------------------
    // 3 — GEÇERSİZ TIMESTEP → TypeError
    // ------------------------------------------------------------

    it('geçersiz timeStep → TypeError', () => {

        const physics = new BallPhysics();

        const ball = createBall();

        expect(() => physics.step(ball, 0))
            .toThrow(TypeError);

        expect(() => physics.step(ball, -1))
            .toThrow(TypeError);

        expect(() => physics.step(ball, NaN))
            .toThrow(TypeError);

        expect(() => physics.step(ball, Infinity))
            .toThrow(TypeError);
    });


    // ------------------------------------------------------------
    // 4 — OWNER NULL → TOP HAREKET EDER
    // ------------------------------------------------------------

    it('sahipsiz top hareket etmeli', () => {

        const physics = new BallPhysics();

        const ball = createBall({
            ownerId: null,
            velocity: { x: 300, y: 0 },
            position: { x: 100, y: 100 }
        });

        const result = physics.step(ball, 1 / 60);

        expect(result.position.x)
            .toBeCloseTo(105, 10);

        expect(result.position.y)
            .toBeCloseTo(100, 10);
    });


    // ------------------------------------------------------------
    // 5 — OWNER MEVCUT → TOP HAREKET ETMEZ
    // ------------------------------------------------------------

    it('sahipli top hareket etmemeli', () => {

        const physics = new BallPhysics();

        const ball = createBall({
            ownerId: 7,
            velocity: { x: 300, y: 0 },
            position: { x: 100, y: 100 }
        });

        const result = physics.step(ball, 1 / 60);

        expect(result.position.x).toBe(100);
        expect(result.position.y).toBe(100);
    });


    // ------------------------------------------------------------
    // 6 — X EKSENİ DOĞRU
    // ------------------------------------------------------------

    it('X ekseninde doğru hareket etmeli', () => {

        const physics = new BallPhysics();

        const ball = createBall({
            ownerId: null,
            velocity: { x: 120, y: 0 },
            position: { x: 50, y: 50 }
        });

        const result = physics.step(ball, 1 / 60);

        expect(result.position.x)
            .toBeCloseTo(52, 10);

        expect(result.position.y)
            .toBe(50);
    });


    // ------------------------------------------------------------
    // 7 — Y EKSENİ DOĞRU
    // ------------------------------------------------------------

    it('Y ekseninde doğru hareket etmeli', () => {

        const physics = new BallPhysics();

        const ball = createBall({
            ownerId: null,
            velocity: { x: 0, y: 120 },
            position: { x: 50, y: 50 }
        });

        const result = physics.step(ball, 1 / 60);

        expect(result.position.x).toBe(50);

        expect(result.position.y)
            .toBeCloseTo(52, 10);
    });


    // ------------------------------------------------------------
    // 8 — NEGATİF VELOCITY
    // ------------------------------------------------------------

    it('negatif velocity ile geriye hareket etmeli', () => {

        const physics = new BallPhysics();

        const ball = createBall({
            ownerId: null,
            velocity: { x: -300, y: -60 },
            position: { x: 100, y: 100 }
        });

        const result = physics.step(ball, 1 / 60);

        expect(result.position.x)
            .toBeCloseTo(95, 10);

        expect(result.position.y)
            .toBeCloseTo(99, 10);
    });


    // ------------------------------------------------------------
    // 9 — VELOCITY FRICTION İLE AZALMALI (GÜNCELLENDİ)
    // ------------------------------------------------------------
    //
    // Önceden: "velocity değiştirilmemeli"
    // Şimdi: "velocity friction kadar azalmalı"
    //
    // Yön korunmalı, sadece büyüklük azalmalı.
    // ------------------------------------------------------------

    it('velocity friction ile azalmalı (yön korunur)', () => {

        const physics = new BallPhysics();

        const ball = createBall({
            ownerId: null,
            velocity: { x: 300, y: 50 },
            position: { x: 0, y: 0 }
        });

        const result = physics.step(ball, 1 / 60);

        // Friction = 0.98 (varsayılan)
        // 300 * 0.98 = 294
        //  50 * 0.98 = 49

        expect(result.velocity.x)
            .toBeCloseTo(294, 10);

        expect(result.velocity.y)
            .toBeCloseTo(49, 10);
    });


    // ------------------------------------------------------------
    // 10 — ORİJİNAL BALL DEĞİŞMEZ
    // ------------------------------------------------------------

    it('orijinal ball mutate edilmemeli', () => {

        const physics = new BallPhysics();

        const ball = createBall({
            ownerId: null,
            velocity: { x: 300, y: 0 },
            position: { x: 100, y: 100 }
        });

        const originalPosition = { ...ball.position };
        const originalVelocity = { ...ball.velocity };

        physics.step(ball, 1 / 60);

        expect(ball.position).toEqual(originalPosition);
        expect(ball.velocity).toEqual(originalVelocity);
    });


    // ------------------------------------------------------------
    // 11 — YENİ BALL ÜRETİLİR
    // ------------------------------------------------------------

    it('yeni ball objesi üretilmeli', () => {

        const physics = new BallPhysics();

        const ball = createBall({
            ownerId: null,
            velocity: { x: 300, y: 0 }
        });

        const result = physics.step(ball, 1 / 60);

        expect(result).not.toBe(ball);
    });


    // ------------------------------------------------------------
    // 12 — DETERMİNİSTİK
    // ------------------------------------------------------------

    it('aynı input deterministik sonuç üretmeli', () => {

        const physics = new BallPhysics();

        const ball = createBall({
            ownerId: null,
            velocity: { x: 300, y: 100 },
            position: { x: 50, y: 50 }
        });

        const resultA = physics.step(ball, 1 / 60);
        const resultB = physics.step(ball, 1 / 60);

        expect(resultA.position).toEqual(resultB.position);
        expect(resultA.velocity).toEqual(resultB.velocity);
    });


    // ============================================================
    // YENİ TESTLER — FRICTION SÖZLEŞMESİ
    // ============================================================

    // ------------------------------------------------------------
    // 13 — YÖN KORUNMALI
    // ------------------------------------------------------------

    it('friction sonrası yön korunmalı (sadece büyüklük azalır)', () => {

        const physics = new BallPhysics();

        const ball = createBall({
            ownerId: null,
            velocity: { x: 300, y: 0 },
            position: { x: 0, y: 0 }
        });

        const result = physics.step(ball, 1 / 60);

        // Yön pozitif olmalı
        expect(result.velocity.x).toBeGreaterThan(0);
        expect(result.velocity.y).toBe(0);

        // Negatif velocity için de yön korunmalı
        const ballNegative = createBall({
            ownerId: null,
            velocity: { x: -300, y: -60 },
            position: { x: 100, y: 100 }
        });

        const resultNegative = physics.step(ballNegative, 1 / 60);

        expect(resultNegative.velocity.x).toBeLessThan(0);
        expect(resultNegative.velocity.y).toBeLessThan(0);
    });


    // ------------------------------------------------------------
    // 14 — ÇOK TICK SONRA TOP DURMALI
    // ------------------------------------------------------------

    it('çok tick sonra top durmalı (friction birikimi)', () => {

        const physics = new BallPhysics();

        let ball = createBall({
            ownerId: null,
            velocity: { x: 300, y: 0 },
            position: { x: 0, y: 0 }
        });

        // 1000 tick simüle et
        for (let i = 0; i < 1000; i++) {
            ball = physics.step(ball, 1 / 60);
        }

        // 0.98^1000 ≈ 1.7e-9 → pratik olarak 0
        expect(Math.abs(ball.velocity.x)).toBeLessThan(0.01);
    });


    // ------------------------------------------------------------
    // 15 — SAHİPLİ TOPTA FRICTION UYGULANMAZ
    // ------------------------------------------------------------

    it('sahipli topun velocity değeri friction ile azalmamalı', () => {

        const physics = new BallPhysics();

        const ball = createBall({
            ownerId: 7,
            velocity: { x: 300, y: 50 },
            position: { x: 100, y: 100 }
        });

        const result = physics.step(ball, 1 / 60);

        // Sahipli top: velocity aynen korunur
        expect(result.velocity.x).toBe(300);
        expect(result.velocity.y).toBe(50);
    });


    // ------------------------------------------------------------
    // 16 — CUSTOM FRICTION
    // ------------------------------------------------------------

    it('custom friction değeri uygulanabilir', () => {

        const physics = new BallPhysics({ friction: 0.5 });

        const ball = createBall({
            ownerId: null,
            velocity: { x: 100, y: 0 },
            position: { x: 0, y: 0 }
        });

        const result = physics.step(ball, 1 / 60);

        // 100 * 0.5 = 50
        expect(result.velocity.x)
            .toBeCloseTo(50, 10);
    });


    // ------------------------------------------------------------
    // 17 — GEÇERSİZ FRICTION → TypeError
    // ------------------------------------------------------------

    it('geçersiz friction → TypeError', () => {

        expect(() => new BallPhysics({ friction: -0.1 }))
            .toThrow(TypeError);

        expect(() => new BallPhysics({ friction: 0 }))
            .toThrow(TypeError);

        expect(() => new BallPhysics({ friction: 1.5 }))
            .toThrow(TypeError);

        expect(() => new BallPhysics({ friction: NaN }))
            .toThrow(TypeError);

        expect(() => new BallPhysics({ friction: Infinity }))
            .toThrow(TypeError);
    });

});