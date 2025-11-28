'use server';
/**
 * @fileOverview Provides helpful prompts and guidance on using FlizoWapi API features.
 *
 * - getFlizoWapiHelp - A function that provides guidance on FlizoWapi API features.
 * - GetFlizoWapiHelpInput - The input type for the getFlizoWapiHelp function.
 * - GetFlizoWapiHelpOutput - The return type for the getFlizoWapiHelp function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetFlizoWapiHelpInputSchema = z.object({
  feature: z.string().describe('The specific FlizoWapi API feature to get help with.'),
});
export type GetFlizoWapiHelpInput = z.infer<typeof GetFlizoWapiHelpInputSchema>;

const GetFlizoWapiHelpOutputSchema = z.object({
  helpText: z.string().describe('Detailed guidance and examples for the specified FlizoWapi API feature.'),
});
export type GetFlizoWapiHelpOutput = z.infer<typeof GetFlizoWapiHelpOutputSchema>;

export async function getFlizoWapiHelp(input: GetFlizoWapiHelpInput): Promise<GetFlizoWapiHelpOutput> {
  return flizoWapiHelpFlow(input);
}

const prompt = ai.definePrompt({
  name: 'flizoWapiHelpPrompt',
  input: {schema: GetFlizoWapiHelpInputSchema},
  output: {schema: GetFlizoWapiHelpOutputSchema},
  prompt: `You are an expert in FlizoWapi API and provide guidance to users on how to integrate and use its features.

  Provide detailed instructions, code examples, and best practices for the specified feature.

  Feature: {{{feature}}}
  `,
});

const flizoWapiHelpFlow = ai.defineFlow(
  {
    name: 'flizoWapiHelpFlow',
    inputSchema: GetFlizoWapiHelpInputSchema,
    outputSchema: GetFlizoWapiHelpOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
