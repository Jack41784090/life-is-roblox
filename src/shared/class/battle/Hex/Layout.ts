export class Hex {
    constructor(public q: number, public r: number, public s: number) {
        if (math.round(q + r + s) !== 0) throw "q + r + s must be 0";
    }

    public add(b: Hex): Hex {
        return new Hex(this.q + b.q, this.r + b.r, this.s + b.s);
    }


    public subtract(b: Hex): Hex {
        return new Hex(this.q - b.q, this.r - b.r, this.s - b.s);
    }


    public scale(k: number): Hex {
        return new Hex(this.q * k, this.r * k, this.s * k);
    }


    public rotateLeft(): Hex {
        return new Hex(-this.s, -this.q, -this.r);
    }


    public rotateRight(): Hex {
        return new Hex(-this.r, -this.s, -this.q);
    }

    public static directions: Hex[] = [new Hex(1, 0, -1), new Hex(1, -1, 0), new Hex(0, -1, 1), new Hex(-1, 0, 1), new Hex(-1, 1, 0), new Hex(0, 1, -1)];

    public static direction(direction: number): Hex {
        return Hex.directions[direction];
    }


    public neighbor(direction: number): Hex {
        return this.add(Hex.direction(direction));
    }

    public static diagonals: Hex[] = [new Hex(2, -1, -1), new Hex(1, -2, 1), new Hex(-1, -1, 2), new Hex(-2, 1, 1), new Hex(-1, 2, -1), new Hex(1, 1, -2)];

    public diagonalNeighbor(direction: number): Hex {
        return this.add(Hex.diagonals[direction]);
    }


    public len(): number {
        return (math.abs(this.q) + math.abs(this.r) + math.abs(this.s)) / 2;
    }


    public distance(b: Hex): number {
        return this.subtract(b).len();
    }


    public round(): Hex {
        let qi: number = math.round(this.q);
        let ri: number = math.round(this.r);
        let si: number = math.round(this.s);
        const q_diff: number = math.abs(qi - this.q);
        const r_diff: number = math.abs(ri - this.r);
        const s_diff: number = math.abs(si - this.s);
        if (q_diff > r_diff && q_diff > s_diff) {
            qi = -ri - si;
        }
        else
            if (r_diff > s_diff) {
                ri = -qi - si;
            }
            else {
                si = -qi - ri;
            }
        return new Hex(qi, ri, si);
    }


    public lerp(b: Hex, t: number): Hex {
        return new Hex(this.q * (1.0 - t) + b.q * t, this.r * (1.0 - t) + b.r * t, this.s * (1.0 - t) + b.s * t);
    }


    public linedraw(b: Hex): Hex[] {
        const N: number = this.distance(b);
        const a_nudge: Hex = new Hex(this.q + 1e-06, this.r + 1e-06, this.s - 2e-06);
        const b_nudge: Hex = new Hex(b.q + 1e-06, b.r + 1e-06, b.s - 2e-06);
        const results: Hex[] = [];
        const step: number = 1.0 / math.max(N, 1);
        for (let i = 0; i <= N; i++) {
            results.push(a_nudge.lerp(b_nudge, step * i).round());
        }
        return results;
    }

}

class Orientation {
    constructor(public f0: number, public f1: number, public f2: number, public f3: number, public b0: number, public b1: number, public b2: number, public b3: number, public start_angle: number) { }
}

export class Layout {
    constructor(public orientation: Orientation, public size: Vector2, public origin: Vector2) { }
    public static pointy: Orientation = new Orientation(math.sqrt(3.0), math.sqrt(3.0) / 2.0, 0.0, 3.0 / 2.0, math.sqrt(3.0) / 3.0, -1.0 / 3.0, 0.0, 2.0 / 3.0, 0.5);
    public static flat: Orientation = new Orientation(3.0 / 2.0, 0.0, math.sqrt(3.0) / 2.0, math.sqrt(3.0), 2.0 / 3.0, 0.0, -1.0 / 3.0, math.sqrt(3.0) / 3.0, 0.0);

    public hexToPixel(h: Hex): Vector2 {
        const M: Orientation = this.orientation;
        const size: Vector2 = this.size;
        const origin: Vector2 = this.origin;
        const x: number = (M.f0 * h.q + M.f1 * h.r) * size.X;
        const y: number = (M.f2 * h.q + M.f3 * h.r) * size.Y;
        return new Vector2(x + origin.X, y + origin.Y);
    }


    public pixelToHex(p: Vector2): Hex {
        const M: Orientation = this.orientation;
        const size: Vector2 = this.size;
        const origin: Vector2 = this.origin;
        const pt: Vector2 = new Vector2((p.X - origin.X) / size.X, (p.Y - origin.Y) / size.Y);
        const q: number = M.b0 * pt.X + M.b1 * pt.Y;
        const r: number = M.b2 * pt.X + M.b3 * pt.Y;
        return new Hex(q, r, -q - r);
    }


    public hexCornerOffset(corner: number): Vector2 {
        const M: Orientation = this.orientation;
        const size: Vector2 = this.size;
        const angle: number = 2.0 * math.pi * (M.start_angle - corner) / 6.0;
        return new Vector2(size.X * math.cos(angle), size.Y * math.sin(angle));
    }


    public polygonCorners(h: Hex): Vector2[] {
        const corners: Vector2[] = [];
        const center: Vector2 = this.hexToPixel(h);
        for (let i = 0; i < 6; i++) {
            const offset: Vector2 = this.hexCornerOffset(i);
            corners.push(new Vector2(center.X + offset.X, center.Y + offset.Y));
        }
        return corners;
    }

}


