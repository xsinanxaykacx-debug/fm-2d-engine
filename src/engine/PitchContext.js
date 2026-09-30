export class PitchContext {
    constructor({
        width = 105,
        height = 68,
        goalWidth = 7.32,
        goalDepth = 2.0,
        goalAreaWidth = 5.5,
        goalAreaDepth = 5.5,
        penaltyAreaWidth = 16.5,
        penaltyAreaDepth = 40.32,
        homeAttackingSide = 'RIGHT'
    } = {}) {

        if (!Number.isFinite(width) || width <= 0) {
            throw new TypeError(
                'PitchContext: width must be positive.'
            );
        }

        if (!Number.isFinite(height) || height <= 0) {
            throw new TypeError(
                'PitchContext: height must be positive.'
            );
        }

        if (!Number.isFinite(goalWidth) || goalWidth <= 0) {
            throw new TypeError(
                'PitchContext: goalWidth must be positive.'
            );
        }

        if (goalWidth > height) {
            throw new RangeError(
                'PitchContext: goalWidth cannot exceed pitch height.'
            );
        }

        if (!Number.isFinite(goalDepth) || goalDepth < 0) {
            throw new TypeError(
                'PitchContext: goalDepth must be non-negative.'
            );
        }

        if (!Number.isFinite(goalAreaWidth) || goalAreaWidth <= 0) {
            throw new TypeError(
                'PitchContext: goalAreaWidth must be positive.'
            );
        }

        if (!Number.isFinite(goalAreaDepth) || goalAreaDepth <= 0) {
            throw new TypeError(
                'PitchContext: goalAreaDepth must be positive.'
            );
        }

        if (!Number.isFinite(penaltyAreaWidth) || penaltyAreaWidth <= 0) {
            throw new TypeError(
                'PitchContext: penaltyAreaWidth must be positive.'
            );
        }

        if (!Number.isFinite(penaltyAreaDepth) || penaltyAreaDepth <= 0) {
            throw new TypeError(
                'PitchContext: penaltyAreaDepth must be positive.'
            );
        }

        if (penaltyAreaDepth > height) {
            throw new RangeError(
                'PitchContext: penaltyAreaDepth cannot exceed pitch height.'
            );
        }

        if (goalAreaDepth > width) {
            throw new RangeError(
                'PitchContext: goalAreaDepth cannot exceed pitch width.'
            );
        }

        if (penaltyAreaWidth > width) {
            throw new RangeError(
                'PitchContext: penaltyAreaWidth cannot exceed pitch width.'
            );
        }

        if (
            homeAttackingSide !== 'RIGHT' &&
            homeAttackingSide !== 'LEFT'
        ) {
            throw new TypeError(
                'PitchContext: homeAttackingSide must be RIGHT or LEFT.'
            );
        }

        const centerY = height / 2;
        const halfGoalWidth = goalWidth / 2;
        const halfGoalAreaDepth = goalAreaDepth / 2;
        const halfPenaltyAreaDepth = penaltyAreaDepth / 2;

        this.width = width;
        this.height = height;

        this.goalWidth = goalWidth;
        this.goalDepth = goalDepth;

        this.goalAreaWidth = goalAreaWidth;
        this.goalAreaDepth = goalAreaDepth;

        this.penaltyAreaWidth = penaltyAreaWidth;
        this.penaltyAreaDepth = penaltyAreaDepth;

        this.homeAttackingSide = homeAttackingSide;

        this.leftGoalCenter = Object.freeze({
            x: 0,
            y: centerY
        });

        this.rightGoalCenter = Object.freeze({
            x: width,
            y: centerY
        });

        this.leftGoalTop = Object.freeze({
            x: 0,
            y: centerY - halfGoalWidth
        });

        this.leftGoalBottom = Object.freeze({
            x: 0,
            y: centerY + halfGoalWidth
        });

        this.rightGoalTop = Object.freeze({
            x: width,
            y: centerY - halfGoalWidth
        });

        this.rightGoalBottom = Object.freeze({
            x: width,
            y: centerY + halfGoalWidth
        });

        this.center = Object.freeze({
            x: width / 2,
            y: centerY
        });

        this._leftGoalArea = Object.freeze({
            x: 0,
            y: centerY - halfGoalAreaDepth,
            width: goalAreaWidth,
            height: goalAreaDepth
        });

        this._rightGoalArea = Object.freeze({
            x: width - goalAreaWidth,
            y: centerY - halfGoalAreaDepth,
            width: goalAreaWidth,
            height: goalAreaDepth
        });

        this._leftPenaltyArea = Object.freeze({
            x: 0,
            y: centerY - halfPenaltyAreaDepth,
            width: penaltyAreaWidth,
            height: penaltyAreaDepth
        });

        this._rightPenaltyArea = Object.freeze({
            x: width - penaltyAreaWidth,
            y: centerY - halfPenaltyAreaDepth,
            width: penaltyAreaWidth,
            height: penaltyAreaDepth
        });

        Object.freeze(this);
    }

    getAttackingGoalCenter(teamId) {
        if (teamId === 'HOME') {
            return this.homeAttackingSide === 'RIGHT'
                ? this.rightGoalCenter
                : this.leftGoalCenter;
        }

        if (teamId === 'AWAY') {
            return this.homeAttackingSide === 'RIGHT'
                ? this.leftGoalCenter
                : this.rightGoalCenter;
        }

        throw new Error(
            `PitchContext.getAttackingGoalCenter: Unknown teamId "${teamId}".`
        );
    }

    getDefendingGoalCenter(teamId) {
        if (teamId === 'HOME') {
            return this.homeAttackingSide === 'RIGHT'
                ? this.leftGoalCenter
                : this.rightGoalCenter;
        }

        if (teamId === 'AWAY') {
            return this.homeAttackingSide === 'RIGHT'
                ? this.rightGoalCenter
                : this.leftGoalCenter;
        }

        throw new Error(
            `PitchContext.getDefendingGoalCenter: Unknown teamId "${teamId}".`
        );
    }

    getShotTarget(teamId, targetY = null) {
        const goal =
            this.getAttackingGoalCenter(teamId);

        const y =
            targetY === null
                ? goal.y
                : targetY;

        if (!Number.isFinite(y)) {
            throw new TypeError(
                'PitchContext.getShotTarget: targetY must be finite.'
            );
        }

        if (y < 0 || y > this.height) {
            throw new RangeError(
                'PitchContext.getShotTarget: targetY must be inside the pitch.'
            );
        }

        return Object.freeze({
            x: goal.x,
            y
        });
    }

    getPenaltyArea(teamId) {
        if (teamId === 'HOME') {
            return this.homeAttackingSide === 'RIGHT'
                ? this._rightPenaltyArea
                : this._leftPenaltyArea;
        }

        if (teamId === 'AWAY') {
            return this.homeAttackingSide === 'RIGHT'
                ? this._leftPenaltyArea
                : this._rightPenaltyArea;
        }

        throw new Error(
            `PitchContext.getPenaltyArea: Unknown teamId "${teamId}".`
        );
    }

    isInPenaltyArea(position, teamId) {
        this.validatePosition(position);

        const area =
            this.getPenaltyArea(teamId);

        return (
            position.x >= area.x &&
            position.x <= area.x + area.width &&
            position.y >= area.y &&
            position.y <= area.y + area.height
        );
    }

    isInGoalArea(position, teamId) {
        this.validatePosition(position);

        const area =
            this.getGoalArea(teamId);

        return (
            position.x >= area.x &&
            position.x <= area.x + area.width &&
            position.y >= area.y &&
            position.y <= area.y + area.height
        );
    }

    getGoalArea(teamId) {
        if (teamId === 'HOME') {
            return this.homeAttackingSide === 'RIGHT'
                ? this._rightGoalArea
                : this._leftGoalArea;
        }

        if (teamId === 'AWAY') {
            return this.homeAttackingSide === 'RIGHT'
                ? this._leftGoalArea
                : this._rightGoalArea;
        }

        throw new Error(
            `PitchContext.getGoalArea: Unknown teamId "${teamId}".`
        );
    }

    validatePosition(position) {
        if (
            !position ||
            !Number.isFinite(position.x) ||
            !Number.isFinite(position.y)
        ) {
            throw new TypeError(
                'PitchContext: position must contain finite x and y.'
            );
        }
    }
}