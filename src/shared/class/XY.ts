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

    set(x: number, y: number, value: T) {
        if (this.isValidCoordinate(x, y)) {
            this.dictionary[`${x},${y}`] = value;
        }
    }

    get(x: number, y: number) {
        if (this.isValidCoordinate(x, y)) {
            return this.dictionary[`${x},${y}`];
        }
        return undefined; // or a default value
    }

    isValidCoordinate(x: number, y: number) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }
}
