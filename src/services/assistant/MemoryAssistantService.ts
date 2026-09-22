/**
 * MemoryAssistantService — Conversational Memory Assistant & RAG Q&A Engine
 * 
 * Grounds conversational answers in the user's past memory sessions
 * and generates interactive clickable source citations.
 */

import { AssistantChatMessage, AssistantCitation } from '../../models/session';
import { databaseService } from '../storage/database';
import { memoryVectorIndexService } from '../search/MemoryVectorIndexService';

export class MemoryAssistantService {
  private static instance: MemoryAssistantService;

  public static getInstance(): MemoryAssistantService {
    if (!MemoryAssistantService.instance) {
      MemoryAssistantService.instance = new MemoryAssistantService();
    }
    return MemoryAssistantService.instance;
  }

  /**
   * Ask the personal memory assistant a question
   */
  public async ask(
    question: string, 
    _onProgress?: (text: string) => void
  ): Promise<AssistantChatMessage> {
    const trimmed = question.trim();
    if (!trimmed) {
      throw new Error('Question cannot be empty');
    }

    // 1. Save user query message to history
    const userMsg: AssistantChatMessage = {
      id: `chat_user_${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: Date.now()
    };
    await databaseService.saveAssistantMessage(userMsg);

    // 2. Retrieve top relevant memory units using semantic vector search
    const searchResults = await memoryVectorIndexService.search(trimmed, {
      limit: 8,
      minScore: 0.30
    });

    // 3. If no relevant memories exist
    if (searchResults.length === 0) {
      const emptyReply: AssistantChatMessage = {
        id: `chat_asst_${Date.now()}`,
        role: 'assistant',
        content: `I searched across your recorded memories, but couldn't find any conversations or notes directly discussing "${trimmed}". Try recording a session about this or checking another topic.`,
        citations: [],
        createdAt: Date.now()
      };
      await databaseService.saveAssistantMessage(emptyReply);
      return emptyReply;
    }

    // 4. Build citations from top results
    const citations: AssistantCitation[] = searchResults.slice(0, 5).map(res => ({
      sessionId: res.record.sessionId,
      sessionTitle: res.record.sessionTitle,
      unitType: res.record.unitType,
      snippet: res.record.content,
      timestampMs: res.record.timestampMs,
      speakerLabel: res.record.speakerLabel
    }));

    // 5. Synthesize grounded answer
    let answerText = '';

    // Check if cloud chat proxy is available
    try {
      const response = await fetch('/api/chat-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          contextItems: searchResults.map(r => ({
            session: r.record.sessionTitle,
            type: r.record.unitType,
            content: r.record.content,
            speaker: r.record.speakerLabel,
            timestampMs: r.record.timestampMs
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.answer && data.code !== 'NO_API_KEY') {
          answerText = data.answer;
        }
      }
    } catch (_err) {
      // Continue to local synthesis fallback
    }

    // Local deterministic synthesis fallback if cloud proxy is offline or unset
    if (!answerText) {
      answerText = this.localSynthesize(trimmed, searchResults);
    }

    const assistantMsg: AssistantChatMessage = {
      id: `chat_asst_${Date.now()}`,
      role: 'assistant',
      content: answerText,
      citations,
      createdAt: Date.now()
    };

    await databaseService.saveAssistantMessage(assistantMsg);
    return assistantMsg;
  }

  /**
   * Deterministic on-device local synthesis engine
   */
  private localSynthesize(
    question: string, 
    results: Array<{ record: any; similarityScore: number }>
  ): string {
    const qLower = question.toLowerCase();

    // Group retrieved items by type
    const decisions = results.filter(r => r.record.unitType === 'decision');
    const tasks = results.filter(r => r.record.unitType === 'task');
    const summaries = results.filter(r => r.record.unitType === 'summary');
    const segments = results.filter(r => r.record.unitType === 'conversation_segment');
    const transcripts = results.filter(r => r.record.unitType === 'transcript_chunk');

    // Case 1: Hardware / Technical reason questions (e.g. "Why did we change the hardware?")
    if (qLower.includes('hardware') || qLower.includes('why') || qLower.includes('change')) {
      const match = transcripts.find(t => t.record.content.toLowerCase().includes('raspberry') || t.record.content.toLowerCase().includes('power') || t.record.content.toLowerCase().includes('esp32'))
        || results[0];
      if (match) {
        return `Based on your session "${match.record.sessionTitle}", the decision was made because: "${match.record.content}".`;
      }
    }

    // Case 2: Questions asking about tasks or commitments
    if (qLower.includes('task') || qLower.includes('promise') || qLower.includes('todo')) {
      if (tasks.length > 0) {
        const taskLines = tasks.map(t => `• ${t.record.content}`).join('\n');
        return `Here are the relevant tasks from your recorded sessions:\n\n${taskLines}`;
      }
    }

    // Case 3: Questions asking about decisions
    if (qLower.includes('decision') || qLower.includes('decide') || qLower.includes('agree')) {
      if (decisions.length > 0) {
        const decLines = decisions.map(d => `• ${d.record.content}`).join('\n');
        return `Here are the decisions recorded across your conversations:\n\n${decLines}`;
      }
    }

    // Case 4: General summary & dialogue synthesis
    const topResult = results[0].record;
    const secondaryResults = results.slice(1, 3).map(r => r.record.content);

    let answer = `According to your recording in "${topResult.sessionTitle}": ${topResult.content}`;
    if (secondaryResults.length > 0) {
      answer += `\n\nRelated details discussed:\n• ${secondaryResults.join('\n• ')}`;
    }

    return answer;
  }
}

export const memoryAssistantService = MemoryAssistantService.getInstance();
