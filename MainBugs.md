1) Even though memory was enabled, it was not persisting: 
    Solution: adding constructor to the MyAgentSql class, and blocking everything until memory state initialized:
    
    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        
        // Block all requests until initialization completes
        this.ctx.blockConcurrencyWhile(async () => {
        await this.initialize();
        });
    } 