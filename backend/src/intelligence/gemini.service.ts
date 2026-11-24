import { GoogleGenAI, Type } from '@google/genai';
import { env } from '../config/env';
import {
  ContentStrategyResponse,
  ContentStrategyResponseSchema,
  InstagramPost,
} from '../schemas/content.schema';
import { AnalyticsReport } from '../analytics/analytics.service';

export class GeminiServiceError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'GeminiServiceError';
    this.statusCode = statusCode;
  }
}

export interface IGeminiClient {
  models: {
    generateContent(params: {
      model: string;
      contents: string;
      config?: {
        systemInstruction?: string;
        responseMimeType?: string;
        responseSchema?: unknown;
      };
    }): Promise<{ text?: string | null }>;
  };
}

export const contentStrategyResponseSchema = {
  type: Type.OBJECT,
  properties: {
    executiveSummary: {
      type: Type.STRING,
      description: 'Senior strategist executive summary synthesizing verified performance metrics.',
    },
    keyPatterns: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3–5 key performance patterns discovered in the analytics report.',
    },
    recommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: {
            type: Type.STRING,
            description: 'Unique recommendation identifier (e.g. rec_001).',
          },
          title: {
            type: Type.STRING,
            description: 'Concise, action-oriented recommendation headline.',
          },
          category: {
            type: Type.STRING,
            enum: [
              'FORMAT_DOUBLE_DOWN',
              'CONTENT_THEME',
              'HOOK_AND_CAPTION',
              'POSTING_SCHEDULE',
              'UNDERPERFORMING_FIX',
            ],
          },
          recommendedFormat: {
            type: Type.STRING,
            enum: ['REEL', 'CAROUSEL', 'IMAGE'],
          },
          suggestedTopic: {
            type: Type.STRING,
            description: 'Specific content topic for the recommendation.',
          },
          actionableBrief: {
            type: Type.STRING,
            description: 'Concrete creative brief including hook example and structure.',
          },
          supportingPostIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Real postIds from the dataset that provide evidence for this recommendation.',
          },
          dataEvidence: {
            type: Type.STRING,
            description: 'Specific metric numbers (e.g., WER %, reach, comments) justifying this action.',
          },
          expectedImpact: {
            type: Type.STRING,
            enum: ['HIGH', 'MEDIUM'],
          },
        },
        required: [
          'id',
          'title',
          'category',
          'recommendedFormat',
          'suggestedTopic',
          'actionableBrief',
          'supportingPostIds',
          'dataEvidence',
          'expectedImpact',
        ],
      },
    },
  },
  required: ['executiveSummary', 'keyPatterns', 'recommendations'],
};

export class GeminiService {
  private client: IGeminiClient;
  private isCustomClient: boolean;

  constructor(client?: IGeminiClient) {
    if (client) {
      this.client = client;
      this.isCustomClient = true;
    } else {
      this.isCustomClient = false;
      const apiKey = env.GEMINI_API_KEY;
      this.client = new GoogleGenAI({ apiKey: apiKey || '' });
    }
  }

  async generateStrategy(
    report: AnalyticsReport,
    posts: InstagramPost[]
  ): Promise<ContentStrategyResponse> {
    // Check API Key availability if not using a custom/mock client
    if (!this.isCustomClient) {
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey === 'test-api-key') {
        throw new GeminiServiceError(
          'GEMINI_API_KEY is not configured. Please set a valid Gemini API key in your environment.',
          503
        );
      }
    }

    const validPostIds = new Set(posts.map((p) => p.postId));

    const systemInstruction = `You are a senior data-driven Instagram content strategist for a tech and AI brand.
Your job is to analyze the provided deterministic AnalyticsReport and generate high-impact, grounded recommendations.

CRITICAL GROUNDING RULES:
1. Every recommendation in 'recommendations' MUST cite real 'postId's from the provided dataset in 'supportingPostIds'.
2. Every recommendation MUST quote exact metrics (e.g. WER %, reach, comments, replayRatio) from the report in 'dataEvidence'.
3. Never provide generic advice unsupported by the analytical numbers.
4. Output must strictly conform to the JSON schema.`;

    const prompt = `Synthesize a data-grounded content strategy based on the following verified performance report:

ANALYTICS REPORT:
${JSON.stringify(report, null, 2)}

AVAILABLE POST IDS FOR CITATION:
${posts.map((p) => `postId: "${p.postId}" | format: ${p.postType} | topic: "${p.topic}" | reach: ${p.reach} | likes: ${p.likes} | comments: ${p.comments}`).join('\n')}

Generate the executive summary, key patterns, and actionable recommendations.`;

    let responseText: string | undefined | null;

    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: contentStrategyResponseSchema,
        },
      });

      responseText = response.text;
    } catch (err: unknown) {
      const error = err as Error;
      if (
        error.message?.includes('429') ||
        error.message?.includes('RESOURCE_EXHAUSTED') ||
        error.message?.includes('Quota')
      ) {
        throw new GeminiServiceError(
          'Gemini API rate limit or quota exceeded. Please try again later.',
          429
        );
      }
      throw new GeminiServiceError(
        `Gemini API generation failed: ${error.message || 'Unknown error'}`,
        500
      );
    }

    if (!responseText) {
      throw new GeminiServiceError('Gemini API returned an empty response.', 500);
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(responseText);
    } catch (err) {
      throw new GeminiServiceError(
        `Failed to parse Gemini response as JSON: ${(err as Error).message}`,
        500
      );
    }

    // Validate structured JSON with Zod
    const validated = ContentStrategyResponseSchema.safeParse(parsedJson);
    if (!validated.success) {
      throw new GeminiServiceError(
        `Gemini response failed schema validation: ${JSON.stringify(validated.error.format())}`,
        500
      );
    }

    // Grounding verification: verify cited supportingPostIds exist in the dataset
    for (const rec of validated.data.recommendations) {
      const invalidIds = rec.supportingPostIds.filter((id) => !validPostIds.has(id));
      if (invalidIds.length > 0) {
        throw new GeminiServiceError(
          `Recommendation "${rec.title}" cited non-existent postId(s): ${invalidIds.join(', ')}`,
          500
        );
      }
    }

    return validated.data;
  }
}
