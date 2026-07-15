// src/components/ChatUI.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import useDashboardStore from '../store'; // Import your Zustand store

const API_URL = 'http://127.0.0.1:8000';

export default function ChatUI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentReady, setAgentReady] = useState(false);

  // 1. Grab the cleaned table data directly from your global pipeline state
  const { pipeline_tableData } = useDashboardStore();

  useEffect(() => {
    syncCleanedDataWithAgent();
  }, [pipeline_tableData]); // Automatically runs when pipeline_tableData changes!

  const syncCleanedDataWithAgent = async () => {
    const rows = pipeline_tableData?.rowData || pipeline_tableData?.rows || [];
    if (rows.length === 0) return;

    setIsLoading(true);
    try {
      // Send the clean rows to the backend to initialize the Pandas Agent
      const response = await fetch(`${API_URL}/api/v1/sync_clean_data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset: rows }),
      });
      
      if (response.ok) {
        setAgentReady(true);
        setMessages([
          {
            role: 'assistant',
            content: "✨ Your cleaned dataset is successfully loaded into my memory! Ask me anything about its metrics or columns, and I will write Python code to analyze it."
          }
        ]);
      }
    } catch (error) {
      console.error("Failed to sync cleaned data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !agentReady) return;

    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      // Send the query to the backend (we do not need to send the dataset again!)
      const response = await fetch(`${API_URL}/api/v1/query_clean_agent`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage }),
      });
      const data = await response.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I had trouble analyzing that."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] border border-gray-200 rounded-xl bg-slate-50 p-4">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-lg max-w-[80%] ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && <div className="text-sm text-gray-400 italic">Thinking...</div>}
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a question..."
          className="flex-1 p-3 border rounded-xl"
          disabled={!agentReady || isLoading}
        />
        <button onClick={handleSend} className="bg-blue-600 text-white px-4 rounded-xl">Send</button>
      </div>
    </div>
  );
}