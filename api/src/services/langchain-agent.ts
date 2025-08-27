import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BaseMessage } from "@langchain/core/messages";
import { LeasingTools } from '../tools/langchain-tools';
import { Logger } from './logger';
import { ChatRequest, ChatResponse } from '../types';

export class LangChainAgent {
  private llm: ChatOpenAI;
  private tools: LeasingTools;
  private logger: Logger;
  private agentExecutor: AgentExecutor;

  constructor(tools: LeasingTools, logger: Logger) {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 500,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    
    this.tools = tools;
    this.logger = logger;
    
    // Initialize the agent executor as undefined initially
    this.agentExecutor = null as any;
  }

  private async initializeAgent() {
    // Define the system prompt for the leasing assistant
    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are a helpful and knowledgeable leasing assistant for residential communities. Your role is to:

1. Help prospective renters find information about available units, pricing, and policies
2. Schedule tours when appropriate
3. Provide clear, friendly, and accurate responses
4. Decide on the appropriate next action

Guidelines:
- Always be professional, helpful, and conversational
- Use the available tools to get accurate, real-time information
- When recommending tours, choose from available time slots
- If you cannot fulfill a request with available tools, suggest human assistance
- Be specific about pricing, fees, and policies
- Consider the lead's preferences (bedrooms, move-in date) when making recommendations

IMPORTANT: When a user asks about tours, scheduling, or viewing the property:
1. ALWAYS call the get_available_tour_slots tool first to get real available times
2. Present multiple time options to the user for selection
3. Use the "propose_tour" action when you have tour slots available

Available actions:
- propose_tour: When you have retrieved available tour slots and can offer specific times
- ask_clarification: When you need more information to properly assist
- handoff_human: When you cannot fulfill the request or need human intervention

Tool Usage:
- Use get_available_tour_slots when users mention: tour, visit, viewing, schedule, appointment, see the property
- Use check_availability when users ask about units, availability, or specific bedroom counts
- Use get_pricing when users ask about rent, cost, pricing, or fees
- Use check_pet_policy when users ask about pets, animals, or pet policies

Current context:
Community: {community_id}
Lead preferences: {preferences}`
      ],
      ["placeholder", "{chat_history}"],
      ["human", "{input}"],
      ["placeholder", "{agent_scratchpad}"],
    ]);

    // Create the OpenAI Tools agent
    const agent = await createOpenAIToolsAgent({
      llm: this.llm,
      tools: this.tools.getAllTools(),
      prompt,
    });

    // Create the agent executor
    this.agentExecutor = new AgentExecutor({
      agent,
      tools: this.tools.getAllTools(),
      verbose: process.env.NODE_ENV === 'development',
      maxIterations: 3,
      returnIntermediateSteps: true, // Ensure intermediate steps are returned
    });
  }

  async processMessage(request: ChatRequest, requestId: string): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      // Initialize agent if not already done
      if (!this.agentExecutor) {
        await this.initializeAgent();
      }
      // Prepare input for the agent
      const agentInput = {
        input: request.message,
        community_id: request.community_id,
        preferences: JSON.stringify(request.preferences),
        chat_history: [], // TODO: Implement conversation memory
      };

      this.logger.info(`Processing message with LangChain agent`, { 
        requestId, 
        message: request.message,
        community_id: request.community_id 
      });

      // Execute the agent
      const result = await this.agentExecutor.invoke(agentInput);

      this.logger.info('Agent executor result', {
        output: result?.output,
        hasIntermediateSteps: !!result?.intermediateSteps,
        intermediateStepsType: typeof result?.intermediateSteps,
        intermediateStepsLength: Array.isArray(result?.intermediateSteps) ? result.intermediateSteps.length : 'not array',
        intermediateStepsKeys: result?.intermediateSteps ? Object.keys(result.intermediateSteps) : 'none',
        fullResult: Object.keys(result || {})
      });

      // Parse the response and determine the action
      const response = this.parseAgentResponse(
        result.output || '', 
        result.intermediateSteps
      );

      // Log metrics
      const endTime = Date.now();
      
      await this.logger.logRequest({
        request_id: requestId,
        timestamp: new Date(),
        llm_latency: endTime - startTime,
        tool_name: 'langchain_agent',
        tool_args: agentInput,
        tool_response: result
      });

      return response;

    } catch (error) {
      const endTime = Date.now();
      this.logger.error('LangChain Agent error', error);
      
      await this.logger.logRequest({
        request_id: requestId,
        timestamp: new Date(),
        llm_latency: endTime - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Fallback response
      return {
        reply: "I'm sorry, I'm experiencing technical difficulties. Please try again in a moment or contact our leasing office directly.",
        action: 'handoff_human'
      };
    }
  }

  private parseAgentResponse(output: string, intermediateSteps: any[] | undefined): ChatResponse {
    // Extract any tour slots from tool results
    const tourSlots = this.extractTourSlotsFromSteps(intermediateSteps);
    
    // Analyze the response to determine the appropriate action
    const lowerOutput = output.toLowerCase();
    
    // Check if we have available tour slots from function calls
    if (tourSlots && tourSlots.length > 0) {
      return {
        reply: output,
        action: 'propose_tour',
        proposed_time: tourSlots[0], // Keep for backward compatibility
        available_times: tourSlots
      };
    }

    // Check if we need more information
    if (this.isAskingForClarification(lowerOutput)) {
      return {
        reply: output,
        action: 'ask_clarification'
      };
    }

    // Check if we should hand off to human
    if (this.shouldHandoffToHuman(lowerOutput)) {
      return {
        reply: output,
        action: 'handoff_human'
      };
    }

    // Default to ask_clarification if unclear
    return {
      reply: output,
      action: 'ask_clarification'
    };
  }

  private extractTourSlotsFromSteps(steps: any[] | undefined | null): string[] | null {
    // Check if steps is iterable (array) and not null/undefined
    if (!steps || !Array.isArray(steps)) {
      this.logger.debug('Intermediate steps is not an array or is null/undefined', { steps });
      return null;
    }

    this.logger.info('Processing intermediate steps for tour slots', { 
      stepCount: steps.length,
      steps: steps.map(step => ({
        type: typeof step,
        isArray: Array.isArray(step),
        length: Array.isArray(step) ? step.length : undefined,
        keys: typeof step === 'object' && step ? Object.keys(step) : undefined
      }))
    });

    for (const step of steps) {
      // LangChain intermediate steps are tuples [AgentAction, observation]
      if (Array.isArray(step) && step.length >= 2) {
        const [action, observation] = step;
        
        this.logger.debug('Processing step tuple', { 
          action: typeof action === 'object' ? {
            tool: action?.tool,
            toolInput: action?.toolInput
          } : action,
          observation: typeof observation === 'string' ? observation.substring(0, 200) + '...' : observation
        });

        if (action && action.tool === 'get_available_tour_slots') {
          try {
            const result = typeof observation === 'string' ? JSON.parse(observation) : observation;
            if (Array.isArray(result) && result.length > 0) {
              this.logger.info('Successfully extracted tour slots from intermediate steps', { 
                slotCount: result.length,
                slots: result
              });
              return result;
            }
          } catch (e) {
            this.logger.error('Failed to parse tour slots observation', { 
              error: e instanceof Error ? e.message : 'Unknown error',
              observation 
            });
            continue;
          }
        }
      } else {
        // Handle legacy structure or other formats
        if (step && step.action && step.action.tool === 'get_available_tour_slots') {
          try {
            const result = JSON.parse(step.observation);
            if (Array.isArray(result) && result.length > 0) {
              this.logger.info('Successfully extracted tour slots from legacy step format', { 
                slotCount: result.length,
                slots: result
              });
              return result;
            }
          } catch (e) {
            this.logger.error('Failed to parse tour slots from legacy format', { 
              error: e instanceof Error ? e.message : 'Unknown error',
              step 
            });
            continue;
          }
        }
      }
    }
    
    this.logger.debug('No tour slots found in intermediate steps');
    return null;
  }

  private isAskingForClarification(text: string): boolean {
    return text.includes('could you') || 
           text.includes('can you tell me') ||
           (text.includes('what') && text.includes('?')) ||
           text.includes('more information') ||
           (text.includes('which') && text.includes('?'));
  }

  private shouldHandoffToHuman(text: string): boolean {
    return (text.includes('contact') && text.includes('office')) ||
           (text.includes('speak') && text.includes('agent')) ||
           text.includes('unable') ||
           (text.includes('sorry') && text.includes('can\'t'));
  }

  // Method to add conversation memory - will be implemented in the next phase
  async addMemory(messages: BaseMessage[]): Promise<void> {
    // TODO: Implement conversation memory with LangChain memory stores
  }
}
