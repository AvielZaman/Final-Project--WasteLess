// backend\src\services\ReceiptProcessingService.ts
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { v2 as translateModule } from '@google-cloud/translate';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Create a TypeScript interface for extracted food items
export interface ExtractedFoodItem {
  name: string;
  category:
    | 'dry'
    | 'vegetable'
    | 'fruit'
    | 'dairy'
    | 'meat'
    | 'frozen'
    | 'bakery'
    | 'other';
  quantity: number;
  unit: string;
  price?: number;
}

// Determine if we're already in the backend directory
const isInBackendDir = process.cwd().endsWith('backend');

// Set the path correctly based on current working directory
const credentialsPath = isInBackendDir
  ? path.resolve(process.cwd(), 'config/google-credentials.json')
  : path.resolve(process.cwd(), 'backend/config/google-credentials.json');

console.log('Using credentials path:', credentialsPath);

// Check if the file exists
if (!fs.existsSync(credentialsPath)) {
  console.error(`Google credentials file not found at: ${credentialsPath}`);
  // Try to list files in the directory to debug
  try {
    const dir = path.dirname(credentialsPath);
    if (fs.existsSync(dir)) {
      console.log('Files in directory:', fs.readdirSync(dir));
    } else {
      console.log('Directory does not exist:', dir);
    }
  } catch (err) {
    console.error('Error checking directory:', err);
  }
}

// Initialize Google Cloud clients
const visionClient = new ImageAnnotatorClient({
  keyFilename: credentialsPath,
});

const translateClient = new translateModule.Translate({
  keyFilename: credentialsPath,
});

// Claude API configuration
const CLAUDE_API_URL =
  process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages';
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

/**
 * Extract text from an image using Google Cloud Vision OCR
 */
export const extractTextFromImage = async (
  imagePath: string
): Promise<string> => {
  try {
    console.log('Reading image from path:', imagePath);
    // Read the image file
    const imageFile = fs.readFileSync(imagePath);
    console.log('Image size:', imageFile.length, 'bytes');

    // Perform text detection
    const [result] = await visionClient.textDetection({
      image: { content: imageFile },
    });

    const detections = result.textAnnotations;

    // The first annotation contains the full text
    if (detections && detections.length > 0) {
      return detections[0].description ?? '';
    }

    return '';
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw new Error('Failed to extract text from image');
  }
};

/**
 * Translate text from Hebrew to English
 */
export const translateHebrewToEnglish = async (
  text: string
): Promise<string> => {
  try {
    // Perform translation (Hebrew to English)
    const [translation] = await translateClient.translate(text, {
      from: 'he',
      to: 'en',
    });

    return translation;
  } catch (error) {
    console.error('Error translating text:', error);
    throw new Error('Failed to translate text');
  }
};

/**
 * Extract food items from text using Claude
 */
export const extractFoodItemsFromText = async (
  text: string
): Promise<ExtractedFoodItem[]> => {
  try {
    // Call Claude API to extract food items
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `Extract ONLY food ingredients from this grocery receipt text:
            
${text}

Please categorize each food ingredient into one of these categories: dry, vegetable, fruit, dairy, meat, frozen, bakery, other.

For each ingredient, provide:
1. Name of the ingredient (be specific but concise)
2. Category (dry, vegetable, fruit, dairy, meat, frozen, bakery, other)
3. Quantity (if available, default to 1 if not specified)
4. Unit (if available, default to "unit" if not specified)
5. Price (if available)

Here are some specific categorizations to use:
- Bread (including pita bread, challah) → bakery
- Hummus → other
- Tahini → dry
- Labneh → dairy
- Cottage cheese → dairy
- Eggs → other

VERY IMPORTANT: DO NOT include non-food items like shoes, clothing, electronics, or household items.
Format the response as a JSON array of objects with these properties.`,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
        },
      }
    );

    // Extract the JSON from Claude's response
    const content = response.data.content[0].text;

    // Try to parse the JSON array from the response
    const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Claude response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error extracting food items:', error);
    throw new Error('Failed to extract food items');
  }
};

/**
 * Process a regular receipt (non-Hebrew)
 */
export const processReceipt = async (
  imagePath: string
): Promise<ExtractedFoodItem[]> => {
  try {
    // Step 1: Extract text from image using Google Cloud Vision
    console.log('Extracting text from receipt image...');
    const extractedText = await extractTextFromImage(imagePath);

    // Log the extracted text for debugging
    console.log('Extracted text:', extractedText);

    // Step 2: Extract food items from the text
    console.log('Extracting food items from text...');
    const foodItems = await extractFoodItemsFromText(extractedText);

    return foodItems;
  } catch (error) {
    console.error('Error processing receipt:', error);
    throw error;
  }
};

/**
 * Process a Hebrew receipt
 */
export const processHebrewReceipt = async (
  imagePath: string
): Promise<ExtractedFoodItem[]> => {
  try {
    // Step 1: Extract text from image using Google Cloud Vision
    console.log('Extracting text from Hebrew receipt image...');
    const hebrewText = await extractTextFromImage(imagePath);

    // Log the extracted Hebrew text for debugging
    console.log('Extracted Hebrew text:', hebrewText);

    // Step 2: Translate the text from Hebrew to English
    console.log('Translating text to English...');
    const translatedText = await translateHebrewToEnglish(hebrewText);

    // Log the translated text for debugging
    console.log('Translated text:', translatedText);

    // Step 3: Extract food items from translated text
    console.log('Extracting food items from translated text...');
    const foodItems = await extractFoodItemsFromText(translatedText);

    return foodItems;
  } catch (error) {
    console.error('Error processing Hebrew receipt:', error);
    throw error;
  }
};

export default {
  processReceipt,
  processHebrewReceipt,
  extractTextFromImage,
  translateHebrewToEnglish,
  extractFoodItemsFromText,
};
