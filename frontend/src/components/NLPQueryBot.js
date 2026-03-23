import React, { useState, useRef, useEffect } from 'react';
import {
  MdSend, MdAutoAwesome, MdPerson, MdLightbulb,
  MdDelete, MdContentCopy, MdExpandMore, MdExpandLess
} from 'react-icons/md';
import API from '../utils/api';
import toast from 'react-hot-toast';

// ── Format bold text (**text**) ───────────────────────────────────────────────
function FormattedText({ text }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <span>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

// ── Single message bubble ─────────────────────────────────────────────────────
function Message({ msg, onCopy }) {
  const isBot = msg.role === 'bot';
  const lines = (msg.text || '').split('\n');

  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      justifyContent: isBot ? 'flex-start' : 'flex-end',
      marginBottom: 16, animation: 'fadeIn 0.2s ease'
    }}>
      {/* Bot avatar */}
      {isBot && (
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(59,130,246,0.3)'
        }}>
          <MdAutoAwesome style={{ color: 'white', fontSize: 17 }} />
        </div>
      )}

      {/* Message bubble */}
      <div style={{ maxWidth: '78%' }}>
        <div style={{
          padding: '12px 16px',
          borderRadius: isBot ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
          background: isBot ? 'var(--bg-secondary)' : 'linear-gradient(135deg,#3b82f6,#6366f1)',
          color: isBot ? 'var(--text-primary)' : 'white',
          fontSize: 13.5, lineHeight: 1.75,
          border: isBot ? '1px solid var(--border)' : 'none',
          boxShadow: isBot ? 'none' : '0 4px 12px rgba(59,130,246,0.3)',
        }}>
          {msg.loading ? (
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 0' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#3b82f6',
                  animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite`
                }} />
              ))}
            </div>
          ) : (
            lines.map((line, i) => (
              <div key={i} style={{ minHeight: line === '' ? 8 : 'auto' }}>
                {line === '' ? null : <FormattedText text={line} />}
              </div>
            ))
          )}
        </div>

        {/* Copy button for bot messages */}
        {isBot && !msg.loading && (
          <button onClick={() => onCopy(msg.text)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 11, marginTop: 4,
            display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px',
            opacity: 0.6, transition: 'opacity 0.2s'
          }}
            onMouseOver={e => e.currentTarget.style.opacity = 1}
            onMouseOut={e => e.currentTarget.style.opacity = 0.6}
          >
            <MdContentCopy style={{ fontSize: 12 }} /> Copy
          </button>
        )}
      </div>

      {/* User avatar */}
      {!isBot && (
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: 'var(--bg-hover)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <MdPerson style={{ color: 'var(--text-secondary)', fontSize: 18 }} />
        </div>
      )}
    </div>
  );
}

// ── Quick action chips ────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: '📊 Aaj ki attendance', query: "Aaj ki attendance kaisi hai?" },
  { label: '⚠️ Low attendance', query: "Students below 75%" },
  { label: '🔴 Absent students', query: "Who was absent today?" },
  { label: '⏰ Late students', query: "Who came late today?" },
  { label: '🏆 Best students', query: "Best attendance students" },
  { label: '📆 Month report', query: "This month ka report" },
  { label: '🔍 Anomalies', query: "Check anomalies" },
  { label: '👥 Total students', query: "Total students kitne hain?" },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function NLPQueryBot() {
  const [messages,       setMessages]       = useState([
    {
      role: 'bot',
      text: "👋 **Namaste!** Main hoon aapka **Attendance AI Assistant** 🤖\n\nMujhse poochho kuch bhi — Hindi, English ya Hinglish mein!\n\nKuch examples:\n• \"Aaj ki attendance kaisi hai?\"\n• \"Is Rahul present?\"\n• \"Students below 75%\"\n• \"This month ka report\"\n\nType **\"help\"** for all commands! 😊"
    }
  ]);
  const [input,          setInput]          = useState('');
  const [sending,        setSending]        = useState(false);
  const [suggestions,    setSuggestions]    = useState([]);
  const [showSuggestions,setShowSuggestions]= useState(false);
  const [showQuickActions,setShowQuickActions] = useState(true);
  const bottomRef  = useRef();
  const inputRef   = useRef();

  useEffect(() => {
    API.get('/nlp/suggestions').then(r => setSuggestions(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const query = (text || input).trim();
    if (!query) return;
    setInput('');
    setShowQuickActions(false);
    setMessages(prev => [...prev, { role: 'user', text: query }]);
    setSending(true);

    const loadingId = Date.now();
    setMessages(prev => [...prev, { role: 'bot', text: '', loading: true, id: loadingId }]);

    try {
      const { data } = await API.post('/nlp/query', { query });
      setMessages(prev => prev.map(m =>
        m.id === loadingId ? { role: 'bot', text: data.text } : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === loadingId
          ? { role: 'bot', text: '❌ Kuch galat hua. Backend chal raha hai?\n\nTerminal mein check karo ya page reload karo.' }
          : m
      ));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'bot',
      text: "Chat clear ho gaya! 🗑️\n\nNaya sawaal poochho ya **\"help\"** type karo."
    }]);
    setShowQuickActions(true);
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied!')).catch(() => {});
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Filter suggestions based on input
  const filteredSuggestions = input.length >= 2
    ? suggestions.filter(s => s.toLowerCase().includes(input.toLowerCase()))
    : [];

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', height: '72vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>🤖</span> Advanced NLP Query Bot
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            Hindi + English + Hinglish mein poochho — 15+ attendance queries support
          </p>
        </div>
        <button onClick={clearChat} className="btn btn-ghost"
          style={{ padding: '6px 12px', fontSize: 12, gap: 6 }}>
          <MdDelete style={{ fontSize: 16 }} /> Clear Chat
        </button>
      </div>

      {/* Chat area */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '16px 12px',
        background: 'var(--bg-secondary)', borderRadius: 14,
        border: '1px solid var(--border)', marginBottom: 12
      }}>
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} onCopy={copyText} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick Actions */}
      {showQuickActions && (
        <div style={{ marginBottom: 10 }}>
          <button onClick={() => setShowQuickActions(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
              marginBottom: 8, fontFamily: 'Sora,sans-serif'
            }}>
            <MdExpandLess /> Quick Actions
          </button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {QUICK_ACTIONS.map((a, i) => (
              <button key={i} onClick={() => sendMessage(a.query)} style={{
                padding: '6px 12px', borderRadius: 20,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)', color: 'var(--text-secondary)',
                cursor: 'pointer', fontFamily: 'Sora,sans-serif',
                fontSize: 12, transition: 'all 0.15s',
                whiteSpace: 'nowrap'
              }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!showQuickActions && (
        <button onClick={() => setShowQuickActions(true)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
          marginBottom: 8, fontFamily: 'Sora,sans-serif'
        }}>
          <MdExpandMore /> Show Quick Actions
        </button>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 10, marginBottom: 8, overflow: 'hidden'
        }}>
          {filteredSuggestions.slice(0,5).map((s, i) => (
            <button key={i} onClick={() => { sendMessage(s); setShowSuggestions(false); }} style={{
              display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left',
              background: 'none', border: 'none', borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13,
              fontFamily: 'Sora,sans-serif', transition: 'background 0.15s'
            }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseOut={e => e.currentTarget.style.background = 'none'}
            >
              <MdLightbulb style={{ color: '#f59e0b', fontSize: 14, marginRight: 8, verticalAlign: 'middle' }} />
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            ref={inputRef}
            className="input"
            rows={2}
            placeholder="Kuch bhi poochho... 'Aaj kaun absent tha?' ya 'Students below 75%'"
            value={input}
            onChange={e => { setInput(e.target.value); setShowSuggestions(e.target.value.length >= 2); }}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            style={{ width: '100%', resize: 'none', lineHeight: 1.6, paddingRight: 12, fontSize: 13 }}
          />
        </div>
        <button
          onClick={() => sendMessage()}
          disabled={sending || !input.trim()}
          className="btn btn-primary"
          style={{ padding: '12px 18px', alignSelf: 'flex-end', flexShrink: 0 }}
        >
          {sending
            ? <span className="spinner" style={{ width: 16, height: 16 }} />
            : <MdSend style={{ fontSize: 18 }} />
          }
        </button>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
        Enter to send • Shift+Enter for new line • Type "help" for all commands
      </p>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}