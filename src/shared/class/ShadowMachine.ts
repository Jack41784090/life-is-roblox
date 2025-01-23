export class ShadowMachine {
    part: Part;
    shadow: Part;

    constructor(part: Part) {
        this.part = part;
        this.shadow = new Instance("Part");
        this.setupShadow();
    }

    setupShadow() {
        this.shadow.Size = new Vector3(5, 0.001, 5); // Initial size
        this.shadow.Anchored = true;
        this.shadow.CanCollide = false;
        this.shadow.Color = new Color3(0, 0, 0); // Shadow color
        this.shadow.Transparency = 0.5; // Semi-transparent
        this.shadow.Parent = this.part;

        // Optionally, add a SurfaceGUI for more flexibility
        const surfaceGui = new Instance("SurfaceGui");
        surfaceGui.Face = Enum.NormalId.Top;
        surfaceGui.Parent = this.shadow;
    }

    updateShadow(factor: number) {
        const origin = this.part.Position;
        const destination = this.part.Position.add(new Vector3(factor, 0, factor));

        const direction = destination.sub(origin).Unit;
        const distance = origin.sub(destination).Magnitude;

        // Calculate midpoint
        const midpoint = origin.add(destination).div(2);

        // Calculate rotation
        const angleY = math.atan2(direction.X, direction.Z); // Y-axis rotation

        // Apply position, size, and rotation
        this.shadow.Position = new Vector3(midpoint.X, 0, midpoint.Z); // On the ground
        this.shadow.Size = new Vector3(distance, 0.001, 2); // Adjust width dynamically
        this.shadow.CFrame = new CFrame(midpoint).mul(CFrame.Angles(0, angleY, 0));
    }
}