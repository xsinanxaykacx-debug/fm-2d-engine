// src/engine/PhysicsEngine.js

export class PhysicsEngine {

    constructor({
        playerSpeed = 120,
        minDistance = 0.01,
        pitchWidth = null,
        pitchHeight = null
    } = {}) {

        if (
            !Number.isFinite(playerSpeed) ||
            playerSpeed <= 0
        ) {
            throw new TypeError(
                'PhysicsEngine: playerSpeed must be positive.'
            );
        }

        if (
            !Number.isFinite(minDistance) ||
            minDistance < 0
        ) {
            throw new TypeError(
                'PhysicsEngine: minDistance must be non-negative.'
            );
        }

        const hasPitchWidth =
            pitchWidth !== null;

        const hasPitchHeight =
            pitchHeight !== null;

        if (hasPitchWidth) {

            if (
                !Number.isFinite(pitchWidth) ||
                pitchWidth <= 0
            ) {
                throw new TypeError(
                    'PhysicsEngine: pitchWidth must be positive.'
                );
            }
        }

        if (hasPitchHeight) {

            if (
                !Number.isFinite(pitchHeight) ||
                pitchHeight <= 0
            ) {
                throw new TypeError(
                    'PhysicsEngine: pitchHeight must be positive.'
                );
            }
        }

        if (
            hasPitchWidth !== hasPitchHeight
        ) {
            throw new TypeError(
                'PhysicsEngine: pitchWidth and pitchHeight must be provided together.'
            );
        }

        this.config = Object.freeze({
            playerSpeed,
            minDistance,
            pitchWidth,
            pitchHeight
        });

        Object.freeze(this);
    }


    step(
        players,
        decisions = [],
        timeStep = 1 / 60
    ) {

        if (!Array.isArray(players)) {
            throw new TypeError(
                'PhysicsEngine.step: players must be an array.'
            );
        }

        if (!Array.isArray(decisions)) {
            throw new TypeError(
                'PhysicsEngine.step: decisions must be an array.'
            );
        }

        if (
            !Number.isFinite(timeStep) ||
            timeStep <= 0
        ) {
            throw new TypeError(
                'PhysicsEngine.step: timeStep must be positive.'
            );
        }

        const decisionMap = new Map(
            decisions.map(decision => [
                decision.playerId,
                decision
            ])
        );

        return players.map(player => {

            const decision =
                decisionMap.get(player.id);

            if (!decision) {

                return Object.freeze({
                    ...player,
                    position: Object.freeze(
                        this.clampPosition(
                            player.position.x,
                            player.position.y
                        )
                    )
                });
            }

            if (decision.action !== 'MOVE') {

                return Object.freeze({
                    ...player,
                    position: Object.freeze(
                        this.clampPosition(
                            player.position.x,
                            player.position.y
                        )
                    )
                });
            }

            return Object.freeze(
                this.movePlayer(
                    player,
                    decision.target,
                    timeStep
                )
            );
        });
    }


    clampPosition(x, y) {

        if (!this.isBoundaryEnabled()) {

            return {
                x,
                y
            };
        }

        return {
            x: Math.max(
                0,
                Math.min(
                    this.config.pitchWidth,
                    x
                )
            ),

            y: Math.max(
                0,
                Math.min(
                    this.config.pitchHeight,
                    y
                )
            )
        };
    }


    isBoundaryEnabled() {

        return (
            this.config.pitchWidth !== null &&
            this.config.pitchHeight !== null
        );
    }


    movePlayer(
        player,
        target,
        timeStep
    ) {

        const dx =
            target.x - player.position.x;

        const dy =
            target.y - player.position.y;

        const distance =
            Math.hypot(dx, dy);

        if (
            distance <= this.config.minDistance
        ) {

            return {
                ...player,
                position: Object.freeze(
                    this.clampPosition(
                        target.x,
                        target.y
                    )
                )
            };
        }

        const maxMovement =
            this.config.playerSpeed * timeStep;

        const movement =
            Math.min(
                maxMovement,
                distance
            );

        const ratio =
            movement / distance;

        const rawX =
            player.position.x +
            dx * ratio;

        const rawY =
            player.position.y +
            dy * ratio;

        const clamped =
            this.clampPosition(
                rawX,
                rawY
            );

        return {
            ...player,
            position: Object.freeze(clamped)
        };
    }
}