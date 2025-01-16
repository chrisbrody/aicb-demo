// api/generate.js
import sharp from 'sharp';
import axios from 'axios';

// CORS headers helper function
const allowCors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    return await fn(req, res);
};

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
        responseLimit: '10mb'
    },
};

async function createLineArt(imageBuffer) {
    try {
        return await sharp(imageBuffer)
            .ensureAlpha()
            .toColourspace('b-w')
            .png()
            .toBuffer();
    } catch (error) {
        console.error('Error processing image:', error);
        throw error;
    }
}

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, width, height } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const HUGGING_FACE_TOKEN = process.env.HUGGING_FACE_TOKEN;
        if (!HUGGING_FACE_TOKEN) {
            return res.status(500).json({ error: 'Hugging Face token not configured' });
        }

        const MODEL_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";
        const enhancedPrompt = `${prompt}, simple line drawing, black and white, coloring book style, clean lines, minimalistic design, bold outlines, no shading, no gradients, no texture, no colors, flat style, no background shading, crisp and clear contours, blank white background`;

        const response = await axios({
            method: 'post',
            url: MODEL_URL,
            headers: {
                'Authorization': `Bearer ${HUGGING_FACE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            data: {
                inputs: enhancedPrompt,
                parameters: {
                    negative_prompt: "color, shading, realistic, detailed, complexity, texture, gradients",
                    num_inference_steps: 30,
                    guidance_scale: 7.5,
                    height: height || 512,
                    width: width || 512
                }
            },
            responseType: 'arraybuffer'
        });

        const lineArt = await createLineArt(response.data);
        res.setHeader('Content-Type', 'image/png');
        return res.status(200).send(lineArt);

    } catch (error) {
        console.error('Error details:', error.response?.data || error.message);
        return res.status(500).json({
            error: 'Failed to generate image',
            details: error.message
        });
    }
}

// Export the handler wrapped with CORS
export default allowCors(handler);