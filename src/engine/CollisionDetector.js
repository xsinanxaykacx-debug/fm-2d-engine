export class CollisionDetector {

    constructor({
        collisionDistance = 30
    } = {}) {

        if (
            !Number.isFinite(collisionDistance) ||
            collisionDistance < 0
        ) {
            throw new TypeError(
                'CollisionDetector: collisionDistance must be non-negative.'
            );
        }

        this.config = Object.freeze({
            collisionDistance
        });

        Object.freeze(this);
    }


    detectPlayerOverlaps(players) {

        if (!Array.isArray(players)) {
            throw new TypeError(
                'CollisionDetector.detectPlayerOverlaps: players must be an array.'
            );
        }

        const collisions = [];

        for (let i = 0; i < players.length; i++) {

            const playerA = players[i];

            if (
                !playerA ||
                !playerA.position ||
                !Number.isFinite(playerA.position.x) ||
                !Number.isFinite(playerA.position.y)
            ) {
                throw new TypeError(
                    `CollisionDetector: Invalid position for player ${playerA?.id}.`
                );
            }

            for (let j = i + 1; j < players.length; j++) {

                const playerB = players[j];

                if (
                    !playerB ||
                    !playerB.position ||
                    !Number.isFinite(playerB.position.x) ||
                    !Number.isFinite(playerB.position.y)
                ) {
                    throw new TypeError(
                        `CollisionDetector: Invalid position for player ${playerB?.id}.`
                    );
                }

                const dx =
                    playerB.position.x -
                    playerA.position.x;

                const dy =
                    playerB.position.y -
                    playerA.position.y;

                const distance =
                    Math.hypot(dx, dy);

                if (
                    distance <=
                    this.config.collisionDistance
                ) {

                    collisions.push(
                        Object.freeze({
                            playerAId: playerA.id,
                            playerBId: playerB.id,
                            distance
                        })
                    );
                }
            }
        }

        return collisions;
    }
}