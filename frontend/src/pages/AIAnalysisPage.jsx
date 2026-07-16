import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Sparkles, Upload, BarChart3, Search,
  TrendingUp, PieChart, Loader2, ChevronDown,
  MessageSquare, Zap, Download, Settings,
  ArrowUp, X, File, Copy, RotateCcw
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import useDashboardStore from '../store'; // Import Zustand store

const API_URL =import.url.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';;

export default function AIAnalysisPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeChat, setActiveChat] = useState(1);
  const [agentReady, setAgentReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { pipeline_tableData } = useDashboardStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Automatically initialize the AI agent using the active preprocessed data
    initializeAgentWithDashboardData();
    inputRef.current?.focus();
  }, [pipeline_tableData]);

  const initializeAgentWithDashboardData = async () => {
    const rows = pipeline_tableData?.rowData || pipeline_tableData?.rows || [];
    
    if (rows.length === 0) {
      setAgentReady(false);
      setErrorMessage("No active dataset found. Please upload a file and run preprocessing first!");
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/v1/sync_agent_data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset: rows }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to sync dashboard data.");

      if (messages.length === 0) {
        setMessages([
          {
            role: 'assistant',
            content: `Hello! I have successfully loaded your preprocessed dataset (${rows.length} records). I am ready to answer any questions about your metrics, columns, or data patterns!`,
            timestamp: new Date()
          }
        ]);
      }
      setAgentReady(true);
    } catch (error) {
      console.error("Agent Sync Error:", error);
      setErrorMessage(`Failed to synchronize dataset with AI: ${error.message}`);
      setAgentReady(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick action cards for welcome screen
  const quickActions = [

    {
      icon: BarChart3,
      label: 'Quantitative analysis',
      description: 'Generate charts, tables, insights, data science models & more',
      color: '#F59E0B',
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
    },
    {
      icon: Settings,
      label: 'Qualitative analysis',
      description: 'Add an AI-generated columns to your dataset with Enrichments',
      color: '#8B5CF6',
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)'
    },
  ];

  const playbooks = [
    { icon: Sparkles, text: 'Clean data', color: '#F59E0B' },
    { icon: BarChart3, text: 'Generate charts', color: '#3B82F6' },
    { icon: Search, text: 'Exploratory analysis', color: '#8B5CF6' },
    { icon: TrendingUp, text: 'Data science', color: '#EF4444' },
  ];

  const handleSend = async () => {
    if (!input.trim() || isLoading || !agentReady) return;

    const currentInput = input;
    const userMessage = {
      role: 'user',
      content: currentInput,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/query_agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currentInput }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log("Backend response:", JSON.stringify(data));

      const aiResponse = {
        role: 'assistant',
        content: data.answer || "I couldn't find an answer from the backend.",
        timestamp: new Date(),
        hasCode: data.code || false,
        code: data.code || null
      };
      setMessages(prev => [...prev, aiResponse]);

    } catch (error) {
      console.error("Chat Error:", error);
      const errorMessage = {
        role: 'assistant',
        content: `Sorry, there was an error talking to the analysis backend: ${error.message}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    if (false) {
      // Disabled
    } else {
      setInput(`Help me with ${action.label.toLowerCase()}`);
      inputRef.current?.focus();
    }
  };

  const handlePlaybook = (playbook) => {
    setInput(playbook.text);
    inputRef.current?.focus();
  };

  const showWelcome = messages.length === 0;

  if (errorMessage) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: '#FFFFFF',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* Sidebar */}
        <Sidebar activeChat={activeChat} onChatSelect={(chat) => setActiveChat(chat.id)} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: '#FEF2F2',
            color: '#991B1B',
            border: '1px solid #FCA5A5',
            borderRadius: '16px',
            maxWidth: '500px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <p style={{ fontWeight: '600', fontSize: '16px', marginBottom: '8px' }}>No Active Dataset Context Found</p>
            <p style={{ fontSize: '14px', color: '#B91C1C' }}>{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: '#FFFFFF',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>

      {/* Sidebar */}
      <Sidebar activeChat={activeChat} onChatSelect={(chat) => setActiveChat(chat.id)} />

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>

        {/* Chat Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div style={{ width: '100%', maxWidth: '900px', padding: '40px 24px' }}>

            {/* Welcome Screen */}
            {showWelcome && (
              <div style={{ animation: 'fadeIn 0.6s ease-out' }}>
                <div style={{ textAlign: 'center', marginBottom: '48px', marginTop: '40px' }}>
                  <h1 style={{
                    fontSize: '42px',
                    fontWeight: '500',
                    color: '#1F2937',
                    marginBottom: '12px',
                    letterSpacing: '-0.02em'
                  }}>
                    Good Afternoon, Data Analyst
                  </h1>
                  <p style={{
                    fontSize: '24px',
                    color: '#9CA3AF',
                    fontWeight: '400'
                  }}>
                    Ready to start analyzing?
                  </p>
                </div>

                {/* Quick Actions - Horizontal and Small */}
                <div style={{
                  display: 'flex',
                  gap: '14px',
                  marginBottom: '38px',
                  justifyContent: 'center',
                  flexWrap: 'wrap'
                }}>
                  {quickActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickAction(action)}
                      style={{
                        padding: '10px 18px',
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '90px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        minWidth: '160px',
                        maxWidth: '220px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        fontSize: '15px',
                        transition: 'all 0.25s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)';
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '999px',
                        background: action.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <action.icon size={18} color="white" strokeWidth={2} />
                      </div>
                      <div>
                        <div style={{
                          fontWeight: '600',
                          color: '#111827',
                          fontSize: '15px',
                          marginBottom: '3px'
                        }}>
                          {action.label}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#6B7280'
                        }}>
                          {action.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Playbooks */}
                <div style={{ textAlign: 'center' }}>
                  <p style={{
                    fontSize: '14px',
                    color: '#6B7280',
                    marginBottom: '20px'
                  }}>
                    or get started quickly with one of our Playbooks
                  </p>

                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    flexWrap: 'wrap',
                    justifyContent: 'center'
                  }}>
                    {playbooks.map((playbook, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePlaybook(playbook)}
                        style={{
                          padding: '10px 18px',
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          fontWeight: '500',
                          color: '#374151',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F9FAFB';
                          e.currentTarget.style.borderColor = playbook.color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.borderColor = '#E5E7EB';
                        }}
                      >
                        <playbook.icon size={16} strokeWidth={2} color={playbook.color} />
                        {playbook.text}
                      </button>
                    ))}

                    <button
                      style={{
                        padding: '10px 18px',
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#3B82F6',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EFF6FF'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      See all
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {messages.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                {messages.map((msg, idx) => (
                  <div key={idx} style={{ marginBottom: '24px', animation: 'slideUp 0.4s ease-out' }}>

                    {msg.role === 'user' ? (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginBottom: '16px'
                      }}>
                        <div style={{
                          maxWidth: '70%',
                          padding: '12px 16px',
                          backgroundColor: '#F3F4F6',
                          color: '#1F2937',
                          borderRadius: '12px',
                          fontSize: '14px',
                          lineHeight: '1.6'
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{
                          padding: '16px',
                          backgroundColor: '#F9FAFB',
                          borderRadius: '12px',
                          border: '1px solid #E5E7EB',
                          marginBottom: '12px'
                        }}>
                          <div style={{
                            fontSize: '14px',
                            lineHeight: '1.7',
                            color: '#1F2937',
                            whiteSpace: 'pre-wrap',
                            marginBottom: msg.hasCode ? '16px' : '0'
                          }}>
                            {msg.content}
                          </div>

                          {msg.hasCode && msg.code && (
                            <div style={{
                              backgroundColor: 'white',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                padding: '8px 12px',
                                backgroundColor: '#F3F4F6',
                                borderBottom: '1px solid #E5E7EB',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  fontSize: '13px',
                                  color: '#6B7280'
                                }}>
                                  <div style={{
                                    width: '20px',
                                    height: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    🐍
                                  </div>
                                  Python
                                </div>
                                <button style={{
                                  padding: '4px 8px',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '12px',
                                  color: '#6B7280'
                                }}>
                                  <Copy size={14} />
                                </button>
                              </div>
                              <pre style={{
                                padding: '12px',
                                margin: 0,
                                fontSize: '13px',
                                lineHeight: '1.5',
                                color: '#1F2937',
                                overflow: 'auto'
                              }}>
                                <code>{msg.code}</code>
                              </pre>
                            </div>
                          )}
                        </div>

                        {/* Action suggestions */}
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap'
                        }}>
                          <button style={{
                            padding: '8px 14px',
                            backgroundColor: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#6B7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                          }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#F9FAFB';
                              e.currentTarget.style.borderColor = '#3B82F6';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'white';
                              e.currentTarget.style.borderColor = '#E5E7EB';
                            }}>
                            <Sparkles size={14} />
                            List all column names
                          </button>
                          <button style={{
                            padding: '8px 14px',
                            backgroundColor: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#6B7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                          }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#F9FAFB';
                              e.currentTarget.style.borderColor = '#3B82F6';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'white';
                              e.currentTarget.style.borderColor = '#E5E7EB';
                            }}>
                            <Sparkles size={14} />
                            Describe each column's data type
                          </button>
                          <button style={{
                            padding: '8px 14px',
                            backgroundColor: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#6B7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                          }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#F9FAFB';
                              e.currentTarget.style.borderColor = '#3B82F6';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'white';
                              e.currentTarget.style.borderColor = '#E5E7EB';
                            }}>
                            <Sparkles size={14} />
                            Provide sample data from each column
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    animation: 'slideUp 0.4s ease-out'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      color: '#6B7280',
                      fontSize: '14px'
                    }}>
                      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      Analyzing your data...
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Bar */}
        <div style={{
          borderTop: '1px solid #E5E7EB',
          backgroundColor: 'white',
          padding: '16px 24px'
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="How can we help you today?"
                  rows={1}
                  style={{
                    width: '100%',
                    padding: '12px 50px 12px 14px',
                    fontSize: '14px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '10px',
                    resize: 'none',
                    outline: 'none',
                    lineHeight: '1.5',
                    minHeight: '44px',
                    maxHeight: '120px',
                    backgroundColor: 'white'
                  }}
                />

                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    bottom: '6px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: input.trim() && !isLoading
                      ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                      : '#E5E7EB',
                    border: 'none',
                    cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <ArrowUp size={18} color="white" />
                </button>
              </div>
            </div>

            {/* Unlimited usage button REMOVED! */}
          </div>
        </div>
      </div>



      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
