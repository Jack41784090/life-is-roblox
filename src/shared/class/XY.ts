export default class XY<T> {
    dictionary: {
        [key in string]: T | undefined;
    }
    constructor(public width: number, public height: number, defaultValue = undefined) {
        this.dictionary = {};

        // Initialize the dictionary with the default value
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

    isValidCoordinate(x: number, y: number) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }
}
