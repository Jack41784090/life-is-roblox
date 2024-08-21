import Grid from "./Grid"
import XY from "./XY"

type NodeInit = {
    start: Vector2,
    destination: Vector2,
    distanceTravelled: number
}

type PathfindNode = {
    x: number,
    y: number,
    lastNode: PathfindNode | undefined,
    nextNode: PathfindNode | undefined,
    distanceTravelled: number,
    distanceToDestination: number,
    totalCost: number
}

type PathfindInit = {
    grid: Grid,
    start: Vector2,
    dest: Vector2,
    method?: 'lowest' | 'highest',
    limit?: number,
    verbose?: boolean
}

export default class Pathfinding {
    private static Node({ start, destination, distanceTravelled }: NodeInit): PathfindNode {
        const x = start.X;
        const y = start.Y;
        const desX = destination.X;
        const desY = destination.Y;

        const desCost = math.abs(x - desX) + math.abs(y - desY);
        const totalCost = distanceTravelled + desCost;
        return {
            x: x,
            y: y,
            lastNode: undefined,
            nextNode: undefined,
            distanceTravelled: distanceTravelled,
            distanceToDestination: desCost,
            totalCost: totalCost,
        };
    }

    private constructor(public grid: Grid, public fullPath: Vector2[]) { }

    // Path-finding
    static Start({
        grid,
        start,
        dest,
        method = 'lowest',
        limit = math.huge,
        verbose = false,
    }: PathfindInit): Pathfinding {
        if (verbose) {
            print(`Starting @${start} to ${dest}`);
        }

        // initialize
        const nodeXY: XY<PathfindNode> = new XY<PathfindNode>(grid.getWidth(), grid.getHeight());
        const AINodePriorQueue: PathfindNode[] = []; // sorted smallest to largest in total cost

        for (let x = 0; x < grid.getWidth(); x++) {
            for (let y = 0; y < grid.getHeight(); y++) {
                const coord = new Vector2(x, y);
                const coordVacant: boolean = grid.getCellIsVacant(x, y);
                const coordIsStart: boolean = x === start.X && y === start.Y;

                if (coordVacant || coordIsStart) {
                    const node = Pathfinding.Node({
                        start: coord,
                        destination: dest,
                        distanceTravelled: math.huge,
                    });
                    print(`New set @${(coord)}`)
                    nodeXY.set(coord, node);
                    AINodePriorQueue.push(node);
                }
            }
        }

        // initiate the beginning node, ie. spread from there
        const startAINode = nodeXY.get(start);
        if (startAINode) {
            startAINode.distanceTravelled = 0;
            startAINode.totalCost = startAINode.distanceToDestination;
        }
        else {
            warn(`Starting node invalid: ${startAINode}`);
            return new Pathfinding(grid, []);
        }

        // lowest to highest
        AINodePriorQueue.sort((_1, _2) => (_1.totalCost - _2.totalCost) < 0);
        if (verbose) {
            print("sorted as such", AINodePriorQueue[0]?.totalCost, AINodePriorQueue[1]?.totalCost, AINodePriorQueue[2]?.totalCost);
        }

        // get node based on method selected
        const getNextAINode = () => {
            let nextNode: PathfindNode | undefined;
            switch (method) {
                case 'lowest':
                    nextNode = AINodePriorQueue.shift() || undefined;
                    break;
                case 'highest':
                    nextNode = AINodePriorQueue.pop() || undefined;
                    break;
            }
            return nextNode;
        }
        const stopCondition = (AINode: PathfindNode) => {
            return (AINode.x === dest.X && AINode.y === dest.Y) ||
                AINode.distanceTravelled === math.huge;
        }
        const results: PathfindNode[] = [];
        let AINode: PathfindNode | undefined;
        while ((AINode = getNextAINode()) && !stopCondition(AINode)) {
            if (verbose) {
                print(`NextNode: (${AINode.x},${AINode.y})`);
            }

            // == Update surrounding nodes
            // look at surrounding nodes
            for (let i = 0; i < 4; i++) {
                const axis = i % 2 === 0 ? 'X' : 'Y';
                const magnitude = i < 2 ? 1 : -1;
                const dir = new Vector2(
                    axis === 'X' ? magnitude : 0,
                    axis === 'Y' ? magnitude : 0);
                const nodeDirectedCoord = new Vector2(AINode.x, AINode.y).add(dir);

                // if directed node is unexplored
                const unexploredNode = nodeXY.get(nodeDirectedCoord);
                if (verbose) {
                    print(`Checking ${axis} ${magnitude} @${nodeDirectedCoord}`);
                    print("||=>", unexploredNode ? `(${unexploredNode.x},${unexploredNode.y})` : undefined);
                    print(`||=> ${unexploredNode !== undefined}`);
                    print(`||=> ${AINode.distanceTravelled < limit}`);
                    print(`||=> ${!results.includes(unexploredNode!)}`);
                }

                if (
                    unexploredNode && // unexplored node exists
                    AINode.distanceTravelled < limit && // distance travelled is within limit
                    !results.includes(unexploredNode) // unexplored node is not in results
                ) {
                    // update unexplored node
                    if (verbose) {
                        print("|||=> Updating unexplored node");
                    }
                    unexploredNode.distanceTravelled = AINode.distanceTravelled + 1;
                    unexploredNode.totalCost = unexploredNode.distanceToDestination + unexploredNode.distanceTravelled;
                    unexploredNode.lastNode = AINode;
                    AINode.nextNode = unexploredNode;
                }
            }

            // == Push current node to path
            if (AINode.distanceTravelled <= limit) { // only push to result when node is within limit
                results.push(AINode);
            }

            // updates
            AINodePriorQueue.sort((_1, _2) => (_1.totalCost - _2.totalCost < 0));
            print("sorted as such", AINodePriorQueue[0]?.totalCost, AINodePriorQueue[1]?.totalCost, AINodePriorQueue[2]?.totalCost);
        }

        if (verbose) {
            print("That's all folks.");
            print(`||=> ${AINode !== undefined}`)
            print(`||=> ${(AINode?.x !== dest.X || AINode?.y !== dest.Y)}, (${AINode?.x},${AINode?.y})`)
            print(`||=> ${AINode?.distanceTravelled !== math.huge}, (${AINode?.distanceTravelled})`)
        }

        // deal with the result
        const fullPath: Vector2[] = [];
        if (!AINode || AINode.distanceTravelled === math.huge) {
            /**
             * Note on unravelling the results:
             * -------------------------------
             * !AINode:
             * If node is undefined, it means there is no more "frontier nodes" to look at.
             * Find the closest node to destination instead from results.
             * 
             * AINode.distanceTravelled === math.huge:
             * If node's distanceTravelled is math.huge, it means, despite efforts to keep expanding, we met a dead-end.
             * Unreachable destination.
             * 
             */
            if (verbose) warn(`No more nodes to look at. Finding closest node to destination.`);

            AINode = results.reduce((_lowest, _current) => {
                switch (method) {
                    case 'lowest':
                        return _current.distanceToDestination < _lowest.distanceToDestination ?
                            _current :
                            _lowest;

                    case 'highest':
                        return _current.distanceToDestination > _lowest.distanceToDestination ?
                            _current :
                            _lowest;
                }
            }, results[0]) || undefined;

            if (verbose) warn(`||=> New AI Node @${AINode?.x},${AINode?.y}`)
        }

        while (AINode) {
            const coord = new Vector2(AINode.x, AINode.y);
            fullPath.unshift(coord);
            AINode = AINode.lastNode || undefined;
        }

        if (verbose) {
            print("The full path:", fullPath);
        }

        return new Pathfinding(grid, fullPath);
    }
}
