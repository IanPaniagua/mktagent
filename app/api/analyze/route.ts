import { NextRequest } from 'next/server';
import { CompanyData } from '@/lib/types';
import { runAnalysis } from '@/lib/agent';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const companyData = await request.json() as CompanyData;

        await runAnalysis(
          companyData,
          (step, status, message) => {
            send({ type: 'step', step, status, message });
          },
          (section, content) => {
            send({ type: 'result', section, content });
          }
        );

        send({ type: 'complete' });
      } catch (error) {
        console.error('Analyze route error:', error);
        send({
          type: 'error',
          message: error instanceof Error ? error.message : 'Analysis failed',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
