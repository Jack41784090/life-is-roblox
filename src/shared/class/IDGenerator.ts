export class IDGenerator {
    private static lastTimestamp = 0;
    private static counter = 0;

    public static generateID(): string {
        const now = os.time(); // Current timestamp in seconds

        // If the timestamp is the same as the last one, increment the counter
        if (now === this.lastTimestamp) {
            this.counter++;
        } else {
            this.counter = 0;
            this.lastTimestamp = now;
        }

        // Create a random component
        const randomComponent = string.format("%x", math.random(0, 2 ^ 32 - 1));

        // Combine the timestamp, counter, and random component to create the ID
        return `${string.format("%x", now)}-${string.format("%x", this.counter)}-${randomComponent}`;
    }
}