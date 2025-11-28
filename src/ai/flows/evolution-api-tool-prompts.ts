'use server';
/**
 * @fileOverview Provides helpful prompts and guidance on using Evolution API features.
 *
 * - getEvolutionApiHelp - A function that provides guidance on Evolution API features.
 * - GetEvolutionApiHelpInput - The input type for the getEvolutionApiHelp function.
 * - GetEvolutionApiHelpOutput - The return type for the getEvolutionApiHelp function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetEvolutionApiHelpInputSchema = z.object({
  feature: z.string().describe('The specific Evolution API feature to get help with.'),
});
export type GetEvolutionApiHelpInput = z.infer<typeof GetEvolutionApiHelpInputSchema>;

const GetEvolutionApiHelpOutputSchema = z.object({
  helpText: z.string().describe('Detailed guidance and examples for the specified Evolution API feature.'),
});
export type GetEvolutionApiHelpOutput = z.infer<typeof GetEvolutionApiHelpOutputSchema>;

export async function getEvolutionApiHelp(input: GetEvolutionApiHelpInput): Promise<GetEvolutionApiHelpOutput> {
  return evolutionApiHelpFlow(input);
}

const prompt = ai.definePrompt({
  name: 'evolutionApiHelpPrompt',
  input: {schema: GetEvolutionApiHelpInputSchema},
  output: {schema: GetEvolutionApiHelpOutputSchema},
  prompt: `You are an expert in Evolution API and provide guidance to users on how to integrate and use its features.

  Provide detailed instructions, code examples, and best practices for the specified feature.

  Feature: {{{feature}}}
  `,
});

const evolutionApiHelpFlow = ai.defineFlow(
  {
    name: 'evolutionApiHelpFlow',
    inputSchema: GetEvolutionApiHelpInputSchema,
    outputSchema: GetEvolutionApiHelpOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
