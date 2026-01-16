import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Plus, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import VoiceInput from './VoiceInput';
import type { Product, ChatSuggestion, ChatMessage } from '../../types';

interface CartAddItem {
  product: Product;
  quantity: number;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();
  const toast = useToast();

  useEffect(() => {
    // Load initial suggestions
    loadSuggestions();
    // Add welcome message
    setMessages([{
      role: 'assistant',
      content: "Hi! I'm your AI food ordering assistant. Tell me what you need and I'll help you find products. You can say things like \"I need 5 pounds of chicken breast\" or \"What dairy products do you have?\""
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSuggestions = async () => {
    try {
      const data = await api.getChatSuggestions();
      setSuggestions(data.suggestions);
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    }
  };

  const handleSend = async (messageText: string = input, isVoice: boolean = false) => {
    if (!messageText.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: messageText, isVoice };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Create a unique ID for this assistant message
    const assistantMessageId = Date.now();

    // Add placeholder for streaming assistant message
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      suggestions: [],
      isStreaming: true
    }]);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      await api.chatStream(
        messageText,
        conversationHistory,
        // onChunk - append text as it streams
        (text: string) => {
          setMessages(prev => prev.map(m =>
            m.id === assistantMessageId
              ? { ...m, content: m.content + text }
              : m
          ));
        },
        // onSuggestions - add product cards
        (newSuggestions: ChatSuggestion[]) => {
          setMessages(prev => prev.map(m =>
            m.id === assistantMessageId
              ? { ...m, suggestions: newSuggestions }
              : m
          ));
        },
        // onCartAdd - add items directly to cart
        (items: CartAddItem[]) => {
          items.forEach(item => {
            addItem(item.product, item.quantity);
          });
          toast.success(`Added ${items.length} item${items.length !== 1 ? 's' : ''} to cart`);
        },
        // onDone - mark streaming complete
        () => {
          setMessages(prev => prev.map(m =>
            m.id === assistantMessageId
              ? { ...m, isStreaming: false }
              : m
          ));
          setLoading(false);
        },
        // onError
        (error: Error) => {
          console.error('Stream error:', error);
          setMessages(prev => prev.map(m =>
            m.id === assistantMessageId
              ? { ...m, content: m.content || "I'm sorry, I had trouble processing that request.", isStreaming: false }
              : m
          ));
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => prev.map(m =>
        m.id === assistantMessageId
          ? { ...m, content: "I'm sorry, I had trouble processing that request. Please make sure the backend server is running and you have a valid OpenAI API key configured.", isStreaming: false }
          : m
      ));
      setLoading(false);
    }
  };

  const handleVoiceTranscribed = (transcribedText: string) => {
    // Send voice message through the same streaming flow as typed messages
    handleSend(transcribedText, true);
  };

  const handleAddToCart = (suggestion: ChatSuggestion) => {
    addItem(suggestion.product, suggestion.suggested_quantity);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm dark:shadow-slate-800/50 border border-gray-200 dark:border-slate-700 overflow-hidden">
        {/* Chat Header */}
        <div className="bg-primary-500 dark:bg-primary-600 text-white p-4">
          <h2 className="font-semibold text-lg">AI Ordering Assistant</h2>
          <p className="text-sm text-primary-100 dark:text-primary-200">
            Describe what you need in natural language
          </p>
        </div>

        {/* Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200'
                  }`}
                >
                {message.isVoice && (
                  <div className="flex items-center gap-1 text-xs opacity-75 mb-1">
                    <Mic className="w-3 h-3" /> Voice
                  </div>
                )}
                <p className="whitespace-pre-wrap">
                  {message.content}
                  {message.isStreaming && <span className="streaming-cursor">|</span>}
                </p>

                {/* Product Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.suggestions.map((suggestion, i) => (
                      <div
                        key={i}
                        className="bg-white dark:bg-slate-700 rounded-lg p-3 border border-gray-200 dark:border-slate-600 flex items-center gap-3"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {suggestion.product.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ${suggestion.product.price.toFixed(2)} / {suggestion.product.unit}
                            {' • '}
                            Qty: {suggestion.suggested_quantity}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddToCart(suggestion)}
                          className="bg-primary-500 hover:bg-primary-600 text-white p-2 rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          </AnimatePresence>

          <AnimatePresence>
            {loading && !messages.some(m => m.isStreaming) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="bg-gray-100 dark:bg-slate-800 rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin dark:text-gray-200" />
                  <span className="text-gray-600 dark:text-gray-400">Connecting...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestions */}
        {messages.length <= 1 && suggestions.length > 0 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Try saying:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 3).map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(suggestion)}
                  className="text-xs bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 dark:text-gray-200 px-3 py-1.5 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t dark:border-slate-700">
          <div className="flex items-center gap-2">
            <VoiceInput
              onTranscribed={handleVoiceTranscribed}
              disabled={loading}
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your order or question..."
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-400 outline-none disabled:bg-gray-50 dark:disabled:bg-slate-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white p-2 rounded-lg transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
