1) Even though memory was enabled, it was not persisting: 
    Solution: adding constructor to the MyAgentSql class, and blocking everything until memory state initialized:
    
    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        
        // Block all requests until initialization completes
        this.ctx.blockConcurrencyWhile(async () => {
        await this.initialize();
        });
    } 

2) In complex queries by admin, it can't decide what helper method to choose. Solution: Adding a layer prompt that will separate the query to tasks (in a way that each task could be handled by 1 task), and ai prompting each of those tasks to get a result. But I will strictly mention that do not overuse tasks: if it can be done in 1, don't split it. Each task should be a direct order. 