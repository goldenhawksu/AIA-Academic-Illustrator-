import OpenAI from 'openai';

export interface ModelConfig {
    baseUrl: string;
    apiKey: string;
    modelName: string;
}

export interface GenerateSchemaResponse {
    schema: string;
}

export interface RenderImageResponse {
    imageUrl: string | null;
    text?: string;
}

// Prompt templates (moved from backend)
const ARCHITECT_PROMPT_TEMPLATE = `You are an expert academic diagram architect. Analyze the following paper content and generate a detailed Visual Schema that describes a publication-quality academic diagram.

The Visual Schema should include:
1. Layout structure (zones, panels, sections)
2. Visual elements (shapes, icons, connections)
3. Color scheme
4. Text labels and annotations
5. Flow/direction indicators

Paper Content:
{paper_content}

Generate a comprehensive Visual Schema in the following format:

---BEGIN PROMPT---
[DIAGRAM TITLE]
A clear, descriptive title for the diagram

[OVERALL LAYOUT]
Describe the overall structure and organization

[ZONES/SECTIONS]
Detail each zone or section with:
- Position and size
- Background color/style
- Content description

[VISUAL ELEMENTS]
List all visual elements with:
- Type (box, arrow, icon, etc.)
- Position
- Style (color, border, shadow)
- Content/label

[CONNECTIONS]
Describe connections between elements:
- From/To
- Arrow style
- Labels

[COLOR PALETTE]
List the main colors used

[KEY TEXT LABELS]
Important text annotations
---END PROMPT---`;

const RENDERER_PROMPT_TEMPLATE = `You are an expert academic diagram renderer. Based on the following Visual Schema, generate a high-quality academic diagram suitable for CVPR/NeurIPS publications.

{visual_schema_content}

Create a clean, professional academic diagram with:
- Clear visual hierarchy
- Professional color scheme
- Crisp lines and shapes
- Readable text labels
- Publication-quality aesthetics`;

const RENDERER_WITH_REFERENCES_TEMPLATE = `You are an expert academic diagram renderer. Based on the following Visual Schema and reference images, generate a high-quality academic diagram that matches the style of the references.

{visual_schema_content}

The reference images show the desired aesthetic style. Generate a diagram that:
- Follows the layout and structure from the Visual Schema
- Matches the visual style of the reference images
- Has publication-quality aesthetics suitable for CVPR/NeurIPS`;

/**
 * Generate Visual Schema from paper content using OpenAI-compatible API
 */
export async function generateSchema(
    paperContent: string,
    config: ModelConfig,
    inputImages?: string[]
): Promise<GenerateSchemaResponse> {
    const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
        dangerouslyAllowBrowser: true, // Allow browser usage
    });

    const prompt = ARCHITECT_PROMPT_TEMPLATE.replace('{paper_content}', paperContent);

    // Build message content
    let content: OpenAI.Chat.ChatCompletionContentPart[];

    if (inputImages && inputImages.length > 0) {
        // Multimodal format with images
        content = inputImages.map((img) => ({
            type: 'image_url' as const,
            image_url: { url: img },
        }));
        content.push({
            type: 'text' as const,
            text: prompt,
        });
    } else {
        // Text only
        content = [{
            type: 'text' as const,
            text: prompt,
        }];
    }

    const response = await client.chat.completions.create({
        model: config.modelName,
        messages: [{ role: 'user', content }],
        temperature: 0.7,
        max_tokens: 4096,
    });

    const schema = response.choices[0]?.message?.content || '';
    return { schema };
}

/**
 * Render image from Visual Schema using OpenAI-compatible API
 */
export async function renderImage(
    visualSchema: string,
    config: ModelConfig,
    referenceImages?: string[]
): Promise<RenderImageResponse> {
    const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
        dangerouslyAllowBrowser: true,
    });

    // Choose template based on whether reference images are provided
    let prompt: string;
    if (referenceImages && referenceImages.length > 0) {
        prompt = RENDERER_WITH_REFERENCES_TEMPLATE.replace('{visual_schema_content}', visualSchema);
    } else {
        prompt = RENDERER_PROMPT_TEMPLATE.replace('{visual_schema_content}', visualSchema);
    }

    // Build message content
    let content: OpenAI.Chat.ChatCompletionContentPart[];

    if (referenceImages && referenceImages.length > 0) {
        content = referenceImages.map((img) => ({
            type: 'image_url' as const,
            image_url: { url: img },
        }));
        content.push({
            type: 'text' as const,
            text: prompt,
        });
    } else {
        content = [{
            type: 'text' as const,
            text: prompt,
        }];
    }

    const response = await client.chat.completions.create({
        model: config.modelName,
        messages: [{ role: 'user', content }],
        temperature: 0.7,
        max_tokens: 4096,
    });

    const resultContent = response.choices[0]?.message?.content || '';

    // Try to extract image from response
    if (resultContent) {
        // Look for base64 image pattern
        const base64Pattern = /data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/;
        const match = resultContent.match(base64Pattern);
        if (match) {
            return { imageUrl: match[0] };
        }

        // Check for raw base64 (without data URL prefix)
        if (resultContent.length > 1000 && /^[A-Za-z0-9+/=\s]+$/.test(resultContent)) {
            return { imageUrl: `data:image/png;base64,${resultContent.trim()}` };
        }
    }

    // If no image found, return text response
    return { imageUrl: null, text: resultContent };
}
