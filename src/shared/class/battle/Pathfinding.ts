import { HexCellState, HexGridState } from "shared/types/battle-types"
import { PriorityQueue } from "shared/utils"
import HexCell from "./State/Hex/Cell"

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

export default class Pathfinding {
    frontier: PriorityQueue<PathfindNode>;
    gridstate: HexGridState;
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

    public constructor({ grid, start, dest, method = 'lowest', limit = math.huge, verbose = false, hexagonal = false }: {
        grid: HexGridState,
        start: Vector2 | Vector3,
        dest: Vector2 | Vector3,
        method?: 'lowest' | 'highest',
        limit?: number,
        verbose?: boolean
        hexagonal?: boolean
    }) {
        this.gridstate = grid;
        this.start = start as Vector2;
        this.destination = dest as Vector2;
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

        // 1. initialise frontier
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
            if (!AINode) {
                if (this.verbose) {
                    warn(`No AINode found`);
                }
                continue;
            }
            const exploringCell = this.gridstate.cellsMap.get(AINode.coords);
            if (!exploringCell) {
                if (this.verbose) {
                    warn(`Cell does not exist @${AINode.x},${AINode.y}`);
                }
                continue;
            }

            const neighbors: HexCellState[] = [];
            for (const direction of HexCell.directions) {
                const neighborPos = exploringCell.qr.add(new Vector2(direction.X, direction.Y));  // Add the direction vector to current qrs
                const neighbor = this.gridstate.cellsMap.get(neighborPos);
                if (neighbor) neighbors.push(neighbor);
            }

            for (const cell of neighbors) {
                const cellVacant = cell.entity === undefined;
                const coordExplored = explored.find(node => node.x === cell.qr.X && node.y === cell.qr.Y);
                if (this.verbose) {
                    print(`Checking ${cell.qr.X},${cell.qr.Y}`);
                    print(`||=> (${cell.qr.X},${cell.qr.Y})`)
                    print(`||=> within limit: ${AINode.distanceTravelled < this.limit}`);
                    print(`||=> vacant: ${cellVacant}`);
                    print(`||=> explored: ${coordExplored !== undefined}`);
                }

                if (
                    AINode.distanceTravelled < this.limit && // distance travelled is within limit
                    !coordExplored &&                        // unexplored node is not explored
                    cellVacant                       // unexplored node is not occupied
                ) {
                    // update unexplored node
                    const node = this.newNode({
                        coord: cell.qr,
                        distanceTravelled: AINode.distanceTravelled + 1,
                        lastNode: AINode
                    });
                    AINode.nextNode = node;
                    this.frontier.enqueue(node);
                    if (this.verbose) {
                        print("|||=> Updating unexplored node", cell);
                    }
                }
                else if (cell && cell.qr.X === dest.X && cell.qr.Y === dest.Y) {
                    // update destination node
                    const node = this.newNode({
                        coord: cell.qr,
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

        return fullPath;
    }
}
