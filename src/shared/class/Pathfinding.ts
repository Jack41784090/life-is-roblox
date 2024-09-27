import { PriorityQueue } from "shared/utils"
import Grid from "./Grid"

type NodeInit = {
    coord: Vector2,
    distanceTravelled: number,
    lastNode?: PathfindNode,
    nextNode?: PathfindNode
}

type PathfindNode = {
    x: number,
    y: number,
    coords: Vector2,
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
    hexagonal?: boolean
}

enum Direction {
    UpLeft,
    Up,
    UpRight,
    Left,
    Right,
    DownLeft,
    Down,
    DownRight,
}

const directionVectors = new Map<Direction, { dx: number; dy: number }>([
    [Direction.UpLeft, { dx: -1, dy: 1 }],
    [Direction.Up, { dx: 0, dy: 1 }],
    [Direction.UpRight, { dx: 1, dy: 1 }],
    [Direction.Left, { dx: -1, dy: 0 }],
    [Direction.Right, { dx: 1, dy: 0 }],
    [Direction.DownLeft, { dx: -1, dy: -1 }],
    [Direction.Down, { dx: 0, dy: -1 }],
    [Direction.DownRight, { dx: 1, dy: -1 }],
]);

export default class Pathfinding {
    frontier: PriorityQueue<PathfindNode>;
    grid: Grid;
    start: Vector2;
    destination: Vector2;
    priorityFunction: (a: PathfindNode) => number;
    limit: number;
    method: 'lowest' | 'highest';
    verbose: boolean;
    hexagonal: boolean;

    private newNode({ distanceTravelled, lastNode, nextNode, coord }: NodeInit): PathfindNode {
        const x = coord.X;
        const y = coord.Y;
        const desX = this.destination.X;
        const desY = this.destination.Y;

        // const desCost = math.abs(x - desX) + math.abs(y - desY);
        const desCost = math.sqrt((x - desX) ** 2 + (y - desY) ** 2);
        const totalCost = distanceTravelled + desCost;
        return {
            coords: new Vector2(x, y),
            x: x,
            y: y,
            lastNode: lastNode,
            nextNode: nextNode,
            distanceTravelled: distanceTravelled,
            distanceToDestination: desCost,
            totalCost: totalCost,
        };
    }

    public constructor(
        { grid, start, dest, method = 'lowest', limit = math.huge, verbose = false, hexagonal = false }: PathfindInit
    ) {
        this.grid = grid;
        this.start = start;
        this.destination = dest;
        this.priorityFunction = (a: PathfindNode) => a.totalCost;
        this.limit = limit;
        this.method = method;
        this.verbose = verbose;
        this.frontier = new PriorityQueue<PathfindNode>(this.priorityFunction);
        this.hexagonal = hexagonal;
    }

    incrementPathCost(currentCost: number): number {
        return currentCost + 1;
    }

    peek() {
        print("peeking", this.frontier.peek(), this.frontier.peek(1), this.frontier.peek(2));
    }

    goalTest(AINode: PathfindNode) {
        return (AINode.x === this.destination.X && AINode.y === this.destination.Y)
    }

    // Path-finding
    begin(): Vector2[] {
        const start = this.start;
        const dest = this.destination;
        if (this.verbose) {
            print(`Starting @${start} to ${dest}`);
        }

        // 1. initialize frontier
        this.frontier.enqueue(this.newNode({
            coord: start,
            distanceTravelled: 0
        }))

        if (this.verbose) this.peek();

        // 2. get node based on method selected
        const explored: PathfindNode[] = [];
        let AINode: PathfindNode | undefined;
        let i = 0;
        while (!this.frontier.isEmpty() && i < 1000) {
            AINode = this.frontier.dequeue()!;
            if (this.goalTest(AINode)) {
                if (this.verbose) print(`Stopping condition: (${AINode.x},${AINode.y})`);
                break;
            }
            // == Push current node to explored
            explored.push(AINode);

            if (this.verbose) {
                print(`NextNode: (${AINode.x},${AINode.y})`);
            }

            // 1. Expand nodes
            // look at surrounding nodes
            for (const [direction, { dx, dy }] of directionVectors) {
                const changeVector = new Vector2(dx, dy);
                const nodeDirectedCoord = new Vector2(AINode.x, AINode.y).add(changeVector);

                // print(AINode.coords.X)
                if (AINode.coords.X % 2 === 1) {
                    // mound @ odd x
                    if (direction === Direction.DownLeft || direction === Direction.DownRight) {
                        // skip
                        continue;
                    }
                }
                else {
                    // concave @ even x
                    if (direction === Direction.UpLeft || direction === Direction.UpRight) {
                        // skip
                        continue;
                    }
                }

                // if directed node is unexplored
                const cell = this.grid.cellsXY.get(new Vector2(nodeDirectedCoord.X, nodeDirectedCoord.Y));
                const coordExplored = explored.find(node => node.x === nodeDirectedCoord.X && node.y === nodeDirectedCoord.Y);
                if (this.verbose) {
                    print(`Checking ${direction} ${changeVector} @${nodeDirectedCoord}`);
                    print("||=>", cell ? `(${cell.coord.X},${cell.coord.Y})` : "cell does not exist");
                    if (cell) {
                        print(`||=> within limit: ${AINode.distanceTravelled < this.limit}`);
                        print(`||=> vacant: ${cell.isVacant()}`);
                        print(`||=> explored: ${coordExplored !== undefined}`);
                    }
                }

                if (
                    cell &&                                 // unexplored node exists
                    AINode.distanceTravelled < this.limit && // distance travelled is within limit
                    !coordExplored &&                        // unexplored node is not explored
                    cell.isVacant()                         // unexplored node is not occupied
                ) {
                    // update unexplored node
                    const node = this.newNode({
                        coord: cell.coord,
                        distanceTravelled: AINode.distanceTravelled + 1,
                        lastNode: AINode
                    });
                    AINode.nextNode = node;
                    this.frontier.enqueue(node);
                    if (this.verbose) {
                        print("|||=> Updating unexplored node", cell);
                    }
                }
                else if (cell && cell.coord.X === dest.X && cell.coord.Y === dest.Y) {
                    // update destination node
                    const node = this.newNode({
                        coord: cell.coord,
                        distanceTravelled: AINode.distanceTravelled + 1,
                        lastNode: AINode
                    });
                    AINode.nextNode = node;
                    this.frontier.enqueue(node);
                    if (this.verbose) {
                        print("|||=> Updating destination node", cell);
                    }
                }
            }

            i++;

            if (this.verbose) this.peek();
        }

        if (this.verbose) {
            print("That's all folks.");
            print(`||=> ${AINode !== undefined}`)
            print(`||=> ${(AINode?.x !== dest.X || AINode?.y !== dest.Y)}, (${AINode?.x},${AINode?.y})`)
            print(`||=> ${AINode?.distanceTravelled !== math.huge}, (${AINode?.distanceTravelled})`)
        }

        // deal with the result
        const fullPath: Vector2[] = [];
        if (!AINode) {
            /**
             * Note on unravelling the results:
             * -------------------------------
             * !AINode:
             * If node is undefined, it means there is no more "frontier nodes" to look at.
             * Find the closest node to destination instead from results.
             */
            if (this.verbose) warn(`No more nodes to look at. Finding closest node to destination.`);

            const exploredEnd = new PriorityQueue<PathfindNode>((a: PathfindNode) => a.distanceToDestination);
            explored.forEach(node => {
                exploredEnd.enqueue(node);
            });
            AINode = exploredEnd.dequeue()!;

            if (this.verbose) warn(`||=> New AI Node @${AINode?.x},${AINode?.y}`)
        }

        while (AINode) {
            const coord = new Vector2(AINode.x, AINode.y);
            fullPath.unshift(coord);
            AINode = AINode.lastNode || undefined;
        }

        if (this.verbose) {
            print("The full path:", fullPath);
        }

        print(fullPath)
        return fullPath;
    }
}
