#!/usr/bin/env node

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get command line arguments
const dayNumber = process.argv[2] || '1';
const outputDate = process.argv[3] || new Date().toISOString().split('T')[0];

// Validate day number
if (!['1', '2'].includes(dayNumber)) {
  console.error('Error: Day must be 1 or 2');
  process.exit(1);
}

// Check for API key
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is required');
  process.exit(1);
}

const client = new Anthropic({ apiKey });

// Read the shoni.md specification
async function readSpecification() {
  const specPath = path.join(__dirname, '..', 'shoni.md');
  return await fs.readFile(specPath, 'utf-8');
}

// Generate workout routine using Claude
async function generateRoutine(dayNumber, specification) {
  const dayFocus = dayNumber === '1'
    ? 'Lower Body & Cardio (Legs, Glutes, Cardio)'
    : 'Upper Body & Cardio (Arms, Back, Cardio)';

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const prompt = `You are a personal fitness trainer. Generate a workout routine based on the following specification:

${specification}

Requirements:
- Create a Day ${dayNumber} workout focusing on: ${dayFocus}
- Use the EXACT format specified in the "Output Format" section
- Follow ALL constraints: 40 minutes total, 3 circuits, timing structure
- Vary the exercises from typical routines to keep it interesting
- Use only the available equipment: Kettlebell (6kg), Weight discs (5kg), Jump rope
- Session date should be: ${currentDate}
- Keep the structure: Warm-up (5 min), 3 Circuits (10 min each), Cool-down (5 min)
- Each circuit: 2 rounds, 40 sec work / 20 sec rest per exercise, 60 sec rest between circuits

Generate ONLY the workout routine in markdown format. Do not include any explanations or additional text.`;

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  return message.content[0].text;
}

// Save routine to file
async function saveRoutine(routine, dayNumber, date) {
  const filename = `${date}_day${dayNumber}_routine.md`;
  const filepath = path.join(__dirname, '..', filename);
  await fs.writeFile(filepath, routine, 'utf-8');
  console.log(`✅ Generated workout routine: ${filename}`);
  return filename;
}

// Main execution
async function main() {
  try {
    console.log(`Generating Day ${dayNumber} workout routine...`);

    const specification = await readSpecification();
    console.log('✓ Read workout specification');

    const routine = await generateRoutine(dayNumber, specification);
    console.log('✓ Generated routine using Claude API');

    const filename = await saveRoutine(routine, dayNumber, outputDate);
    console.log(`\n🏋️ Workout routine ready: ${filename}`);

  } catch (error) {
    console.error('Error generating routine:', error.message);
    process.exit(1);
  }
}

main();
