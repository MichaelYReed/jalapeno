import { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Plus, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { useCart } from '../../context/CartContext';
import VoiceInput from './VoiceInput';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);
  const { addItem } = useCart();

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

  const handleSend = async (messageText = input) => {
    if (!messageText.trim() || loading) return;

    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await api.chat(messageText, conversationHistory);

      const assistantMessage = {
        role: 'assistant',
        content: response.message,
        suggestions: response.suggestions,
        needsClarification: response.needs_clarification
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I had trouble processing that request. Please make sure the backend server is running and you have a valid OpenAI API key configured."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceResult = async (transcribedText, response) => {
    // Add the transcribed message
    setMessages(prev => [...prev, {
      role: 'user',
      content: transcribedText,
      isVoice: true
    }]);

    // Add the AI response
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: response.message,
      suggestions: response.suggestions,
      needsClarification: response.needs_clarification
    }]);
  };

  const handleAddToCart = (suggestion) => {
    addItem(suggestion.product, suggestion.suggested_quantity);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Chat Header */}
        <div className="bg-primary-500 text-white p-4">
          <h2 className="font-semibold text-lg">AI Ordering Assistant</h2>
          <p className="text-sm text-primary-100">
            Describe what you need in natural language
          </p>
        </div>

        {/* Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`chat-message flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {message.isVoice && (
                  <div className="flex items-center gap-1 text-xs opacity-75 mb-1">
                    <Mic className="w-3 h-3" /> Voice
                  </div>
                )}
                <p className="whitespace-pre-wrap">{message.content}</p>

                {/* Product Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.suggestions.map((suggestion, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-lg p-3 border border-gray-200 flex items-center gap-3"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">
                            {suggestion.product.name}
                          </p>
                          <p className="text-xs text-gray-500">
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
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-gray-600">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestions */}
        {messages.length <= 1 && suggestions.length > 0 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-gray-500 mb-2">Try saying:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 3).map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(suggestion)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-2">
            <VoiceInput onResult={handleVoiceResult} disabled={loading} />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your order or question..."
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none disabled:bg-gray-50"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
