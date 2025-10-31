import { NextResponse } from 'next/server';
import { getEmbedding } from '@/lib/services/embedding.service';
import { findSimilarQuestions } from '@/lib/services/pinecone.service';

export async function POST(req: Request) {
  try {
    const { text, subject, difficulty, limit } = await req.json();
    
    if (!text) {
      return new NextResponse('Text is required', { status: 400 });
    }

    const embedding = await getEmbedding(text);
    
    type QuestionFilter = Record<string, string | number | boolean> & {
      subject?: string;
      difficulty?: string;
    }
    
    const filter: Partial<QuestionFilter> = {};
    if (subject) filter.subject = subject;
    if (difficulty) filter.difficulty = difficulty.toUpperCase();
    
    const validFilter = Object.keys(filter).length > 0 ? filter as Record<string, string | number | boolean> : undefined;

    const similarQuestions = await findSimilarQuestions(
      embedding,
      limit || 5,
      validFilter
    );

    return NextResponse.json({
      query: text,
      results: similarQuestions
    });
    
  } catch (error) {
    console.error('Error finding similar questions:', error);
    return new NextResponse('Failed to find similar questions', { status: 500 });
  }
}
