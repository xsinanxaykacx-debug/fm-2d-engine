// src/engine/CollisionStateTransition.js

export class CollisionStateTransition {

    constructor({
        collisionDistance = 30,
        pitchWidth = null,
        pitchHeight = null
    } = {}) {

        if (
            !Number.isFinite(collisionDistance) ||
            collisionDistance < 0
        ) {
            throw new TypeError(
                'CollisionStateTransition: collisionDistance must be non-negative.'
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
                    'CollisionStateTransition: pitchWidth must be positive.'
                );
            }
        }

        if (hasPitchHeight) {

            if (
                !Number.isFinite(pitchHeight) ||
                pitchHeight <= 0
            ) {
                throw new TypeError(
                    'CollisionStateTransition: pitchHeight must be positive.'
                );
            }
        }

        if (
            hasPitchWidth !== hasPitchHeight
        ) {
            throw new TypeError(
                'CollisionStateTransition: pitchWidth and pitchHeight must be provided together.'
            );
        }

        this.config = Object.freeze({
            collisionDistance,
            pitchWidth,
            pitchHeight
        });

        Object.freeze(this);
    }


    apply(players, collisions = []) {

        if (!Array.isArray(players)) {
            throw new TypeError(
                'CollisionStateTransition.apply: players must be an array.'
            );
        }

        if (!Array.isArray(collisions)) {
            throw new TypeError(
                'CollisionStateTransition.apply: collisions must be an array.'
            );
        }

        const positionMap = new Map(
            players.map(player => [
                player.id,
                {
                    x: player.position.x,
                    y: player.position.y
                }
            ])
        );

        for (const collision of collisions) {

            if (
                !collision ||
                collision.playerAId === undefined ||
                collision.playerBId === undefined
            ) {
                throw new TypeError(
                    'CollisionStateTransition: Invalid collision.'
                );
            }

            const positionA =
                positionMap.get(collision.playerAId);

            const positionB =
                positionMap.get(collision.playerBId);

            if (!positionA || !positionB) {
                continue;
            }

            this.resolveCollision(
                positionA,
                positionB
            );
        }

        return players.map(player => {

            const position =
                positionMap.get(player.id);

            return Object.freeze({
                ...player,
                position: Object.freeze({
                    x: position.x,
                    y: position.y
                })
            });
        });
    }


    /**
     * Pozisyonu saha sınırları içine sıkıştırır.
     *
     * pitchWidth veya pitchHeight null ise clamp uygulanmaz —
     * mevcut davranış korunur.
     *
     * @param {{x: number, y: number}} position
     */
    clampPosition(position) {

        if (!this.isBoundaryEnabled()) {
            return;
        }

        position.x = Math.max(
            0,
            Math.min(this.config.pitchWidth, position.x)
        );

        position.y = Math.max(
            0,
            Math.min(this.config.pitchHeight, position.y)
        );
    }


    isBoundaryEnabled() {

        return (
            this.config.pitchWidth !== null &&
            this.config.pitchHeight !== null
        );
    }


    resolveCollision(positionA, positionB) {

        let dx =
            positionB.x - positionA.x;

        let dy =
            positionB.y - positionA.y;

        const distance =
            Math.hypot(dx, dy);

        if (
            distance >=
            this.config.collisionDistance
        ) {
            return;
        }

        /*
         * Oyuncular aynı noktadaysa yön belirlemek için
         * deterministik bir normal kullanıyoruz.
         *
         * Ancak gerçek mesafe 0 olarak korunuyor.
         */
        let normalX;
        let normalY;

        if (distance === 0) {

            normalX = 1;
            normalY = 0;

        } else {

            normalX =
                dx / distance;

            normalY =
                dy / distance;
        }

        const overlap =
            this.config.collisionDistance -
            distance;

        const correction =
            overlap / 2;

        positionA.x -=
            normalX * correction;

        positionA.y -=
            normalY * correction;

        positionB.x +=
            normalX * correction;

        positionB.y +=
            normalY * correction;

        // Boundary clamp — sadece sınırlar verilmişse
        this.clampPosition(positionA);
        this.clampPosition(positionB);
    }
}