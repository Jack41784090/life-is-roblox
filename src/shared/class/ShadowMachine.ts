export class ShadowMachine {
    existingShadow: Part | undefined
    part: Part
    k: number

    constructor(part: Part, k: number) {
        this.part = part;
        this.k = k;
    }

    equation(t: number) {
        assert(t >= 0 && t <= 1, "t must be between 0 and 1");
        const h = this.part.Size.Y;
        const { max, sin, pi } = math;
        const c = (this.k * h) / max(sin(pi * t), 0.01)
        const v = new Vector2(c * sin(2 * pi * t), c * sin(2 * pi * t));

        return v;
    }

    shadowPart() {
        const shadow = this.existingShadow ?? (this.existingShadow = new Instance("Part"));
        shadow.Size = new Vector3(this.part.Size.X, 0.001, this.part.Size.Z);
        shadow.Anchored = true;
        shadow.CanCollide = false;
        shadow.Parent = this.part
        shadow.Color = new Color3(0, 0, 0);
        shadow.PivotOffset = new CFrame(new Vector3(0, this.part.Size.Y, 0));

        return shadow;
    }

    shear() {
        const rectangle = this.existingShadow ?? (this.existingShadow = this.shadowPart());
        const origin = this.part.Position; // Origin position
        const destination = origin.add(new Vector3(10, 0, 10)); // Destination position

        // Compute direction and midpoint
        const direction = destination.sub(origin).Unit; // Get the unit vector for direction
        const midpoint = origin.add(destination).div(2); // Midpoint between origin and destination

        // Shearing factor (based on how "shadow-like" you want it)
        const shearAmount = 0.5; // Adjust this value for more/less shearing

        // Create the shear vector (in this case, along X and Y)
        const shear = new Vector3(shearAmount * direction.X, shearAmount * direction.Y, 0);

        // Update the rectangle's CFrame
        const cframeWithShear = CFrame.lookAt(midpoint, destination).mul(new CFrame(shear));
        rectangle.CFrame = cframeWithShear;

        // Stretch the rectangle's size to match the distance
        const distance = origin.sub(destination).Magnitude;
        rectangle.Size = new Vector3(rectangle.Size.X, rectangle.Size.Y, distance);


    }
}