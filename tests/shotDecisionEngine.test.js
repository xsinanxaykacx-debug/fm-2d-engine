// tests/shotDecisionEngine.test.js

import { describe, it, expect } from 'vitest';

import {
    ShotDecisionEngine,
    DEFAULT_SHOOT_RANGE,
    DEFAULT_PRESSURE_THRESHOLD
} from '../src/engine/ShotDecisionEngine.js';

import { PitchContext } from '../src/engine/PitchContext.js';
import { SHOT_TYPES } from '../src/engine/ShotEngine.js';

describe('ShotDecisionEngine', () => {

    function createPitch() {
        return new PitchContext();
    }

    function createEngine(options = {}) {
        return new ShotDecisionEngine({
            pitchContext: createPitch(),
            ...options
        });
    }

    function createState({
        playerX = 80,
        playerY = 34,
        teamId = 'HOME'
    } = {}) {
        return {
            players: [
                {
                    id: 7,
                    teamId,
                    role: 'ST',
                    position: {
                        x: playerX,
                        y: playerY
                    },
                    basePosition: {
                        x: playerX,
                        y: playerY
                    }
                },
                {
                    id: 8,
                    teamId: 'HOME',
                    role: 'MC',
                    position: {
                        x: 50,
                        y: 20
                    },
                    basePosition: {
                        x: 50,
                        y: 20
                    }
                }
            ]
        };
    }

    function createPossession({
        ownerId = 7,
        nearestOpponentDistance = 50
    } = {}) {
        return {
            ownerId,
            nearestOpponentDistance
        };
    }

    it('motor oluşturulabilmeli', () => {
        const engine = createEngine();

        expect(
            engine
        ).toBeInstanceOf(
            ShotDecisionEngine
        );
    });

    it('varsayılan eşikler doğru olmalı', () => {
        const engine = createEngine();

        expect(
            engine.shootRange
        ).toBe(
            DEFAULT_SHOOT_RANGE
        );

        expect(
            engine.pressureThreshold
        ).toBe(
            DEFAULT_PRESSURE_THRESHOLD
        );
    });

    it('pitchContext zorunlu olmalı', () => {
        expect(() => {
            new ShotDecisionEngine();
        }).toThrow(TypeError);
    });

    it('pitchContext olmadan şut motoru oluşturulamamalı', () => {
        expect(() => {
            new ShotDecisionEngine({
                pitchContext: null
            });
        }).toThrow(TypeError);
    });

    it('top sahibi olmayan oyuncu canShoot false döndürmeli', () => {
        const engine = createEngine();

        const state =
            createState();

        const possession =
            createPossession({
                ownerId: 8
            });

        const result =
            engine.evaluate(
                state,
                possession
            );

        const playerResult =
            result.find(
                item => item.playerId === 7
            );

        expect(
            playerResult.canShoot
        ).toBe(false);

        expect(
            playerResult.reason
        ).toBe('NOT_OWNER');
    });

    it('kale çok uzaktaysa canShoot false olmalı', () => {
        const engine =
            createEngine({
                shootRange: 20
            });

        const state =
            createState({
                playerX: 50,
                playerY: 34
            });

        const possession =
            createPossession();

        const result =
            engine.evaluate(
                state,
                possession
            );

        const playerResult =
            result.find(
                item => item.playerId === 7
            );

        expect(
            playerResult.canShoot
        ).toBe(false);

        expect(
            playerResult.reason
        ).toBe('TOO_FAR');
    });

    it('rakip baskısı çok yakınsa canShoot false olmalı', () => {
        const engine =
            createEngine({
                pressureThreshold: 30
            });

        const state =
            createState();

        const possession =
            createPossession({
                nearestOpponentDistance: 10
            });

        const result =
            engine.evaluate(
                state,
                possession
            );

        const playerResult =
            result.find(
                item => item.playerId === 7
            );

        expect(
            playerResult.canShoot
        ).toBe(false);

        expect(
            playerResult.reason
        ).toBe('OPPONENT_PRESSURE');
    });

    it('tüm koşullar uygunsa canShoot true olmalı', () => {
        const engine =
            createEngine();

        const state =
            createState();

        const possession =
            createPossession({
                nearestOpponentDistance: 50
            });

        const result =
            engine.evaluate(
                state,
                possession
            );

        const playerResult =
            result.find(
                item => item.playerId === 7
            );

        expect(
            playerResult.canShoot
        ).toBe(true);
    });

    it('hedef HOME için sağ kale merkezi olmalı', () => {
        const engine =
            createEngine();

        const state =
            createState({
                playerX: 80,
                playerY: 34,
                teamId: 'HOME'
            });

        const result =
            engine.evaluate(
                state,
                createPossession()
            );

        const playerResult =
            result.find(
                item => item.playerId === 7
            );

        expect(
            playerResult.targetPosition
        ).toEqual({
            x: 105,
            y: 34
        });
    });

    it('shotType varsayılan olarak GROUND olmalı', () => {
        const engine =
            createEngine();

        const result =
            engine.evaluate(
                createState(),
                createPossession()
            );

        const playerResult =
            result.find(
                item => item.playerId === 7
            );

        expect(
            playerResult.shotType
        ).toBe(
            SHOT_TYPES.GROUND
        );
    });

    it('distanceToGoal doğru hesaplanmalı', () => {
        const engine =
            createEngine();

        const state =
            createState({
                playerX: 80,
                playerY: 34
            });

        const result =
            engine.evaluate(
                state,
                createPossession()
            );

        const playerResult =
            result.find(
                item => item.playerId === 7
            );

        expect(
            playerResult.distanceToGoal
        ).toBe(25);
    });

    it('HOME LEFT yönünde sol kaleyi hedeflemeli', () => {
        const pitch =
            new PitchContext({
                homeAttackingSide: 'LEFT'
            });

        const engine =
            new ShotDecisionEngine({
                pitchContext: pitch
            });

        const state =
            createState({
                playerX: 25,
                playerY: 34,
                teamId: 'HOME'
            });

        const result =
            engine.evaluate(
                state,
                createPossession()
            );

        const playerResult =
            result.find(
                item => item.playerId === 7
            );

        expect(
            playerResult.targetPosition
        ).toEqual({
            x: 0,
            y: 34
        });
    });

    it('ceza sahasında da temel kurallar değişmemeli', () => {
        const engine =
            createEngine();

        const state =
            createState({
                playerX: 95,
                playerY: 34
            });

        const result =
            engine.evaluate(
                state,
                createPossession({
                    nearestOpponentDistance: 50
                })
            );

        const playerResult =
            result.find(
                item => item.playerId === 7
            );

        expect(
            playerResult.canShoot
        ).toBe(true);

        expect(
            playerResult.shotType
        ).toBe(
            SHOT_TYPES.GROUND
        );
    });

    it('state mutate edilmemeli', () => {
        const engine =
            createEngine();

        const state =
            createState();

        const before =
            JSON.stringify(state);

        engine.evaluate(
            state,
            createPossession()
        );

        const after =
            JSON.stringify(state);

        expect(after).toBe(before);
    });

    it('aynı input deterministik sonuç üretmeli', () => {
        const engine =
            createEngine();

        const state =
            createState();

        const possession =
            createPossession();

        const result1 =
            engine.evaluate(
                state,
                possession
            );

        const result2 =
            engine.evaluate(
                state,
                possession
            );

        expect(result1).toEqual(result2);
    });

    it('geçersiz input TypeError vermeli', () => {
        const engine =
            createEngine();

        expect(() => {
            engine.evaluate(
                null,
                createPossession()
            );
        }).toThrow(TypeError);

        expect(() => {
            engine.evaluate(
                {},
                createPossession()
            );
        }).toThrow(TypeError);

        expect(() => {
            engine.evaluate(
                createState(),
                null
            );
        }).toThrow(TypeError);
    });

    it('reason alanı doğru döndürülmeli', () => {
        const engine =
            createEngine({
                pressureThreshold: 30
            });

        const state =
            createState();

        const result =
            engine.evaluate(
                state,
                createPossession({
                    nearestOpponentDistance: 5
                })
            );

        const playerResult =
            result.find(
                item => item.playerId === 7
            );

        expect(
            playerResult.reason
        ).toBe(
            'OPPONENT_PRESSURE'
        );
    });

    it('geçersiz eşikler TypeError vermeli', () => {
        expect(() => {
            createEngine({
                shootRange: 0
            });
        }).toThrow(TypeError);

        expect(() => {
            createEngine({
                shootRange: -10
            });
        }).toThrow(TypeError);

        expect(() => {
            createEngine({
                pressureThreshold: -1
            });
        }).toThrow(TypeError);

        expect(() => {
            createEngine({
                shootRange: NaN
            });
        }).toThrow(TypeError);
    });
});