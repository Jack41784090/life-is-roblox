export default class XY<T> {
    dictionary: {
        [key in string]: T | undefined;
    }
    constructor(public width: number, public height: number, defaultValue = undefined) {
        this.dictionary = {};

        // initialise the dictionary with the default value
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                this.dictionary[`${x},${y}`] = defaultValue;
            }
        }
    }

    set(x: number, y: number, value: T): void
    set(vec: Vector2, value: T): void
    set(x: number | Vector2, y: number | T, value?: T) {
        if (typeIs(x, "Vector2")) {
            const vec = x as Vector2;
            value = y as T;
            if (this.isValidCoordinate(vec.X, vec.Y)) {
                this.dictionary[`${vec.X},${vec.Y}`] = value
            };
        } else if (this.isValidCoordinate(x as number, y as number)) {
            this.dictionary[`${x},${y}`] = value;
        }
    }

    get(vec: Vector2): T | undefined
    get(x: number, y: number): T | undefined
    get(x: number | Vector2, y?: number) {
        if (typeIs(x, "Vector2")) {
            const vec = x as Vector2;
            return this.dictionary[`${vec.X},${vec.Y}`];
        } else {
            return this.dictionary[`${x},${y}`];
        }
    }

    reset(cleanUp: (arg: T) => void) {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const value = this.get(x, y);
                if (value !== undefined) {
                    cleanUp(value);
                }
            }
        }

        this.dictionary = {};
    }

    isValidCoordinate(x: number, y: number) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }
}

export class QR<T> extends XY<T> {
    constructor(public radius: number, defaultValue = undefined) {
        if (radius <= 0) {
            throw ("Radius must be a positive number.");
        }
        super(radius + 1, radius + 1, defaultValue);
    }

    isValidCoordinate(q: number, r: number) {
        return super.isValidCoordinate(math.abs(q), math.abs(r));
    }

    reset(cleanUp: (arg: T) => void): void {
        const radius = this.radius;

        for (let q = -radius; q <= radius; q++) {
            for (let r = math.max(-radius, -q - radius); r <= math.min(radius, -q + radius); r++) {
                const value = this.get(q, r);
                if (value !== undefined) {
                    cleanUp(value);
                }
            }
        }
    }
}
