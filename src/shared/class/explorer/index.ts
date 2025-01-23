export default class Explorer {
    private static instance: Explorer;

    public static getInstance(): Explorer {
        if (!Explorer.instance) {
            Explorer.instance = new Explorer();
        }
        return Explorer.instance;
    }

    private exploring: boolean = false;
    private location: string = 'home';

    private constructor() {

    }
}