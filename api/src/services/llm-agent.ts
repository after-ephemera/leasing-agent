import OpenAI from 'openai';
import { LeasingTools } from '../tools/langchain-tools';
import { Logger } from './logger';
import { ChatRequest, ChatResponse, LogEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class LLMAgent {
  private openai: OpenAI;
  private tools: LeasingTools;
  private logger: Logger;

  constructor(tools: LeasingTools, logger: Logger) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.tools = tools;
    this.logger = logger;
    console.log('OPENAI_API_KEY: ', process.env.OPENAI_API_KEY);
  }

  async processMessage(request: ChatRequest, requestId: string): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      // Define available functions for OpenAI
      const functions = [
        {
          name: 'check_availability',
          description: 'Check available units in a community, optionally filtered by bedroom count',
          parameters: {
            type: 'object',
            properties: {
              community_id: {
                type: 'string',
                description: 'The community identifier'
              },
              bedrooms: {
                type: 'number',
                description: 'Number of bedrooms (optional filter)'
              }
            },
            required: ['community_id']
          }
        },
        {
          name: 'check_pet_policy',
          description: 'Check pet policy for a specific pet type in a community',
          parameters: {
            type: 'object',
            properties: {
              community_id: {
                type: 'string',
                description: 'The community identifier'
              },
              pet_type: {
                type: 'string',
                description: 'Type of pet (e.g., cat, dog, bird)'
              }
            },
            required: ['community_id', 'pet_type']
          }
        },
        {
          name: 'get_pricing',
          description: 'Get pricing information for a specific unit',
          parameters: {
            type: 'object',
            properties: {
              community_id: {
                type: 'string',
                description: 'The community identifier'
              },
              unit_id: {
                type: 'string',
                description: 'The unit identifier'
              },
              move_in_date: {
                type: 'string',
                description: 'Desired move-in date (optional)'
              }
            },
            required: ['community_id', 'unit_id']
          }
        },
        {
          name: 'get_available_tour_slots',
          description: 'Get available tour time slots for a community',
          parameters: {
            type: 'object',
            properties: {
              community_id: {
                type: 'string',
                description: 'The community identifier'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of slots to return (default 5)'
              }
            },
            required: ['community_id']
          }
        }
      ];

      // System prompt for the leasing assistant
      const systemPrompt = `You are a helpful and knowledgeable leasing assistant for residential communities. Your role is to:

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

Available actions:
- propose_tour: When you have enough information and available slots to suggest a specific tour time
- ask_clarification: When you need more information to properly assist
- handoff_human: When you cannot fulfill the request or need human intervention

Lead preferences: ${JSON.stringify(request.preferences)}
Community: ${request.community_id}`;

      // First API call to get the agent's response and function calls
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: request.message }
        ],
        functions: functions,
        function_call: 'auto',
        temperature: 0.7,
        max_tokens: 500
      });

      const message = completion.choices[0].message;
      let toolResults: any[] = [];

      // Execute function calls if any
      if (message.function_call) {
        const functionName = message.function_call.name;
        const functionArgs = JSON.parse(message.function_call.arguments || '{}');

        this.logger.info(`Executing function: ${functionName}`, { requestId, args: functionArgs });

        let toolResult;
        try {
          toolResult = await this.executeFunction(functionName, functionArgs);
          toolResults.push({ name: functionName, args: functionArgs, result: toolResult });

          // Log tool execution
          await this.logger.logRequest({
            request_id: requestId,
            timestamp: new Date(),
            tool_name: functionName,
            tool_args: functionArgs,
            tool_response: toolResult
          });
        } catch (error) {
          this.logger.error(`Function execution error: ${functionName}`, error);
          toolResult = { error: 'Unable to retrieve information at this time' };
        }

        // Second API call with function results to generate final response
        const finalCompletion = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: request.message },
            { role: 'assistant', content: message.content, function_call: message.function_call },
            { role: 'function', name: functionName, content: JSON.stringify(toolResult) }
          ],
          temperature: 0.7,
          max_tokens: 500
        });

        const finalMessage = finalCompletion.choices[0].message;
        const response = this.parseResponse(finalMessage.content || '', toolResults, request);

        // Log LLM metrics
        const endTime = Date.now();
        const totalTokens = (completion.usage?.total_tokens || 0) + (finalCompletion.usage?.total_tokens || 0);
        
        await this.logger.logRequest({
          request_id: requestId,
          timestamp: new Date(),
          llm_latency: endTime - startTime,
          llm_tokens: {
            prompt: (completion.usage?.prompt_tokens || 0) + (finalCompletion.usage?.prompt_tokens || 0),
            completion: (completion.usage?.completion_tokens || 0) + (finalCompletion.usage?.completion_tokens || 0),
            total: totalTokens
          }
        });

        return response;
      } else {
        // No function call needed, just parse the direct response
        const response = this.parseResponse(message.content || '', toolResults, request);

        const endTime = Date.now();
        await this.logger.logRequest({
          request_id: requestId,
          timestamp: new Date(),
          llm_latency: endTime - startTime,
          llm_tokens: {
            prompt: completion.usage?.prompt_tokens || 0,
            completion: completion.usage?.completion_tokens || 0,
            total: completion.usage?.total_tokens || 0
          }
        });

        return response;
      }
    } catch (error) {
      const endTime = Date.now();
      this.logger.error('LLM Agent error', error);
      
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

  private async executeFunction(name: string, args: any): Promise<any> {
    // Use the LangChain tools but call them directly for now
    switch (name) {
      case 'check_availability':
        const availabilityTool = this.tools.checkAvailabilityTool;
        return await availabilityTool.func(args);
      
      case 'check_pet_policy':
        const petPolicyTool = this.tools.checkPetPolicyTool;
        return await petPolicyTool.func(args);
      
      case 'get_pricing':
        const pricingTool = this.tools.getPricingTool;
        return await pricingTool.func(args);
      
      case 'get_available_tour_slots':
        const tourSlotsTool = this.tools.getAvailableTourSlotsTool;
        return await tourSlotsTool.func(args);
      
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  private parseResponse(content: string, toolResults: any[], request: ChatRequest): ChatResponse {
    // Analyze the response to determine the appropriate action
    const lowerContent = content.toLowerCase();
    
    // Check if we have available tour slots from function calls
    const tourSlotsResult = toolResults.find(r => r.name === 'get_available_tour_slots')?.result;
    if (tourSlotsResult) {
      // Parse the JSON string returned by the tool
      let tourSlots: string[] = [];
      try {
        tourSlots = typeof tourSlotsResult === 'string' ? JSON.parse(tourSlotsResult) : tourSlotsResult;
      } catch (error) {
        console.error('Failed to parse tour slots result:', error);
        tourSlots = [];
      }
      
      if (tourSlots && Array.isArray(tourSlots) && tourSlots.length > 0) {
        // If we have tour slots, always return them regardless of content
        return {
          reply: content,
          action: 'propose_tour',
          proposed_time: tourSlots[0], // Keep for backward compatibility
          available_times: tourSlots
        };
      }
    }

    // Check if we need more information
    if (lowerContent.includes('could you') || 
        lowerContent.includes('can you tell me') ||
        lowerContent.includes('what') && lowerContent.includes('?') ||
        lowerContent.includes('more information') ||
        lowerContent.includes('which') && lowerContent.includes('?')) {
      return {
        reply: content,
        action: 'ask_clarification'
      };
    }

    // Check if we should hand off to human
    if (lowerContent.includes('contact') && lowerContent.includes('office') ||
        lowerContent.includes('speak') && lowerContent.includes('agent') ||
        lowerContent.includes('unable') ||
        lowerContent.includes('sorry') && lowerContent.includes('can\'t')) {
      return {
        reply: content,
        action: 'handoff_human'
      };
    }

    // Default to ask_clarification if unclear
    return {
      reply: content,
      action: 'ask_clarification'
    };
  }
}
