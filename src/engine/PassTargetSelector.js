// src/engine/PassTargetSelector.js

export class PassTargetSelector {

    constructor() {
        Object.freeze(this);
    }

    /**
     * Top sahibi için uygun pas alıcılarını öncelik sırasına göre seçer.
     *
     * Sorumluluk:
     *   "Bu pas kime verilebilir?"
     *
     * Sorumluluk DIŞI:
     *   - Pas verilmeli mi? (DecisionEngine)
     *   - Pasın hızı/yönü ne? (PassEngine)
     *   - Pas sonucu ne olur? (BallPhysics + Interception/Receiver)
     *
     * @param {Object} state - MatchState (players, ball)
     * @param {Object} possessionSnapshot - PossessionEngine çıktısı
     * @param {Array} behaviorSnapshots - PlayerBehaviorEngine çıktısı
     * @returns {Array} passTargets - Öncelik sırasına göre receiver adayları
     *                              Her eleman: { receiverId }
     */
    select(state, possessionSnapshot, behaviorSnapshots = []) {

        // Guard 1: State validation
        if (!state || typeof state !== 'object') {
            throw new TypeError(
                'PassTargetSelector.select: Valid state is required.'
            );
        }

        if (!Array.isArray(state.players)) {
            throw new TypeError(
                'PassTargetSelector.select: state.players must be an array.'
            );
        }

        // Guard 2: PossessionSnapshot validation
        if (!possessionSnapshot || typeof possessionSnapshot !== 'object') {
            throw new TypeError(
                'PassTargetSelector.select: Valid possessionSnapshot is required.'
            );
        }

        // Guard 3: behaviorSnapshots validation
        if (!Array.isArray(behaviorSnapshots)) {
            throw new TypeError(
                'PassTargetSelector.select: behaviorSnapshots must be an array.'
            );
        }

        const passerId = possessionSnapshot.ownerId;

        // Kural: Top sahibi yoksa pas hedefi de yok
        if (passerId === null || passerId === undefined) {
            return Object.freeze([]);
        }

        const passer = state.players.find(p => p.id === passerId);

        if (!passer) {
            return Object.freeze([]);
        }

        // Behavior snapshot map — sadece geçerli target'lar
        const behaviorTargetMap = new Map();

        for (const snapshot of behaviorSnapshots) {

            if (!snapshot || snapshot.playerId === undefined) {
                continue;
            }

            const target = snapshot.target;

            const hasValidTarget =
                target &&
                Number.isFinite(target.x) &&
                Number.isFinite(target.y);

            behaviorTargetMap.set(
                snapshot.playerId,
                hasValidTarget
                    ? { x: target.x, y: target.y }
                    : null
            );
        }

        const candidates = [];

        for (const player of state.players) {

            // Kural 1: Aynı takım
            if (player.teamId !== passer.teamId) {
                continue;
            }

            // Kural 2: Pasör değil
            if (player.id === passerId) {
                continue;
            }

            // Kural 3: GK değil
            if (player.role === 'GK') {
                continue;
            }

            // Kural 4: Geçerli pozisyon
            if (
                !player.position ||
                !Number.isFinite(player.position.x) ||
                !Number.isFinite(player.position.y)
            ) {
                continue;
            }

            // Kural 5: Pas geometrisi (mesafe > 0)
            const dx = player.position.x - passer.position.x;
            const dy = player.position.y - passer.position.y;
            const distanceToPasser = Math.hypot(dx, dy);

            if (distanceToPasser === 0) {
                continue;
            }

            // Kural 6: Oyuncunun çevresindeki en yakın rakip mesafesi
            //          (yüksek değer = daha az baskı)
            const opponentDistance = this.calculateOpponentDistance(
                player,
                state.players
            );

            // Kural 7: behavior.target'e mesafe (geçersizse Infinity)
            const behaviorTarget =
                behaviorTargetMap.get(player.id);

            const distanceToBehaviorTarget =
                behaviorTarget
                    ? Math.hypot(
                        player.position.x - behaviorTarget.x,
                        player.position.y - behaviorTarget.y
                    )
                    : Infinity;

            candidates.push({
                receiverId: player.id,
                opponentDistance,
                distanceToBehaviorTarget
            });
        }

        if (candidates.length === 0) {
            return Object.freeze([]);
        }

        // Sıralama: Öncelik sırası
        candidates.sort((a, b) => {

            // 1. En yüksek rakip mesafesi (en az baskı) önce
            if (a.opponentDistance !== b.opponentDistance) {
                return b.opponentDistance - a.opponentDistance;
            }

            // 2. behavior.target'e en yakın önce
            if (a.distanceToBehaviorTarget !== b.distanceToBehaviorTarget) {
                return a.distanceToBehaviorTarget - b.distanceToBehaviorTarget;
            }

            // 3. Küçük receiverId önce (deterministik tie-breaker)
            return a.receiverId - b.receiverId;
        });

        // Çıktı: sadece { receiverId } — immutable
        return Object.freeze(
            candidates.map(candidate =>
                Object.freeze({
                    receiverId: candidate.receiverId
                })
            )
        );
    }


    /**
     * Bir oyuncunun çevresindeki en yakın rakibe olan mesafeyi hesaplar.
     * Yüksek değer = daha az baskı.
     *
     * Rakip yoksa Infinity döner.
     *
     * @param {Object} player
     * @param {Array} players
     * @returns {number} En yakın rakip mesafesi
     */
    calculateOpponentDistance(player, players) {

        let minDistance = Infinity;

        for (const other of players) {

            if (other.teamId === player.teamId) {
                continue;
            }

            if (
                !other.position ||
                !Number.isFinite(other.position.x) ||
                !Number.isFinite(other.position.y)
            ) {
                continue;
            }

            const distance = Math.hypot(
                player.position.x - other.position.x,
                player.position.y - other.position.y
            );

            if (distance < minDistance) {
                minDistance = distance;
            }
        }

        return minDistance;
    }
}