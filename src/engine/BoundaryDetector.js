// src/engine/BoundaryDetector.js

export const BOUNDARY_EDGES = Object.freeze({
    NONE: 'NONE',
    OUT_LEFT: 'OUT_LEFT',
    OUT_RIGHT: 'OUT_RIGHT',
    OUT_TOP: 'OUT_TOP',
    OUT_BOTTOM: 'OUT_BOTTOM'
});

export const DEFAULT_PITCH_DIMENSIONS = Object.freeze({
    width: 105,
    height: 68
});

export class BoundaryDetector {

    /**
     * @param {Object} [pitchDimensions]
     * @param {number} [pitchDimensions.width=105]
     * @param {number} [pitchDimensions.height=68]
     */
    constructor(
        pitchDimensions = DEFAULT_PITCH_DIMENSIONS
    ) {

        if (
            !pitchDimensions ||
            typeof pitchDimensions.width !== 'number' ||
            typeof pitchDimensions.height !== 'number'
        ) {
            throw new TypeError(
                'BoundaryDetector: Valid pitchDimensions with numeric width and height are required.'
            );
        }

        if (
            !Number.isFinite(pitchDimensions.width) ||
            pitchDimensions.width <= 0
        ) {
            throw new TypeError(
                'BoundaryDetector: pitch width must be positive.'
            );
        }

        if (
            !Number.isFinite(pitchDimensions.height) ||
            pitchDimensions.height <= 0
        ) {
            throw new TypeError(
                'BoundaryDetector: pitch height must be positive.'
            );
        }

        this.pitchWidth =
            pitchDimensions.width;

        this.pitchHeight =
            pitchDimensions.height;

        Object.freeze(this);
    }


    /**
     * Evaluates whether the ball has completely
     * crossed any pitch boundary.
     *
     * @param {Object} ball
     * @returns {Object} Immutable BoundarySnapshot
     */
    evaluate(ball) {

        if (
            !ball ||
            !ball.position ||
            typeof ball.position.x !== 'number' ||
            typeof ball.position.y !== 'number'
        ) {
            throw new TypeError(
                'BoundaryDetector.evaluate: Valid ball object with position {x, y} is required.'
            );
        }

        const radius =
            typeof ball.radius === 'number'
                ? ball.radius
                : 0.11;

        if (
            !Number.isFinite(radius) ||
            radius < 0
        ) {
            throw new TypeError(
                'BoundaryDetector.evaluate: ball radius must be a non-negative finite number.'
            );
        }

        const { x, y } =
            ball.position;

        let edge =
            BOUNDARY_EDGES.NONE;

        let isOutOfBounds =
            false;


        // Topun tamamı çizgiyi geçmeli.
        if (x - radius < 0) {

            edge =
                BOUNDARY_EDGES.OUT_LEFT;

            isOutOfBounds =
                true;

        } else if (x + radius > this.pitchWidth) {

            edge =
                BOUNDARY_EDGES.OUT_RIGHT;

            isOutOfBounds =
                true;

        } else if (y - radius < 0) {

            edge =
                BOUNDARY_EDGES.OUT_TOP;

            isOutOfBounds =
                true;

        } else if (y + radius > this.pitchHeight) {

            edge =
                BOUNDARY_EDGES.OUT_BOTTOM;

            isOutOfBounds =
                true;
        }


        return Object.freeze({

            isOutOfBounds,

            edge,

            exitPosition:
                isOutOfBounds
                    ? Object.freeze({
                        x,
                        y
                    })
                    : null
        });
    }
}