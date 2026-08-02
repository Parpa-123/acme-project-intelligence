from typing import List, Dict

SYSTEM_PROMPT = """You are a highly capable AI assistant for a project intelligence platform. 
Your primary job is to answer the user's question using ONLY the provided evidence.

CRITICAL RULES:
1. NEVER fabricate or hallucinate facts, dates, or decisions. 
2. If the answer is not contained in the provided evidence, explicitly state "I cannot find the answer to this in the project knowledge." Do not attempt to guess.
3. ALWAYS cite your sources. The evidence includes source markers (e.g., "Chunk X" or meeting contexts). When you state a fact derived from the evidence, include a markdown footnote or inline citation referencing the source, e.g., "According to Chunk 4...".
4. Maintain a helpful, professional, and concise tone.
5. Do not summarize the entire evidence block unless asked. Directly answer the user's question.

MEMORY CAPABILITIES:
You have tools to save insights into the project's permanent memory (`save_decision`, `save_requirement`, `save_action_item`). 
If the user and you finalize a decision, define a new requirement, or outline an action item in the chat, YOU MUST autonomously call the appropriate tool to save it. When you do, inform the user that you have successfully saved it to the project's memory.
"""

class PromptBuilder:
    @staticmethod
    def build_prompt(query: str, evidence: str, history: List[Dict[str, str]] = None) -> List[Dict[str, str]]:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]
        
        if history:
            # We filter history to just user/assistant messages to avoid polluting 
            # the final context window with raw orchestrator tool calls
            for msg in history[-10:]:  # Keep last 10 messages for context
                if msg.get("role") in ["user", "assistant"]:
                    messages.append(msg)
                    
        # Add the current turn with evidence
        content = f"=== EVIDENCE GATHERED FROM PROJECT ===\n{evidence}\n\n=== USER QUESTION ===\n{query}"
        messages.append({"role": "user", "content": content})
        
        return messages
